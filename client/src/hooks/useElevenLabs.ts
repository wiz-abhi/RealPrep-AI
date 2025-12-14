import { useEffect, useState, useCallback, useRef } from 'react';
import { useScribe } from '@elevenlabs/react';

// You would typically fetch this from your backend to avoid exposing API keys
// For prototype, we might pass it or use env vars (carefully)
const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;

export const useElevenLabs = () => {
    const [transcript, setTranscript] = useState<string>('');
    const [audioResponseUrl, setAudioResponseUrl] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // 1. Scribe (STT) Setup
    // Note: useScribe expects a signed URL or API key. 
    // Ideally we should implement a backend endpoint to generate a signed URL.
    // For now, let's assume we pass the key (NOT RECOMMENDED FOR PROD).
    const {
        transcription,
        isRecording,
        startRecording,
        stopRecording
    } = useScribe({
        apiKey: ELEVENLABS_API_KEY,
        modelId: 'scribe_v2', // or scribe_v2_realtime
    });

    useEffect(() => {
        if (transcription?.text) {
            setTranscript(transcription.text);
        }
    }, [transcription]);

    // 2. TTS Helper
    const playResponse = useCallback(async (text: string) => {
        try {
            const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM`, { // Default voice ID
                method: 'POST',
                headers: {
                    'Accept': 'audio/mpeg',
                    'Content-Type': 'application/json',
                    'xi-api-key': ELEVENLABS_API_KEY
                },
                body: JSON.stringify({
                    text,
                    model_id: "eleven_monolingual_v1",
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.5
                    }
                })
            });

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            setAudioResponseUrl(url);

            if (audioRef.current) {
                audioRef.current.src = url;
                audioRef.current.play();
            }

        } catch (error) {
            console.error('TTS Error:', error);
        }
    }, []);

    return {
        transcript,
        isRecording,
        startRecording,
        stopRecording,
        playResponse,
        audioRef
    };
};
