import dotenv from 'dotenv';
dotenv.config();

const SARVAM_CHAT_URL = 'https://api.sarvam.ai/v1/chat/completions';
const DEFAULT_CHAT_MODEL = process.env.SARVAM_CHAT_MODEL || 'sarvam-30b';
const DEFAULT_REPORT_MODEL = process.env.SARVAM_REPORT_MODEL || 'sarvam-105b';
// Sarvam caps max_tokens per subscription tier (starter = 4096). Keep under it;
// override via SARVAM_MAX_TOKENS if you upgrade to a higher tier.
const MAX_TOKENS = Math.min(Number(process.env.SARVAM_MAX_TOKENS) || 4000, 4096);

type Role = 'system' | 'user' | 'assistant';
type Message = { role: Role; content: string };

export type HistoryEntry = { role: string; parts: string };

type CallOpts = {
    model?: string;
    temperature?: number;
    maxRetries?: number;
    maxTokens?: number;
    // Sarvam models "think" by default (reasoning_effort: 'medium'), which can
    // leave message.content empty (all output goes to reasoning_content) and
    // starve the token budget. We disable it for JSON/report tasks.
    reasoningEffort?: 'low' | 'medium' | 'high' | null;
};

// Pull usable text from a Sarvam message: prefer content, fall back to
// reasoning_content if content came back empty (defensive against thinking mode).
const messageText = (msg: any): string => {
    const content = typeof msg?.content === 'string' ? msg.content : '';
    if (content.trim()) return content;
    const reasoning = typeof msg?.reasoning_content === 'string' ? msg.reasoning_content : '';
    // Never surface raw chain-of-thought to the candidate.
    return reasoning.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
};

async function callSarvamChat(messages: Message[], opts: CallOpts = {}): Promise<string> {
    const apiKey = process.env.SARVAM_API_KEY;
    if (!apiKey) {
        throw new Error('SARVAM_API_KEY is not set');
    }

    const model = opts.model || DEFAULT_CHAT_MODEL;
    const maxRetries = opts.maxRetries ?? 3;
    let delay = 2000;
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const res = await fetch(SARVAM_CHAT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model,
                    messages,
                    temperature: opts.temperature ?? 0.7,
                    max_tokens: Math.min(opts.maxTokens ?? MAX_TOKENS, MAX_TOKENS),
                    reasoning_effort: opts.reasoningEffort ?? null, // disabled by default
                    stream: false,
                }),
            });

            if (!res.ok) {
                const errText = await res.text();
                const isRetryable =
                    res.status === 429 || res.status === 502 || res.status === 503 || res.status === 504;
                if (isRetryable && attempt < maxRetries) {
                    console.warn(
                        `Sarvam ${res.status}. Retrying in ${delay}ms... (${maxRetries - attempt} left)`
                    );
                    await new Promise(r => setTimeout(r, delay));
                    delay *= 2;
                    continue;
                }
                // 4xx etc. — retrying an identical bad request just wastes ~14s.
                const err: any = new Error(`Sarvam API ${res.status}: ${errText}`);
                err.nonRetryable = !isRetryable;
                throw err;
            }

            const data: any = await res.json();
            return messageText(data?.choices?.[0]?.message);
        } catch (err: any) {
            if (err?.nonRetryable) throw err;
            lastError = err;
            if (attempt < maxRetries) {
                await new Promise(r => setTimeout(r, delay));
                delay *= 2;
                continue;
            }
        }
    }

    throw lastError;
}

/**
 * Streaming chat completion — yields raw text deltas as Sarvam emits them.
 * Consumer is expected to accumulate + parse them (typically for SSE relay).
 */
