

interface ScannerOverlayProps {
    active?: boolean;
}

export const ScannerOverlay = ({ active = false }: ScannerOverlayProps) => {
    if (!active) return null;

    return (
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden rounded-2xl">
            {/* Scanning Line */}
            <div className="w-full h-[2px] bg-[#00f3ff] shadow-[0_0_20px_#00f3ff] absolute animate-scan" />

            {/* Grid Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,243,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,243,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px]" />
        </div>
    );
};
