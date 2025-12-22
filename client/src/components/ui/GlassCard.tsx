import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
    hover?: boolean;
}

export const GlassCard = ({
    children,
    className = '',
    hover = false,
    ...props
}: GlassCardProps) => {
    return (
        <div
            className={`
                glass rounded-lg p-6 relative overflow-hidden transition-all duration-300
                ${hover ? 'glow-hover hover-lift cursor-pointer' : ''}
                ${className}
            `}
            {...props}
        >
            {children}
        </div>
    );
};
