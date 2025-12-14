import { useState, useEffect } from 'react';

type AIState = 'listening' | 'speaking' | 'processing' | 'idle';

export const useHumeAI = () => {
    const [status, setStatus] = useState<AIState>('idle');
    const [audioLevel, setAudioLevel] = useState(0);

    useEffect(() => {
        // Mock lifecycle loop
        const loop = async () => {
            while (true) {
                // Idle
                setStatus('idle');
                setAudioLevel(0.1); // low ambient noise
                await new Promise(r => setTimeout(r, 2000));

                // AI Speaking
                setStatus('speaking');
                for (let i = 0; i < 20; i++) {
                    setAudioLevel(Math.random() * 0.8 + 0.2); // high variations
                    await new Promise(r => setTimeout(r, 200));
                }

                // Listening (User turn)
                setStatus('listening');
                setAudioLevel(0.2);
                await new Promise(r => setTimeout(r, 4000));

                // Processing
                setStatus('processing');
                await new Promise(r => setTimeout(r, 1500));
            }
        };

        // Start loop
        const timer = setTimeout(loop, 1000);
        return () => clearTimeout(timer);
    }, []);

    return { status, audioLevel };
};
