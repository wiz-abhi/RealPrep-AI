/**
 * Code execution via the public Piston API (https://github.com/engineering-online/piston).
 * Free, no API key. Runs untrusted code in Piston's own sandbox — we never
 * execute candidate code on our own box.
 *
 * If Piston is unreachable or times out, callers fall back to pure LLM review.
 */

const PISTON_URL = process.env.PISTON_URL || 'https://emkc.org/api/v2/piston/execute';

// Map our editor language ids → Piston runtime language ids.
const LANGUAGE_MAP: Record<string, string> = {
    javascript: 'javascript',
    js: 'javascript',
    typescript: 'typescript',
    ts: 'typescript',
    python: 'python',
    py: 'python',
    java: 'java',
    cpp: 'c++',
    'c++': 'c++',
    c: 'c',
    go: 'go',
    rust: 'rust',
};

// Piston filename per language (matters for Java's public class + compiled langs).
const FILE_NAME: Record<string, string> = {
    javascript: 'main.js',
    typescript: 'main.ts',
    python: 'main.py',
    'c++': 'main.cpp',
    c: 'main.c',
    java: 'Main.java',
    go: 'main.go',
    rust: 'main.rs',
};

export type ExecutionResult = {
    ran: boolean;             // did we successfully reach Piston and run?
    language?: string;
    stdout?: string;
    stderr?: string;
    exitCode?: number | null;
    compileError?: string;
    timedOut?: boolean;
    error?: string;          // our-side error (network, unsupported lang)
};

export const isRunnable = (language: string): boolean => {
    return !!LANGUAGE_MAP[String(language || '').toLowerCase()];
};

export async function runCode(
    code: string,
    language: string,
    stdin = ''
): Promise<ExecutionResult> {
    const langKey = String(language || '').toLowerCase();
    const pistonLang = LANGUAGE_MAP[langKey];
    if (!pistonLang) {
        return { ran: false, error: `Unsupported language: ${language}` };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
        const res = await fetch(PISTON_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                language: pistonLang,
                version: '*', // latest available runtime
                files: [{ name: FILE_NAME[pistonLang] || 'main.txt', content: code }],
                stdin,
                compile_timeout: 10000,
                run_timeout: 8000,
            }),
            signal: controller.signal,
        });

        if (!res.ok) {
            const txt = await res.text().catch(() => '');
            return { ran: false, error: `Piston ${res.status}: ${txt.slice(0, 200)}` };
        }

        const data: any = await res.json();
        const run = data?.run || {};
        const compile = data?.compile || null;

        // Truncate outputs so a runaway print loop can't blow up the LLM prompt.
        const cap = (s: unknown) => (typeof s === 'string' ? s.slice(0, 4000) : '');

        return {
            ran: true,
            language: data?.language || pistonLang,
            stdout: cap(run.stdout),
            stderr: cap(run.stderr),
            exitCode: typeof run.code === 'number' ? run.code : null,
            compileError: compile && compile.code !== 0 ? cap(compile.stderr || compile.output) : undefined,
        };
    } catch (err: any) {
        if (err?.name === 'AbortError') {
            return { ran: false, timedOut: true, error: 'Execution timed out' };
        }
        return { ran: false, error: err?.message || 'Execution failed' };
    } finally {
        clearTimeout(timeout);
    }
}

// Compact human/LLM-readable summary of an execution result.
export function formatExecutionForPrompt(result: ExecutionResult): string {
    if (!result.ran) {
        return `\n\n[CODE EXECUTION]: Could not run the code (${result.error || 'unknown reason'}). Evaluate it by reading only.`;
    }
    const parts: string[] = ['\n\n[CODE EXECUTION RESULTS]:'];
    if (result.compileError) {
        parts.push(`Compilation FAILED:\n${result.compileError}`);
    } else {
        parts.push(`Exit code: ${result.exitCode}`);
        parts.push(`STDOUT:\n${result.stdout || '(empty)'}`);
        if (result.stderr && result.stderr.trim()) {
            parts.push(`STDERR:\n${result.stderr}`);
        }
    }
    return parts.join('\n');
}
