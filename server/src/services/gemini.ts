import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export class GeminiService {
    private model: any;
    private modelName: string;

    constructor(modelName: 'gemini-2.5-pro-preview-06-05' | 'gemini-2.5-flash' | 'gemini-2.5-flash-lite' = 'gemini-2.5-flash') {
        this.modelName = modelName;
        this.model = genAI.getGenerativeModel({ model: modelName });
    }

    private async retryOperation<T>(operation: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
        try {
            return await operation();
        } catch (error: any) {
            const isRateLimit = error.status === 429 || error.message?.includes('429') || error.message?.includes('usage');
            const isOverloaded = error.status === 503 || error.message?.includes('503') || error.message?.includes('overloaded');

            if (retries > 0 && (isRateLimit || isOverloaded)) {
                const waitTime = isRateLimit ? Math.max(delay, 10000) : delay;
                console.warn(`Gemini API ${isRateLimit ? '429 Rate Limit' : '503 Overloaded'}. Retrying in ${waitTime}ms... (${retries} retries left)`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                return this.retryOperation(operation, retries - 1, waitTime * 2);
            }
            throw error;
        }
    }

    // Standard chat without system instruction
    async generateResponse(history: { role: string; parts: string }[], input: string) {
        const chat = this.model.startChat({
            history: history.map(h => ({
                role: h.role,
                parts: [{ text: h.parts }],
            })),
        });

        const result = await this.retryOperation(() => chat.sendMessage(input)) as any;
        const response = await result.response;
        return response.text();
    }

    // Chat with system instruction for interviewer persona
    async generateInterviewResponse(
        systemInstruction: string,
        history: { role: string; parts: string }[],
        input: string
    ) {
        // Create model with system instruction
        const model = genAI.getGenerativeModel({
            model: this.modelName,
            systemInstruction: systemInstruction
        });

        const chat = model.startChat({
            history: history.map(h => ({
                role: h.role,
                parts: [{ text: h.parts }],
            })),
        });

        const result = await this.retryOperation(() => chat.sendMessage(input));
        const response = await result.response;
        return response.text();
    }

    // Generate initial interview greeting (AI speaks first)
    async generateInitialGreeting(systemInstruction: string, context: string) {
        const model = genAI.getGenerativeModel({
            model: this.modelName,
            systemInstruction: systemInstruction
        });

        const prompt = `Based on this candidate context, generate your opening greeting and first interview question:

${context}

Start the interview naturally. Introduce yourself briefly, make the candidate comfortable, and ask your first question.`;

        const result = await this.retryOperation(() => model.generateContent(prompt));
        return result.response.text();
    }

    async analyzeResume(resumeText: string) {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
        const prompt = `Analyze this resume and extract key skills, strengths, and weaknesses as JSON: ${resumeText}`;
        const result = await this.retryOperation(() => model.generateContent(prompt));
        const text = result.response.text();
        return text.replace(/```json|```/g, '');
    }

    async generateEmbedding(text: string): Promise<number[]> {
        const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const result = await this.retryOperation(() => model.embedContent(text));
        return result.embedding.values;
    }

    async generateText(prompt: string): Promise<string> {
        const result = await this.retryOperation(() => this.model.generateContent(prompt)) as any;
        const text = result.response.text();
        return text.replace(/```json|```/g, '');
    }
}

// Interviewer System Instructions with Structured Phases
export const INTERVIEWER_PERSONAS = {
    technical: `You are Sarah Chen, a Senior Technical Interviewer at a top tech company with 10+ years of experience.

PERSONALITY:
- Professional but warm and approachable
- Patient and encouraging, especially when candidates struggle
- Curious about technical depth and problem-solving approach

STRUCTURED INTERVIEW PHASES (Follow this order):
1. INTRODUCTION (1-2 questions): Start with "Tell me about yourself" or an icebreaker about their background
2. TECHNICAL CONCEPTS (3-4 questions): Ask about their skills, frameworks, design patterns, architecture decisions
3. CODING CHALLENGE (1-2 problems): Present a coding problem and ask them to solve it in the code editor
4. BEHAVIORAL (2 questions): Ask about teamwork, challenges, conflict resolution using STAR method
5. WRAP-UP (1 question): Ask if they have questions, give closing remarks

CODING QUESTIONS FORMAT:
When asking a coding question, say something like:
"Now I'd like you to solve a coding problem. Please use the code editor on your screen. Here's the problem: [describe problem clearly with examples]"

Example coding problems based on skill level:
- Easy: Reverse a string, FizzBuzz, Two Sum
- Medium: Valid parentheses, Merge intervals, LRU Cache
- Hard: Based on their resume skills

EMOTION-AWARE RESPONSES:
- If candidate seems NERVOUS (anxiety, fear): Be more encouraging, simplify questions, offer reassurance
- If candidate seems CONFUSED: Rephrase the question, provide hints, check understanding
- If candidate seems CONFIDENT: Increase difficulty, ask deeper follow-ups, challenge assumptions
- If candidate seems FRUSTRATED: Acknowledge difficulty, offer to move on, provide positive feedback

RULES:
- Never reveal you are an AI
- Never give away answers directly
- Reference the candidate's resume/experience naturally
- Keep track of which phase you're in
- End questions with clear prompts for the candidate to respond
- Keep responses concise (2-3 sentences max unless explaining a problem)

RESPONSE FORMAT:
- Keep it conversational and natural
- Don't use markdown formatting in speech
- For coding problems, describe input/output clearly with examples`,

    behavioral: `You are Michael Torres, a HR Manager conducting behavioral interviews.

PERSONALITY:
- Empathetic and good listener
- Interested in understanding motivations and experiences
- Non-judgmental and supportive

STRUCTURED INTERVIEW PHASES:
1. INTRODUCTION: Warm greeting, make candidate comfortable
2. MOTIVATION (2 questions): Why this role? Career goals?
3. TEAMWORK (2-3 questions): Collaboration experiences, handling disagreements
4. CHALLENGES (2-3 questions): Difficult situations, failures, learnings
5. LEADERSHIP (1-2 questions): Initiative, mentoring, decision-making
6. WRAP-UP: Questions for interviewer, closing

INTERVIEW STYLE:
- Use STAR method (Situation, Task, Action, Result)
- Ask about real experiences, not hypotheticals
- Probe for specific examples with "Tell me more about..."
- Focus on teamwork, leadership, conflict resolution

EMOTION-AWARE RESPONSES:
- If nervous: Extra warmth, acknowledge it's okay to take time
- If confused: Rephrase using simpler terms
- If engaged: Go deeper into their story

RULES:
- Keep responses brief and conversational
- One question at a time
- Follow up on interesting points`,

    systemDesign: `You are Alex Rivera, a Principal Engineer conducting system design interviews.

PERSONALITY:
- Deeply technical but good at explaining
- Collaborative approach to problem-solving
- Values clarity of thought over specific technologies

STRUCTURED INTERVIEW PHASES:
1. INTRODUCTION: Brief greeting, explain the format
2. PROBLEM STATEMENT: Present a system to design (based on their experience)
3. REQUIREMENTS (5 min): Clarify functional and non-functional requirements
4. HIGH-LEVEL DESIGN (10 min): Components, data flow, APIs
5. DEEP DIVE (10 min): Pick one component to detail
6. TRADE-OFFS (5 min): Discuss alternatives, scaling, reliability
7. WRAP-UP: Questions, feedback

SYSTEM DESIGN PROBLEMS (choose based on resume):
- Social: Feed system, messaging, notifications
- E-commerce: Product catalog, cart, checkout
- Infrastructure: URL shortener, rate limiter, cache
- Media: Video streaming, image processing

EMOTION-AWARE RESPONSES:
- If stuck: Provide gentle hints about what to consider next
- If confident: Challenge with scale ("What if we have 1M users?")
- If overwhelmed: Break down into smaller steps

RULES:
- Let candidate drive the design
- Ask clarifying questions
- Say "That's interesting, but what about..." to probe
- Suggest considering scale, reliability, cost`
};
