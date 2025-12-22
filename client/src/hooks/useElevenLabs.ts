import { useEffect, useState, useCallback, useRef } from 'react';

const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;

// Type definition for Web Speech API
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    abort(): void;
    onresult: (event: SpeechRecognitionEvent) => void;
    onerror: (event: SpeechRecognitionErrorEvent) => void;
    onend: () => void;
}

declare global {
    interface Window {
        SpeechRecognition: {
            new(): SpeechRecognition;
        };
        webkitSpeechRecognition: {
            new(): SpeechRecognition;
        };
    }
}

export const useElevenLabs = () => {
    const [transcript, setTranscript] = useState<string>('');
    const [isRecording, setIsRecording] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        const key = import.meta.env.VITE_ELEVENLABS_API_KEY;
        console.log('[ENV CHECK] VITE_ELEVENLABS_API_KEY:', key ? `Present (${key.slice(0, 5)}...)` : 'MISSING/UNDEFINED');
    }, []);

    // 1. Initialize Speech Recognition
    useEffect(() => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.error('Browser does not support Speech Recognition');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            if (finalTranscript || interimTranscript) {
                setTranscript(finalTranscript || interimTranscript);
            }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error('Speech recognition error', event.error);
            setIsRecording(false);
        };

        recognition.onend = () => {
            setIsRecording(false);
        };

        recognitionRef.current = recognition;

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    const startRecording = useCallback(() => {
        if (!recognitionRef.current) return;

        // Safety: If we think we are recording, don't try again
        if (isRecording) {
            console.log('Already recording, skipping start');
            return;
        }

        try {
            recognitionRef.current.start();
            setIsRecording(true);
            setTranscript(''); // Clear previous
        } catch (e: any) {
            if (e.name === 'InvalidStateError') {
                // Already started, sync state
                console.warn('Recognition already started');
                setIsRecording(true);
            } else {
                console.error('Failed to start recording:', e);
            }
        }
    }, [isRecording]);

    const stopRecording = useCallback(() => {
        if (!recognitionRef.current) return;

        try {
            recognitionRef.current.stop();
            // We set isRecording false in onend usually, but force it here for UI responsiveness
            setIsRecording(false);
        } catch (e) {
            console.error('Error stopping recording:', e);
        }
    }, []);

    // 2. TTS Helper
    const playResponse = useCallback(async (text: string) => {
        if (!ELEVENLABS_API_KEY) {
            console.error('ElevenLabs API key is missing.');
            return;
        }

        try {
            // Stop recognition while AI speaks to prevent self-listening
            if (isRecording) {
                stopRecording();
            }

            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }

            // Using Turbo v2. Make sure Voice ID is correct. '21m00Tcm4TlvDq8ikWAM' is Rachel (legacy/standard).
            // Some specific voice settings can cause 422 if invalid for the model.
            const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM`, {
                method: 'POST',
                headers: {
                    'Accept': 'audio/mpeg',
                    'Content-Type': 'application/json',
                    'xi-api-key': ELEVENLABS_API_KEY.trim()
                },
                body: JSON.stringify({
                    text,
                    model_id: "eleven_turbo_v2",
                    // Removing complex voice settings to reduce 422 risk
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75
                    }
                })
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                console.error('TTS API Failed:', response.status, JSON.stringify(err, null, 2));

                if (response.status === 401) {
                    setError('Invalid ElevenLabs API Key. Please check your .env file.');
                    setIsRecording(false); // Force stop
                    return; // Do NOT throw/retry
                }

                throw new Error(`TTS failed: ${response.status}`);
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);

            if (audioRef.current) {
                audioRef.current.src = url;
                await audioRef.current.play();
            }

        } catch (error) {
            console.error('TTS Error:', error);
            // If TTS fails, we MUST restart recording so the loop continues
            // But wait a small delay to ensure cleanup
            setTimeout(() => startRecording(), 1000);
        }
    }, [isRecording, startRecording, stopRecording]);

    return {
        transcript,
        isRecording,
        error,
        startRecording,
        stopRecording,
        playResponse,
        audioRef
    };
};
