import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
    hoverEffect?: boolean;
}

export const GlassCard = ({
    children,
    className = '',
    hoverEffect = false,
    ...props
}: GlassCardProps) => {
    return (
        <div
            className={`
        glass rounded-2xl p-6 relative overflow-hidden transition-all duration-300
        ${hoverEffect ? 'hover:shadow-[0_0_20px_rgba(0,243,255,0.2)] hover:border-[#00f3ff]/30' : ''}
        ${className}
      `}
            {...props}
        >
            {/* Glossy reflection effect */}
            <div className="absolute top-0 left-0 w-full h-[40%] bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

            {children}
        </div>
    );
};
