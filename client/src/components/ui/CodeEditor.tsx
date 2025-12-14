import React from 'react';
import Editor from '@monaco-editor/react';

interface CodeEditorProps {
    visible: boolean;
    code: string;
    onChange: (value: string | undefined) => void;
}

export const CodeEditor = ({ visible, code, onChange }: CodeEditorProps) => {
    if (!visible) return null;

    return (
        <div className="absolute top-20 right-4 w-[40%] bottom-24 bg-[#1a1a1a] border border-gray-700 rounded-xl overflow-hidden shadow-2xl z-30 animate-slide-in-right">
            <div className="bg-[#2d2d2d] px-4 py-2 flex items-center justify-between border-b border-gray-700">
                <span className="text-sm font-medium text-gray-300">Editor - JavaScript</span>
                <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
            </div>
            <Editor
                height="100%"
                defaultLanguage="javascript"
                theme="vs-dark"
                value={code}
                onChange={onChange}
                options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    padding: { top: 16 },
                }}
            />
        </div>
    );
};
