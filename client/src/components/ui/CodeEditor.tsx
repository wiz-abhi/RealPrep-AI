import React, { useState, useEffect } from 'react';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-cpp';
import 'prismjs/themes/prism-tomorrow.css';

export interface ExecutionResult {
    ran: boolean;
    stdout?: string;
    stderr?: string;
    compileError?: string;
    exitCode?: number | null;
    timedOut?: boolean;
    error?: string;
}

interface CodeEditorProps {
    language?: string;
    onCodeChange?: (code: string) => void;
    onSubmit?: (code: string, language: string) => Promise<void>;
    isSubmitting?: boolean;
    initialCode?: string;
    executionResult?: ExecutionResult | null;
}

const LANGUAGE_MAP: Record<string, string> = {
    'javascript': 'javascript',
    'python': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c++': 'cpp',
};

const BOILERPLATE: Record<string, string> = {
    javascript: `// Solution

function solution(input) {
    // Write your code here
    
    return;
}

// Test
// console.log(solution());
`,
    python: `# Solution

def solution(input):
    # Write your code here
    
    return

# Test
# print(solution())
`,
    java: `import java.util.*;

public class Solution {
    public static int solution(int[] input) {
        // Write your code here
        
        return 0;
    }

    public static void main(String[] args) {
        // Test your solution
        
    }
}
`,
    cpp: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int solution(vector<int>& input) {
    // Write your code here
    
    return 0;
}

int main() {
    // Test your solution
    
    return 0;
}
`,
};

export const CodeEditor: React.FC<CodeEditorProps> = ({
    language: initialLanguage = 'javascript',
    onCodeChange,
    onSubmit,
    isSubmitting = false,
    initialCode,
    executionResult
}) => {
    const [code, setCode] = useState(initialCode || BOILERPLATE[initialLanguage] || BOILERPLATE.javascript);
    const [language, setLanguage] = useState(initialLanguage);
    const [editorReady, setEditorReady] = useState(false);

    // Simulate editor initialisation (Prism loading, etc.)
    useEffect(() => {
        const timer = setTimeout(() => setEditorReady(true), 400);
        return () => clearTimeout(timer);
    }, []);

    const handleChange = (newCode: string) => {
        setCode(newCode);
        if (onCodeChange) onCodeChange(newCode);
    };

    const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newLang = e.target.value;
        setLanguage(newLang);
        // Reset to the new language's boilerplate
        const newBoilerplate = BOILERPLATE[newLang] || BOILERPLATE.javascript;
        setCode(newBoilerplate);
        if (onCodeChange) onCodeChange(newBoilerplate);
    };

    const handleSubmit = async () => {
        if (onSubmit && code.trim()) {
            await onSubmit(code, language);
        }
    };

    const handleReset = () => {
        const boilerplate = BOILERPLATE[language] || BOILERPLATE.javascript;
        setCode(boilerplate);
        if (onCodeChange) onCodeChange(boilerplate);
    };

    const getHighlighter = (code: string) => {
        const lang = LANGUAGE_MAP[language] || 'javascript';
        try {
            return Prism.highlight(code, Prism.languages[lang] || Prism.languages.javascript, lang);
        } catch {
            return Prism.highlight(code, Prism.languages.javascript, 'javascript');
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#1d1f21] rounded-lg overflow-hidden border border-white/10">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#282a2e] border-b border-white/5">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Language:</span>
                    <select
                        value={language}
                        onChange={handleLanguageChange}
                        className="bg-[#373b41] text-xs text-cyan-400 px-2 py-1 rounded focus:outline-none border border-white/10"
                        disabled={isSubmitting}
                    >
                        <option value="javascript">JavaScript</option>
                        <option value="python">Python</option>
                        <option value="java">Java</option>
                        <option value="cpp">C++</option>
                    </select>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleReset}
                        className="text-gray-400 hover:text-white transition-colors text-sm"
                        title="Reset code"
                        disabled={isSubmitting}
                    >
                        🔄
                    </button>
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 overflow-auto">
                {!editorReady ? (
                    <div className="flex-1 flex items-center justify-center gap-3 h-full min-h-[200px]">
                        <div className="animate-spin h-5 w-5 border-2 border-cyan-400 border-t-transparent rounded-full" />
                        <span className="text-sm text-white/50">Initialising Code Editor...</span>
                    </div>
                ) : (
                    <Editor
                        value={code}
                        onValueChange={handleChange}
                        highlight={getHighlighter}
                        padding={16}
                        disabled={isSubmitting}
                        style={{
                            fontFamily: '"Fira Code", "Fira Mono", monospace',
                            fontSize: 14,
                            minHeight: '100%',
                            backgroundColor: '#1d1f21',
                            color: '#c5c8c6',
                        }}
                        className="code-editor-textarea"
                    />
                )}
            </div>

            {/* Execution Output Panel */}
            {executionResult && (
                <div className="max-h-40 overflow-auto border-t border-white/10 bg-[#161719] px-3 py-2 text-xs font-mono">
                    {!executionResult.ran ? (
                        <div className="text-yellow-400/80">
                            ⚠ {executionResult.timedOut ? 'Execution timed out.' : `Could not run: ${executionResult.error || 'unknown error'}`}
                        </div>
                    ) : executionResult.compileError ? (
                        <div>
                            <div className="text-red-400 mb-1">✗ Compilation failed</div>
                            <pre className="whitespace-pre-wrap text-red-300/90">{executionResult.compileError}</pre>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            <div className={executionResult.exitCode === 0 ? 'text-green-400' : 'text-yellow-400'}>
                                {executionResult.exitCode === 0 ? '✓ Ran successfully' : `Exited with code ${executionResult.exitCode}`}
                            </div>
                            {executionResult.stdout && executionResult.stdout.trim() && (
                                <div>
                                    <span className="text-gray-500">stdout:</span>
                                    <pre className="whitespace-pre-wrap text-gray-200">{executionResult.stdout}</pre>
                                </div>
                            )}
                            {executionResult.stderr && executionResult.stderr.trim() && (
                                <div>
                                    <span className="text-gray-500">stderr:</span>
                                    <pre className="whitespace-pre-wrap text-red-300/90">{executionResult.stderr}</pre>
                                </div>
                            )}
                            {!(executionResult.stdout || '').trim() && !(executionResult.stderr || '').trim() && (
                                <div className="text-gray-500">(no output — add a print/console statement to see results)</div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Footer */}
            <div className="p-2 bg-[#282a2e] border-t border-white/5 flex justify-between items-center">
                <span className="text-xs text-gray-500">
                    {code.split('\n').length} lines
                </span>
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !code.trim()}
                    className="px-4 py-1.5 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs font-bold rounded flex items-center gap-2 transition-colors"
                >
                    {isSubmitting ? (
                        <>
                            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Evaluating...
                        </>
                    ) : (
                        <>
                            <span>▶</span>
                            Run &amp; Submit
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
