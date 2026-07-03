import { useEffect, useRef, useState, useCallback } from 'react';

type VADCallbacks = {
    onSpeechStart?: () => void;
    onSpeechEnd?: () => void;
};

/**
 * Browser Voice Activity Detection using Silero VAD (via @ricky0123/vad-web).
 * Runs entirely in-browser as a WebAssembly / ONNX model — no API cost, no
 * audio ever leaves the client. The ~2 MB model is lazy-loaded on first start.
 *
 * Usage:
 *   const vad = useVAD();
 *   useEffect(() => { vad.setCallbacks({ onSpeechStart, onSpeechEnd }); }, [...]);
 *   useEffect(() => { if (handsFree) vad.start(); else vad.stop(); }, [...]);
 */
export const useVAD = () => {
    const vadRef = useRef<any>(null);
    const callbacksRef = useRef<VADCallbacks>({});

    const [isReady, setIsReady] = useState(false);
    const [isActive, setIsActive] = useState(false);
    const [isUserSpeaking, setIsUserSpeaking] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Register callbacks via a ref so a hot-swap doesn't re-init the model.
    const setCallbacks = useCallback((cb: VADCallbacks) => {
        callbacksRef.current = cb;
    }, []);

    const start = useCallback(async () => {
        // Warm start — the model is already loaded.
        if (vadRef.current) {
            try {
                vadRef.current.start();
                setIsActive(true);
            } catch (e) {
                console.error('VAD warm start error:', e);
            }
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            const { MicVAD } = await import('@ricky0123/vad-web');
            const vad = await MicVAD.new({
                // Load the Silero model, audio worklet, and ONNX-runtime WASM
                // from jsDelivr (pinned to our installed versions). Vite's dev
                // server can't serve onnxruntime-web's dynamically-imported .mjs
                // out of /public or node_modules, so a cross-origin CDN URL is
                // the reliable path (Vite never intercepts external URLs).
                baseAssetPath: 'https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.30/dist/',
                onnxWASMBasePath: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/',
                onSpeechStart: () => {
                    setIsUserSpeaking(true);
                    callbacksRef.current.onSpeechStart?.();
                },
                onSpeechEnd: () => {
                    setIsUserSpeaking(false);
                    callbacksRef.current.onSpeechEnd?.();
                },
                onVADMisfire: () => {
                    // Optimistic onSpeechStart fired but no real speech was detected.
                    setIsUserSpeaking(false);
                },
                // Tuned for conversational interview cadence:
                positiveSpeechThreshold: 0.85,   // higher = fewer false positives from background noise
                negativeSpeechThreshold: 0.6,
                redemptionFrames: 8,             // ~768 ms of tolerated intra-sentence pause
                minSpeechFrames: 3,              // ~288 ms minimum to count as speech
                preSpeechPadFrames: 2,
            } as any);
            vadRef.current = vad;
            setIsReady(true);
            vad.start();
            setIsActive(true);
        } catch (err: any) {
            console.error('VAD init failed:', err);
            setError(err?.message || 'Failed to initialize VAD');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const stop = useCallback(() => {
        if (vadRef.current) {
            try { vadRef.current.pause(); } catch (e) { console.error('VAD pause:', e); }
        }
        setIsActive(false);
        setIsUserSpeaking(false);
    }, []);

    // Free the mic + ONNX session on unmount.
    useEffect(() => {
        return () => {
            if (vadRef.current) {
                try { vadRef.current.destroy(); } catch (e) { console.error('VAD destroy:', e); }
                vadRef.current = null;
            }
        };
    }, []);

    return {
        isReady,
        isActive,
        isUserSpeaking,
        isLoading,
        error,
        setCallbacks,
        start,
        stop,
    };
};
