import { useState, useCallback, useRef } from 'react';

const ENV_ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY || '';
const VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel voice

// Get API key - user's localStorage key takes priority
const getElevenLabsApiKey = (): string => {
    const userKey = localStorage.getItem('user_elevenlabs_api_key');
    // Debug: show which key source is being used
    if (userKey) {
        console.log('Using localStorage ElevenLabs key:', userKey.substring(0, 8) + '...');
        return userKey;
    }
    if (ENV_ELEVENLABS_API_KEY) {
        console.log('Using ENV ElevenLabs key:', ENV_ELEVENLABS_API_KEY.substring(0, 8) + '...');
        return ENV_ELEVENLABS_API_KEY;
    }
    console.warn('No ElevenLabs API key found!');
    return '';
};

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
        audioRef.current = null;
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
        if (!getElevenLabsApiKey()) {
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

            const apiKey = getElevenLabsApiKey();
            console.log('Using ElevenLabs key:', apiKey ? `${apiKey.substring(0, 8)}...` : 'MISSING');

            const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
                method: 'POST',
                headers: {
                    'xi-api-key': apiKey.trim()
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

    // Play TTS response — streaming playback for low latency
    // Reads chunks from the ElevenLabs stream progressively instead of
    // waiting for the full blob. Starts playback after a small initial
    // buffer (~8 KB) so the user hears audio within ~1-2 s.
    const playResponse = useCallback(async (text: string) => {
        if (!getElevenLabsApiKey()) {
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

            const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream?optimize_streaming_latency=4`, {
                method: 'POST',
                headers: {
                    'Accept': 'audio/mpeg',
                    'Content-Type': 'application/json',
                    'xi-api-key': getElevenLabsApiKey().trim()
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

            // ── Streaming playback ──
            // Read chunks from the response stream and accumulate them.
            // Start playback as soon as we have a small initial buffer
            // so the user hears audio almost immediately.
            const reader = response.body?.getReader();
            if (!reader) {
                // Fallback: no readable stream (old browser) — use blob approach
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const audio = new Audio(url);
                globalAudio = audio;
                audioRef.current = audio;
                audio.onended = () => { URL.revokeObjectURL(url); globalAudio = null; audioRef.current = null; setIsSpeaking(false); isPlayingLock = false; };
                audio.onerror = () => { URL.revokeObjectURL(url); globalAudio = null; audioRef.current = null; setIsSpeaking(false); isPlayingLock = false; };
                await audio.play();
                return;
            }

            const chunks: BlobPart[] = [];
            let totalBytes = 0;
            let playbackStarted = false;
            const INITIAL_BUFFER_SIZE = 8192; // ~8 KB — enough for first ~0.5 s of audio

            const startPlayback = () => {
                if (playbackStarted) return;
                playbackStarted = true;

                const fullBlob = new Blob(chunks, { type: 'audio/mpeg' });
                const url = URL.createObjectURL(fullBlob);
                const audio = new Audio(url);
                globalAudio = audio;
                audioRef.current = audio;

                audio.onended = () => {
                    URL.revokeObjectURL(url);
                    globalAudio = null;
                    audioRef.current = null;
                    setIsSpeaking(false);
                    isPlayingLock = false;
                };
                audio.onerror = () => {
                    URL.revokeObjectURL(url);
                    globalAudio = null;
                    audioRef.current = null;
                    setIsSpeaking(false);
                    isPlayingLock = false;
                };

                audio.play().catch(() => {
                    // Playback failed (e.g. partial data) — will retry with full blob
                    playbackStarted = false;
                });
            };

            // Read the stream
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (!value) continue;

                chunks.push(value);
                totalBytes += value.byteLength;

                // Start playback early once we have enough data
                if (!playbackStarted && totalBytes >= INITIAL_BUFFER_SIZE) {
                    startPlayback();
                }
            }

            // Stream finished — if we haven't started playback yet (very short response), do it now
            // Also re-create with the complete blob for full fidelity
            if (!playbackStarted) {
                startPlayback();
            } else {
                // Replace audio source with the complete blob for glitch-free playback
                const completeBlob = new Blob(chunks, { type: 'audio/mpeg' });
                const completeUrl = URL.createObjectURL(completeBlob);
                const currentAudio = globalAudio;

                if (currentAudio && !currentAudio.ended) {
                    const currentTime = currentAudio.currentTime;
                    const wasPlaying = !currentAudio.paused;
                    
                    currentAudio.onended = null;
                    currentAudio.onerror = null;

                    const freshAudio = new Audio(completeUrl);
                    globalAudio = freshAudio;
                    audioRef.current = freshAudio;

                    freshAudio.onended = () => {
                        URL.revokeObjectURL(completeUrl);
                        globalAudio = null;
                        audioRef.current = null;
                        setIsSpeaking(false);
                        isPlayingLock = false;
                    };
                    freshAudio.onerror = () => {
                        URL.revokeObjectURL(completeUrl);
                        globalAudio = null;
                        audioRef.current = null;
                        setIsSpeaking(false);
                        isPlayingLock = false;
                    };

                    freshAudio.currentTime = currentTime;
                    if (wasPlaying) freshAudio.play().catch(() => {});
                }
            }

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
