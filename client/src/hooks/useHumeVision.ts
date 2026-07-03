import { useRef, useState, useCallback } from 'react';

// Get API key - user's localStorage key takes priority
const getHumeApiKey = () => {
    const userKey = localStorage.getItem('user_hume_api_key');
    return userKey || import.meta.env.VITE_HUME_API_KEY;
};

// ── Interview-Relevant Emotion Whitelist ──
// Maps Hume AI emotion names → { category, color } for interview context.
// Excludes irrelevant emotions: Love, Admiration, Adoration, Desire, Romance,
// Nostalgia, Aesthetic Appreciation, Amusement, Craving, etc.
interface EmotionMeta {
    category: 'stress' | 'cognitive' | 'focus' | 'positive' | 'social' | 'neutral';
    color: string; // tailwind-friendly color token
}

const INTERVIEW_EMOTIONS: Record<string, EmotionMeta> = {
    // Stress (red)
    'Anxiety': { category: 'stress', color: '#ef4444' },  // red-500
    'Fear': { category: 'stress', color: '#ef4444' },
    'Distress': { category: 'stress', color: '#ef4444' },

    // Cognitive / uncertainty (amber)
    'Confusion': { category: 'cognitive', color: '#f59e0b' },  // amber-500
    'Doubt': { category: 'cognitive', color: '#f59e0b' },

    // Cognitive focus (blue)
    'Concentration': { category: 'focus', color: '#3b82f6' },  // blue-500
    'Contemplation': { category: 'focus', color: '#3b82f6' },

    // Positive (emerald)
    'Determination': { category: 'positive', color: '#10b981' },  // emerald-500  (≈ Confidence)
    'Triumph': { category: 'positive', color: '#10b981' },  // (≈ Confidence)
    'Joy': { category: 'positive', color: '#10b981' },
    'Interest': { category: 'positive', color: '#10b981' },
    'Calmness': { category: 'positive', color: '#10b981' },

    // Social discomfort (orange)
    'Awkwardness': { category: 'social', color: '#f97316' },  // orange-500
    'Embarrassment': { category: 'social', color: '#f97316' },

    // Neutral / negative (gray)
    'Boredom': { category: 'neutral', color: '#9ca3af' },  // gray-400
    'Disappointment': { category: 'neutral', color: '#9ca3af' },
    'Frustration': { category: 'neutral', color: '#9ca3af' },
    'Contempt': { category: 'neutral', color: '#9ca3af' },
};

export interface InterviewEmotion {
    name: string;
    score: number;
    category: string;
    color: string;
}

/**
 * Filters Hume predictions to interview-relevant emotions only,
 * sorts by score, and always returns exactly 5 results.
 */
const pickTop5InterviewEmotions = (predictions: any[]): InterviewEmotion[] => {
    // Keep only whitelisted emotions
    const relevant = predictions
        .filter((p: any) => INTERVIEW_EMOTIONS[p.name])
        .map((p: any) => ({
            name: p.name,
            score: p.score as number,
            ...INTERVIEW_EMOTIONS[p.name],
        }))
        .sort((a, b) => b.score - a.score);

    // Always return exactly 5 — pad with zero-score placeholders if needed
    if (relevant.length >= 5) return relevant.slice(0, 5);

    // Backfill with whitelisted emotions that weren't detected
    const seen = new Set(relevant.map(e => e.name));
    const backfill = Object.entries(INTERVIEW_EMOTIONS)
        .filter(([name]) => !seen.has(name))
        .map(([name, meta]) => ({ name, score: 0, ...meta }));

    return [...relevant, ...backfill].slice(0, 5);
};

// Using raw WebSocket for Hume Vision as it offers fine-grained control for frame streaming
// and might be lighter than the full Voice SDK just for vision.
export const useHumeVision = () => {
    const [emotions, setEmotions] = useState<InterviewEmotion[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef<WebSocket | null>(null);

    const manualCloseRef = useRef(false);
    const retryCountRef = useRef(0);

    const connect = useCallback(async () => {
        try {
            // Guard against StrictMode double-connect: if a socket is already
            // open or connecting, don't open a second one.
            const existing = socketRef.current;
            if (existing && (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)) {
                return;
            }
            manualCloseRef.current = false;

            // Get API key (user's custom key or env key)
            const apiKey = getHumeApiKey();

            const socketUrl = `wss://api.hume.ai/v0/stream/models?api_key=${apiKey}`;
            const socket = new WebSocket(socketUrl);
            socketRef.current = socket;

            socket.onopen = () => {
                console.log('Hume Vision Connected');
                retryCountRef.current = 0;
                setIsConnected(true);
            };

            socket.onmessage = (event) => {
                const response = JSON.parse(event.data);
                if (response.face && response.face.predictions) {
                    const predictions = response.face.predictions[0]?.emotions;
                    if (predictions) {
                        setEmotions(pickTop5InterviewEmotions(predictions));
                    }
                }
            };

            socket.onclose = () => {
                setIsConnected(false);
                // Retry a couple of times on unexpected closure (network blip,
                // Hume-side hiccup) — never after a deliberate disconnect.
                if (!manualCloseRef.current && retryCountRef.current < 2) {
                    retryCountRef.current += 1;
                    console.log(`Hume Vision reconnecting (attempt ${retryCountRef.current})...`);
                    setTimeout(() => connect(), 3000);
                }
            };

        } catch (error) {
            console.error('Hume Connection Error:', error);
        }
    }, []);

    const sendFrame = useCallback((base64Image: string) => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            // Hume API expects raw base64 string, not data URI
            const rawBase64 = base64Image.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");

            const payload = {
                models: {
                    face: {
                        identify_faces: false, // We just want expression
                    }
                },
                data: rawBase64
            };
            socketRef.current.send(JSON.stringify(payload));
        }
    }, []);

    const disconnect = useCallback(() => {
        manualCloseRef.current = true;
        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }
    }, []);

    // Debug logging
    useState(() => {
        const key = import.meta.env.VITE_HUME_API_KEY;
        console.log('[ENV CHECK] VITE_HUME_API_KEY:', key ? `Present (${key.slice(0, 5)}...)` : 'MISSING/UNDEFINED');
    });

    return {
        connect,
        disconnect,
        sendFrame,
        emotions,
        isConnected
    };
};
