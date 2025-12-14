import { useRef, useState, useCallback } from 'react';

// Using raw WebSocket for Hume Vision as it offers fine-grained control for frame streaming
// and might be lighter than the full Voice SDK just for vision.
export const useHumeVision = () => {
    const [emotions, setEmotions] = useState<any[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef<WebSocket | null>(null);

    const connect = useCallback(async () => {
        try {
            // Ideally fetch token from YOUR backend to avoid exposing keys
            // const accessToken = await fetchAccessToken({ ... }); 
            // but for prototype we might use a direct API Key if secure proxy isn't set up yet

            // Note: For production, always route through your backend!
            const apiKey = import.meta.env.VITE_HUME_API_KEY;

            const socketUrl = `wss://api.hume.ai/v0/stream/models?api_key=${apiKey}`;
            socketRef.current = new WebSocket(socketUrl);

            socketRef.current.onopen = () => {
                console.log('Hume Vision Connected');
                setIsConnected(true);
            };

            socketRef.current.onmessage = (event) => {
                const response = JSON.parse(event.data);
                if (response.face && response.face.predictions) {
                    // Extract Top 5 emotions
                    const predictions = response.face.predictions[0]?.emotions;
                    if (predictions) {
                        const top5 = predictions
                            .sort((a: any, b: any) => b.score - a.score)
                            .slice(0, 5);
                        setEmotions(top5);
                    }
                }
            };

            socketRef.current.onclose = () => setIsConnected(false);

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
        if (socketRef.current) {
            socketRef.current.close();
        }
    }, []);

    return {
        connect,
        disconnect,
        sendFrame,
        emotions,
        isConnected
    };
};
