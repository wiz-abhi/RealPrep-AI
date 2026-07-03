import { useState, useCallback, useRef } from 'react';
import { API_BASE_URL } from '../config/api';
import {
    connectTtsStream,
    speakStream,
    flushStream,
    cancelStream,
    isTtsStreamReady,
} from './sarvamTtsStream';

// ── Global audio state (single active audio element across the app) ──
let globalAudio: HTMLAudioElement | null = null;

// Monotonic "epoch": bumped on every stop/barge-in. In-flight synthesis and
// the playback loop check their captured epoch against this and bail if it
// changed — so a new turn (or an interruption) cleanly cancels the old one.
let speechEpoch = 0;

// Ordered queue of synthesis promises for the CURRENT epoch. Producers push
// (enqueueSpeech) and fire synthesis immediately (prefetch); a single consumer
// (the playback loop) awaits them in order and plays back-to-back.
let synthQueue: Promise<{ bytes: Uint8Array; mime: string } | null>[] = [];
let playbackRunning = false;

// Cache of pre-synthesized fixed phrases (fillers) → instant playback, no
// network round-trip. Keyed by the exact text.
const audioCache = new Map<string, { bytes: Uint8Array; mime: string }>();

const getPersona = (): string => localStorage.getItem('active_interview_persona') || 'technical';

const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const base64ToBytes = (b64: string): Uint8Array => {
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
};

