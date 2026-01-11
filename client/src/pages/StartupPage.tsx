import { useState, useEffect, useCallback } from 'react';
import { checkBackendHealth } from '../config/api';

export const StartupPage = ({ onReady }: { onReady: () => void }) => {
    const [status, setStatus] = useState<'connecting' | 'waiting' | 'ready' | 'error'>('connecting');
    const [attempts, setAttempts] = useState(0);
    const maxAttempts = 30; // 30 attempts × 2 seconds = 60 seconds max

    const checkHealth = useCallback(async () => {
        const isReady = await checkBackendHealth();
        if (isReady) {
            setStatus('ready');
            setTimeout(onReady, 500);
            return true;
        }
        return false;
    }, [onReady]);

    useEffect(() => {
        let mounted = true;
        let timeoutId: NodeJS.Timeout;

        const poll = async () => {
            if (!mounted) return;

            if (attempts === 0) {
                setStatus('connecting');
            } else {
                setStatus('waiting');
            }

            const isReady = await checkHealth();

            if (!mounted || isReady) return;

            setAttempts(prev => {
                const next = prev + 1;
                if (next >= maxAttempts) {
                    setStatus('error');
                    return next;
                }
                // Poll again in 2 seconds
                timeoutId = setTimeout(poll, 2000);
                return next;
            });
        };

        poll();

        return () => {
            mounted = false;
            clearTimeout(timeoutId);
        };
    }, [checkHealth, attempts, maxAttempts]);

    const handleRetry = () => {
        setAttempts(0);
        setStatus('connecting');
        window.location.reload();
    };

    const progress = Math.min((attempts / maxAttempts) * 100, 100);

    return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="text-center max-w-md px-6">
                {/* Logo */}
                <div className="mb-8">
                    <div className="w-16 h-16 mx-auto rounded-xl border border-white/20 flex items-center justify-center mb-4 bg-white/5">
                        <span className="text-2xl font-bold text-white">R</span>
                    </div>
                    <h1 className="text-2xl font-light text-white tracking-wide">RealPrep AI</h1>
                </div>

                {/* Status */}
                <div className="space-y-6">
                    {status === 'connecting' && (
                        <>
                            <div className="w-12 h-12 mx-auto border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            <p className="text-white/60 text-sm">Connecting to servers...</p>
                        </>
                    )}

                    {status === 'waiting' && (
                        <>
                            <div className="w-12 h-12 mx-auto border-2 border-white/20 border-t-blue-400 rounded-full animate-spin" />
                            <div className="space-y-3">
                                <p className="text-white/80 text-sm">Waking up our servers...</p>

                                {/* Progress bar */}
                                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <p className="text-white/40 text-xs">Attempt {attempts}/{maxAttempts}</p>
                            </div>

                            {/* Apology message */}
                            <div className="mt-8 p-4 rounded-lg bg-white/5 border border-white/10">
                                <p className="text-white/50 text-xs leading-relaxed">
                                    ☕ Thanks for your patience! Our free-tier server goes to sleep
                                    after inactivity and takes about 30-60 seconds to wake up.
                                </p>
                            </div>
                        </>
                    )}

                    {status === 'ready' && (
                        <>
                            <div className="w-12 h-12 mx-auto rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center">
                                <span className="text-green-400 text-xl">✓</span>
                            </div>
                            <p className="text-green-400 text-sm">Connected! Loading app...</p>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <div className="w-12 h-12 mx-auto rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center">
                                <span className="text-red-400 text-xl">!</span>
                            </div>
                            <div className="space-y-4">
                                <p className="text-white/60 text-sm">
                                    Server is taking longer than expected...
                                </p>
                                <button
                                    onClick={handleRetry}
                                    className="px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm text-white transition-colors"
                                >
                                    Try Again
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
