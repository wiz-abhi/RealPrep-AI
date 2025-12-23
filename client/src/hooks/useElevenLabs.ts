import { useState, useCallback, useRef } from 'react';

const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel voice

// Global audio element to ensure only one plays at a time
let globalAudio: HTMLAudioElement | null = null;
let isPlayingLock = false;

export const useElevenLabs = () => {
    const [transcript, setTranscript] = useState<string>('');
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Stop any currently playing audio
    const stopSpeaking = useCallback(() => {
        if (globalAudio) {
            globalAudio.pause();
            globalAudio.src = '';
            globalAudio = null;
        }
        isPlayingLock = false;
        setIsSpeaking(false);
    }, []);

    // Start recording audio from microphone
    const startRecording = useCallback(async () => {
        if (isRecording) return;

        try {
            setError(null);
            audioChunksRef.current = [];

            // Stop any playing audio first
            stopSpeaking();

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            streamRef.current = stream;

            // Use audio/wav or audio/mp4 which are more universally supported
            let mimeType = 'audio/webm';
            if (MediaRecorder.isTypeSupported('audio/mp4')) {
                mimeType = 'audio/mp4';
            } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                mimeType = 'audio/webm;codecs=opus';
            } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
                mimeType = 'audio/ogg;codecs=opus';
            }

            console.log('Using mimeType:', mimeType);

            const mediaRecorder = new MediaRecorder(stream, { mimeType });

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                // Stop all tracks
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                    streamRef.current = null;
                }

                // Process the recorded audio
                if (audioChunksRef.current.length > 0) {
                    const baseMimeType = mimeType.split(';')[0];
                    const audioBlob = new Blob(audioChunksRef.current, { type: baseMimeType });
                    console.log('Audio blob size:', audioBlob.size, 'type:', audioBlob.type);

                    if (audioBlob.size > 1000) { // Only process if meaningful audio
                        await transcribeAudio(audioBlob, baseMimeType);
                    } else {
                        setError('Recording too short. Please speak longer.');
                    }
                }
            };

            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.start(100); // Collect data every 100ms
            setIsRecording(true);
            setTranscript('');

        } catch (err: any) {
            console.error('Failed to start recording:', err);
            setError('Microphone access denied or not available');
            setIsRecording(false);
        }
    }, [isRecording, stopSpeaking]);

    // Stop recording and trigger transcription
    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    }, [isRecording]);

    // Send audio to ElevenLabs STT API
    const transcribeAudio = async (audioBlob: Blob, mimeType: string) => {
        if (!ELEVENLABS_API_KEY) {
            setError('ElevenLabs API key is missing');
            return;
        }

        setIsProcessing(true);

        try {
            // Determine file extension from mime type
            let extension = 'webm';
            if (mimeType.includes('mp4')) extension = 'mp4';
            else if (mimeType.includes('ogg')) extension = 'ogg';
            else if (mimeType.includes('wav')) extension = 'wav';
            else if (mimeType.includes('mpeg') || mimeType.includes('mp3')) extension = 'mp3';

            // Create form data with required model_id
            const formData = new FormData();
            formData.append('file', audioBlob, `recording.${extension}`);
            formData.append('model_id', 'scribe_v1');

            console.log('Sending to STT API:', {
                size: audioBlob.size,
                type: audioBlob.type,
                filename: `recording.${extension}`,
                model_id: 'scribe_v1'
            });

            const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
                method: 'POST',
                headers: {
                    'xi-api-key': ELEVENLABS_API_KEY.trim()
                },
                body: formData
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                console.error('STT API Failed:', response.status, err);

                if (response.status === 401) {
                    setError('Invalid ElevenLabs API Key');
                } else if (response.status === 422) {
                    setError('Audio format issue. Try speaking louder/longer.');
                } else {
                    setError(`Transcription failed: ${response.status}`);
                }
                return;
            }

            const data = await response.json();
            console.log('STT Response:', data);
            const transcribedText = data.text || '';
            setTranscript(transcribedText);

        } catch (err: any) {
            console.error('Transcription error:', err);
            setError('Failed to transcribe audio');
        } finally {
            setIsProcessing(false);
        }
    };

    // Play TTS response - with lock to prevent duplicates
    const playResponse = useCallback(async (text: string) => {
        if (!ELEVENLABS_API_KEY) {
            console.error('ElevenLabs API key is missing.');
            return;
        }

        if (!text.trim()) return;

        // Prevent duplicate plays
        if (isPlayingLock) {
            console.log('Already playing, skipping duplicate request');
            return;
        }

        // Stop any current playback FIRST
        stopSpeaking();

        // Set lock immediately
        isPlayingLock = true;

        try {
            setIsSpeaking(true);

            const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`, {
                method: 'POST',
                headers: {
                    'Accept': 'audio/mpeg',
                    'Content-Type': 'application/json',
                    'xi-api-key': ELEVENLABS_API_KEY.trim()
                },
                body: JSON.stringify({
                    text,
                    model_id: 'eleven_turbo_v2',
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75
                    }
                })
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                console.error('TTS API Failed:', response.status, err);

                if (response.status === 401) {
                    setError('Invalid ElevenLabs API Key');
                }
                setIsSpeaking(false);
                isPlayingLock = false;
                return;
            }

            // Get audio blob and play it
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);

            const audio = new Audio(url);
            globalAudio = audio;

            audio.onended = () => {
                URL.revokeObjectURL(url);
                globalAudio = null;
                setIsSpeaking(false);
                isPlayingLock = false;
            };

            audio.onerror = () => {
                URL.revokeObjectURL(url);
                globalAudio = null;
                setIsSpeaking(false);
                isPlayingLock = false;
            };

            await audio.play();

        } catch (err: any) {
            console.error('TTS Error:', err);
            setError('Failed to play audio response');
            setIsSpeaking(false);
            isPlayingLock = false;
        }
    }, [stopSpeaking]);

    return {
        transcript,
        isRecording,
        isProcessing,
        isSpeaking,
        error,
        startRecording,
        stopRecording,
        stopSpeaking,
        playResponse,
        audioRef
    };
};
