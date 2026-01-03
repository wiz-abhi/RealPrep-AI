interface LoaderProps {
    text?: string;
    size?: 'sm' | 'md' | 'lg';
}

export const Loader = ({ text = 'Loading...', size = 'md' }: LoaderProps) => {
    const sizeClasses = {
        sm: 'w-4 h-4 border-2',
        md: 'w-8 h-8 border-2',
        lg: 'w-12 h-12 border-3'
    };

    return (
        <div className="flex flex-col items-center justify-center gap-4">
            <div
                className={`${sizeClasses[size]} border-white/20 border-t-white/80 rounded-full animate-spin`}
            />
            {text && (
                <p className="text-white/40 text-sm animate-pulse">{text}</p>
            )}
        </div>
    );
};

export const PageLoader = ({ text = 'Loading...' }: { text?: string }) => (
    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <Loader text={text} size="lg" />
    </div>
);
