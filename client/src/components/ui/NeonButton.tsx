import React from 'react';

interface NeonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger';
    glow?: boolean;
}

export const NeonButton = ({
    children,
    className = '',
    variant = 'primary',
    glow = true,
    ...props
}: NeonButtonProps) => {
    const baseStyles = "relative px-6 py-3 rounded-lg font-bold uppercase tracking-wider text-sm transition-all duration-300 overflow-hidden group";

    const variants = {
        primary: "bg-transparent border border-[#00f3ff] text-[#00f3ff] hover:bg-[#00f3ff]/10",
        secondary: "bg-transparent border border-[#bc13fe] text-[#bc13fe] hover:bg-[#bc13fe]/10",
        danger: "bg-transparent border border-red-500 text-red-500 hover:bg-red-500/10",
    };

    const glowStyles = glow ? {
        primary: "hover:shadow-[0_0_20px_#00f3ff]",
        secondary: "hover:shadow-[0_0_20px_#bc13fe]",
        danger: "hover:shadow-[0_0_20px_red]",
    } : {};

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${glow ? glowStyles[variant as keyof typeof glowStyles] : ''} ${className}`}
            {...props}
        >
            <span className="relative z-10 flex items-center gap-2 justify-center">
                {children}
            </span>
            {/* Hover slide effect */}
            <div className="absolute inset-0 bg-current opacity-0 group-hover:opacity-10 transition-opacity duration-300 transform translate-y-full group-hover:translate-y-0" />
        </button>
    );
};
