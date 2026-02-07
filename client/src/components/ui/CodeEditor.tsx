import React, { useState } from 'react';
import Editor from 'react-simple-code-editor';
// @ts-ignore
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-cpp';
import 'prismjs/themes/prism-tomorrow.css';

interface CodeEditorProps {
    language?: string;
    onCodeChange?: (code: string) => void;
    onSubmit?: (code: string, language: string) => Promise<void>;
    isSubmitting?: boolean;
    initialCode?: string;
}

const LANGUAGE_MAP: Record<string, string> = {
    'javascript': 'javascript',
    'python': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c++': 'cpp',
};

export const CodeEditor: React.FC<CodeEditorProps> = ({
    language: initialLanguage = 'javascript',
    onCodeChange,
    onSubmit,
    isSubmitting = false,
    initialCode = '// Write your code here...\n\nfunction solution() {\n    \n}'
}) => {
    const [code, setCode] = useState(initialCode);
    const [language, setLanguage] = useState(initialLanguage);

    const handleChange = (newCode: string) => {
        setCode(newCode);
        if (onCodeChange) onCodeChange(newCode);
    };

    const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setLanguage(e.target.value);
    };

    const handleSubmit = async () => {
        if (onSubmit && code.trim()) {
            await onSubmit(code, language);
        }
    };

    const getHighlighter = (code: string) => {
        const lang = LANGUAGE_MAP[language] || 'javascript';
        try {
            return highlight(code, languages[lang] || languages.javascript, lang);
        } catch {
            return highlight(code, languages.javascript, 'javascript');
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
                        onClick={() => setCode('// Write your code here...\n\nfunction solution() {\n    \n}')}
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
            </div>

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
                            Submit to AI
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