// Fetch TTS for `text` and return the decoded audio bytes (no playback).
// Returns null if the epoch changed mid-flight or the request failed.
const fetchTTSBytes = async (
    text: string,
    epoch: number
): Promise<{ bytes: Uint8Array; mime: string } | null> => {
    if (!text.trim()) return null;
    const cached = audioCache.get(text);
    if (cached) return cached;
    try {
        const res = await fetch(`${API_BASE_URL}/api/speech/tts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ text, persona: getPersona(), languageCode: 'en-IN' }),
        });
        if (epoch !== speechEpoch) return null;
        if (!res.ok) return null;
        const data = await res.json();
        if (epoch !== speechEpoch) return null;
        const b64: string | undefined = data?.data?.audioBase64;
        if (!b64) return null;
        return { bytes: base64ToBytes(b64), mime: data?.data?.mimeType || 'audio/mp3' };
    } catch {
        return null;
    }
};

export const useSarvamSpeech = () => {
    const [transcript, setTranscript] = useState<string>('');
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Fully stop speech: cancel the streaming pipeline AND the REST pipeline
    // (bump epoch), drop queued audio, halt the current element. Any
    // stopSpeaking() = a hard interrupt (barge-in / new turn).
    const stopSpeaking = useCallback(() => {
        cancelStream();
        speechEpoch++;
        synthQueue = [];
        playbackRunning = false;
        if (globalAudio) {
            globalAudio.pause();
            globalAudio.src = '';
            globalAudio = null;
        }
        audioRef.current = null;
        setIsSpeaking(false);
    }, []);

    // Open the streaming-TTS connection for this persona (call once on load).
    // isSpeaking is driven by the stream's playback state while it's active.
    const connectStreaming = useCallback((persona: string) => {
        connectTtsStream(persona, 'en-IN', (speaking) => setIsSpeaking(speaking));
    }, []);

    // Flush any text buffered on the streaming connection (call at turn end).
    const flushSpeech = useCallback(() => {
        if (isTtsStreamReady()) flushStream();
    }, []);

    // Play one prepared audio buffer; resolves when it ends / errors / is cut off.
    const playBytes = (bytes: Uint8Array, mime: string, epoch: number): Promise<void> =>
        new Promise<void>((resolve) => {
            if (epoch !== speechEpoch) return resolve();
            const blob = new Blob([bytes], { type: mime });
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            globalAudio = audio;
            audioRef.current = audio;
            const cleanup = () => {
                URL.revokeObjectURL(url);
                if (globalAudio === audio) {
                    globalAudio = null;
                    audioRef.current = null;
                }
                resolve();
            };
            audio.onended = cleanup;
            audio.onerror = cleanup;
            audio.play().catch(cleanup);
        });

    // Single-consumer playback loop: drains synthQueue in order. Because
    // producers fire synthesis on enqueue, upcoming sentences are already being
    // synthesized while the current one plays → no gaps, minimal first-audio wait.
    const runPlayback = useCallback((epoch: number) => {
        if (playbackRunning) return;
        playbackRunning = true;
        setIsSpeaking(true);
        (async () => {
            try {
                while (synthQueue.length > 0 && epoch === speechEpoch) {
                    const item = await synthQueue.shift()!;
                    if (epoch !== speechEpoch) break;
                    if (item) await playBytes(item.bytes, item.mime, epoch);
                }
            } finally {
                playbackRunning = false;
                if (epoch === speechEpoch) setIsSpeaking(false);
            }
        })();
    }, []);

    /**
     * Incremental speech: call once per sentence as text streams in. Synthesis
     * starts immediately (prefetch); playback stays in submission order.
     */
    const enqueueSpeech = useCallback((text: string) => {
        if (!text.trim()) return;
        // Prefer the low-latency streaming path; fall back to the REST pipeline
        // if the stream isn't connected/ready.
        if (isTtsStreamReady()) {
            speakStream(text);
            return;
        }
        const epoch = speechEpoch;
        synthQueue.push(fetchTTSBytes(text, epoch));
        runPlayback(epoch);
    }, [runPlayback]);

    /**
     * Pre-synthesize fixed phrases (filler clips) so they play instantly later
     * with no network round-trip. Call once when the interview loads.
     */
    const primeFillers = useCallback(async (texts: string[]) => {
        const epoch = speechEpoch;
        await Promise.all(
            texts.map(async (t) => {
                if (audioCache.has(t)) return;
                const bytes = await fetchTTSBytes(t, epoch);
                if (bytes) audioCache.set(t, bytes);
            })
        );
    }, []);

    /**
     * One-shot playback of a full text (used by non-pipelined callers, e.g. the
     * "Repeat" button and greeting auto-play). Interrupts anything playing.
     */
    const playResponse = useCallback(async (text: string): Promise<void> => {
        if (!text.trim()) return;
        stopSpeaking();
        const epoch = speechEpoch;
        setIsSpeaking(true);
        try {
            const item = await fetchTTSBytes(text, epoch);
            if (!item || epoch !== speechEpoch) {
                if (epoch === speechEpoch) setIsSpeaking(false);
                return;
            }
            await playBytes(item.bytes, item.mime, epoch);
        } catch (err) {
            console.error('Sarvam TTS error:', err);
            setError('Failed to play audio response');
        } finally {
            if (epoch === speechEpoch) setIsSpeaking(false);
        }
    }, [stopSpeaking]);

    // ── STT (unchanged) ──
    const blobToBase64 = async (blob: Blob): Promise<string> => {
        const buffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        const chunkSize = 0x8000;
        for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode.apply(
                null,
                Array.from(bytes.subarray(i, i + chunkSize)) as unknown as number[]
            );
        }
        return btoa(binary);
    };

    const transcribeAudio = useCallback(async (audioBlob: Blob, mimeType: string) => {
        setIsProcessing(true);
        try {
            const base64 = await blobToBase64(audioBlob);
            const res = await fetch(`${API_BASE_URL}/api/speech/stt`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify({ audio: base64, mimeType, languageCode: 'en-IN' }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                setError(err?.error || `Transcription failed: ${res.status}`);
                return;
            }
            const data = await res.json();
            setTranscript(data?.data?.transcript || '');
        } catch (err) {
            console.error('Sarvam STT error:', err);
            setError('Failed to transcribe audio');
        } finally {
            setIsProcessing(false);
        }
    }, []);

    const startRecording = useCallback(async () => {
        if (isRecording) return;
        try {
            setError(null);
            audioChunksRef.current = [];
            stopSpeaking();

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            });
            streamRef.current = stream;

            let mimeType = 'audio/webm';
            if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
            else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) mimeType = 'audio/webm;codecs=opus';
            else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) mimeType = 'audio/ogg;codecs=opus';

            const mediaRecorder = new MediaRecorder(stream, { mimeType });
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };
            mediaRecorder.onstop = async () => {
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach((t) => t.stop());
                    streamRef.current = null;
                }
                if (audioChunksRef.current.length > 0) {
                    const baseMimeType = mimeType.split(';')[0];
                    const audioBlob = new Blob(audioChunksRef.current, { type: baseMimeType });
                    if (audioBlob.size > 1000) await transcribeAudio(audioBlob, baseMimeType);
                    else setError('Recording too short. Please speak longer.');
                }
            };

            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.start(100);
            setIsRecording(true);
            setTranscript('');
        } catch (err) {
            console.error('Sarvam startRecording failed:', err);
            setError('Microphone access denied or not available');
            setIsRecording(false);
        }
    }, [isRecording, stopSpeaking, transcribeAudio]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    }, [isRecording]);

    return {
        transcript,
        isRecording,
        isProcessing,
        isSpeaking,
        error,
        startRecording,
        stopRecording,
        playResponse,
        enqueueSpeech,
        primeFillers,
        connectStreaming,
        flushSpeech,
        stopSpeaking,
        audioRef,
    };
};
