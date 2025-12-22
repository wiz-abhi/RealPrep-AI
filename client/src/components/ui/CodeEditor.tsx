import React, { useState } from 'react';

interface CodeEditorProps {
    language?: string;
    onCodeChange?: (code: string) => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ language = 'javascript', onCodeChange }) => {
    const [code, setCode] = useState('// Write your code here...');

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setCode(e.target.value);
        if (onCodeChange) onCodeChange(e.target.value);
    };

    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] rounded-lg overflow-hidden border border-white/10">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-white/5">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Language:</span>
                    <select className="bg-transparent text-xs text-cyan-400 focus:outline-none">
                        <option>Java</option>
                        <option>JavaScript</option>
                        <option>Python</option>
                        <option>C++</option>
                    </select>
                </div>
                <div className="flex items-center gap-3">
                    <button className="text-gray-400 hover:text-white transition-colors">⚙️</button>
                    <button className="text-gray-400 hover:text-white transition-colors">🔄</button>
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 relative">
                {/* Line Numbers (Mock) */}
                <div className="absolute left-0 top-0 bottom-0 w-10 bg-[#1e1e1e] border-r border-white/5 flex flex-col items-end pr-2 pt-4 text-gray-600 text-xs font-mono select-none">
                    {Array.from({ length: 20 }).map((_, i) => (
                        <div key={i} className="h-6">{i + 1}</div>
                    ))}
                </div>

                {/* Text Area */}
                <textarea
                    value={code}
                    onChange={handleChange}
                    className="w-full h-full bg-[#1e1e1e] text-gray-300 font-mono text-sm p-4 pl-12 resize-none focus:outline-none leading-6"
                    spellCheck={false}
                />
            </div>

            {/* Footer */}
            <div className="p-2 bg-[#252526] border-t border-white/5 flex justify-end">
                <button className="px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded flex items-center gap-2 transition-colors">
                    <span>▶</span> Submit to AI
                </button>
            </div>
        </div>
    );
};