async function* streamSarvamChat(
    messages: Message[],
    opts: CallOpts = {},
    signal?: AbortSignal
): AsyncGenerator<string> {
    const apiKey = process.env.SARVAM_API_KEY;
    if (!apiKey) {
        throw new Error('SARVAM_API_KEY is not set');
    }

    const model = opts.model || DEFAULT_CHAT_MODEL;

    const res = await fetch(SARVAM_CHAT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            messages,
            temperature: opts.temperature ?? 0.7,
            max_tokens: Math.min(opts.maxTokens ?? 2048, MAX_TOKENS),
            reasoning_effort: opts.reasoningEffort ?? null, // no "thinking" in spoken replies
            stream: true,
        }),
        signal,
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Sarvam stream ${res.status}: ${errText}`);
    }
    if (!res.body) {
        throw new Error('Sarvam stream: response has no body');
    }

    const reader = (res.body as any).getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            // OpenAI-style SSE: `data: {...}\n\n` chunks, plus final `data: [DONE]`.
            let idx: number;
            while ((idx = buffer.indexOf('\n')) !== -1) {
                const line = buffer.slice(0, idx).trim();
                buffer = buffer.slice(idx + 1);
                if (!line.startsWith('data:')) continue;
                const data = line.slice(5).trim();
                if (!data) continue;
                if (data === '[DONE]') return;
                try {
                    const parsed = JSON.parse(data);
                    const delta: unknown = parsed?.choices?.[0]?.delta?.content;
                    if (typeof delta === 'string' && delta.length > 0) yield delta;
                } catch {
                    // Ignore non-JSON keep-alives / partial lines.
                }
            }
        }
    } finally {
        try {
            reader.cancel();
        } catch {
            /* noop */
        }
    }
}

function historyToMessages(history: HistoryEntry[]): Message[] {
    return history.map(h => ({
        role: h.role === 'model' ? 'assistant' : 'user',
        content: h.parts,
    }));
}

/**
 * SarvamService is a drop-in replacement for the previous GeminiService.
 * Public method shape is intentionally identical so controllers do not need
 * to change (aside from imports and instantiation).
 */
export class SarvamService {
    private modelName: string;

    constructor(modelName?: string) {
        this.modelName = modelName || DEFAULT_CHAT_MODEL;
    }

    async generateInterviewResponse(
        systemInstruction: string,
        history: HistoryEntry[],
        input: string
    ): Promise<string> {
        const messages: Message[] = [
            { role: 'system', content: systemInstruction },
            ...historyToMessages(history),
            { role: 'user', content: input },
        ];
        return callSarvamChat(messages, { model: this.modelName });
    }

    /**
     * Streaming variant of generateInterviewResponse. Yields incremental text
     * chunks so the caller can update the UI (and TTS) in real time.
     */
    async *generateInterviewResponseStream(
        systemInstruction: string,
        history: HistoryEntry[],
        input: string,
        signal?: AbortSignal
    ): AsyncGenerator<string> {
        const messages: Message[] = [
            { role: 'system', content: systemInstruction },
            ...historyToMessages(history),
            { role: 'user', content: input },
        ];
        yield* streamSarvamChat(messages, { model: this.modelName }, signal);
    }

    async generateInitialGreeting(systemInstruction: string, context: string): Promise<string> {
        const prompt = `Based on this candidate context, generate your opening greeting:

${context}

IMPORTANT INSTRUCTIONS:
1. Greet the candidate by their name (from context above)
2. Introduce yourself as the interviewer (use your persona name from system instructions)
3. Ask the candidate to introduce themselves, their areas of expertise, and anything they want you to know about them
4. Keep it warm, professional, and conversational
5. Do NOT use any markdown formatting - this will be spoken aloud

Example structure (adapt to your persona):
"Hi [Name]! I'm [Your Name], and I'll be your interviewer today. Before we dive in, I'd love to hear a bit about you. Could you introduce yourself and tell me about your areas of expertise and anything you think would be helpful for me to know?"`;

        const messages: Message[] = [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: prompt },
        ];
        return callSarvamChat(messages, { model: this.modelName });
    }

    async generateText(prompt: string): Promise<string> {
        const messages: Message[] = [
            { role: 'user', content: prompt },
        ];
        // JSON tasks (skills, plan, report, improvement plan): reasoning off,
        // generous token budget so large report JSON isn't truncated.
        const text = await callSarvamChat(messages, {
            model: this.modelName,
            temperature: 0.3,
            maxTokens: MAX_TOKENS,
            reasoningEffort: null,
        });
        return text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    }
}

/**
 * Best-effort extraction of a JSON object from LLM output: strips <think>
 * reasoning blocks and returns the substring between the first '{' and the
 * last '}'. Sarvam models sometimes wrap JSON in prose or reasoning.
 */
export const extractJsonObject = (text: string): string => {
    const cleaned = String(text || '')
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) return cleaned.slice(start, end + 1);
    return cleaned;
};

// Shared instances — cheap and reused across requests.
export const sarvam = new SarvamService(DEFAULT_CHAT_MODEL);
export const sarvamReport = new SarvamService(DEFAULT_REPORT_MODEL);
