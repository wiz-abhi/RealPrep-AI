import React from 'react';

interface SimpleMarkdownProps {
    text: string;
}

export const SimpleMarkdown: React.FC<SimpleMarkdownProps> = ({ text }) => {
    if (!text) return null;

    // Split text by code blocks first
    const parts = text.split(/(```[\s\S]*?```)/g);

    return (
        <div className="space-y-1.5 break-words">
            {parts.map((part, idx) => {
                if (part.startsWith('```') && part.endsWith('```')) {
                    // Extract code and language
                    const match = part.match(/```(\w*)\n?([\s\S]*?)```/);
                    const lang = match ? match[1] : '';
                    const code = match ? match[2] : part.slice(3, -3);
                    return (
                        <pre key={idx} className="bg-black/40 p-2 rounded text-[10px] font-mono border border-white/5 overflow-x-auto my-1">
                            {lang && <div className="text-[8px] text-white/40 uppercase mb-1 font-sans">{lang}</div>}
                            <code>{code.trim()}</code>
                        </pre>
                    );
                }

                // Handle inline formatting (bold, lists, paragraphs)
                const lines = part.split('\n');
                return (
                    <div key={idx} className="space-y-1">
                        {lines.map((line, lIdx) => {
                            let content: React.ReactNode = line;
                            
                            // Check for bullet points
                            const bulletMatch = line.match(/^(\s*)[*\-]\s+(.*)/);
                            const isBullet = !!bulletMatch;
                            if (isBullet) {
                                content = bulletMatch[2];
                            }

                            // Process bold tags: **text**
                            if (typeof content === 'string' && content.includes('**')) {
                                const subParts = content.split(/(\*\*.*?\*\*)/g);
                                content = subParts.map((sub, sIdx) => {
                                    if (sub.startsWith('**') && sub.endsWith('**')) {
                                        return <strong key={sIdx} className="font-semibold text-white">{sub.slice(2, -2)}</strong>;
                                    }
                                    return sub;
                                });
                            }

                            if (isBullet) {
                                return (
                                    <div key={lIdx} className="flex items-start gap-1.5 pl-2 text-white/80">
                                        <span className="text-emerald-400 mt-1 select-none font-bold text-[8px]">•</span>
                                        <span className="flex-1">{content}</span>
                                    </div>
                                );
                            }

                            if (line.trim() === '') {
                                return <div key={lIdx} className="h-1" />;
                            }

                            return <p key={lIdx} className="text-white/80 leading-normal">{content}</p>;
                        })}
                    </div>
                );
            })}
        </div>
    );
};
