import { io, type Socket } from 'socket.io-client';
import { API_BASE_URL } from '../config/api';

/**
 * Streaming TTS client (Option A): talks to our server's Socket.io relay, which
 * proxies Sarvam's Bulbul TTS WebSocket. Audio arrives as raw PCM16 chunks and
 * plays gaplessly through the Web Audio API (no per-chunk decode), so the first
 * sound is heard ~150-300ms after text is sent instead of after a full clause.
 *
 * Everything is a module-level singleton (one socket + one AudioContext for the
 * app). If the socket never becomes ready, callers fall back to the REST pipeline.
 */

let socket: Socket | null = null;
let ready = false;
let audioCtx: AudioContext | null = null;
let playhead = 0;                 // next scheduled start time (in ctx time)
let turnId = 0;                   // bumped on cancel; stale audio is ignored
let leftoverByte: number | null = null; // carries an odd trailing PCM byte between chunks
let activeSources: AudioBufferSourceNode[] = [];
let onSpeakingChange: ((speaking: boolean) => void) | null = null;

const streamingEnabled = () => localStorage.getItem('sarvam_tts_streaming') !== 'off';

export const isTtsStreamReady = () => ready && streamingEnabled();

const base64ToBytes = (b64: string): Uint8Array => {
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
};

const ensureCtx = (): AudioContext => {
    if (!audioCtx) {
        audioCtx = new AudioContext();
        playhead = audioCtx.currentTime;
    }
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => { /* noop */ });
    return audioCtx;
};

const handlePcm = (b64: string, sampleRate: number) => {
    const myTurn = turnId;
    const ctx = ensureCtx();

    let bytes = base64ToBytes(b64);

    // Re-attach a byte carried over from the previous (odd-length) chunk so
    // 16-bit samples stay aligned across chunk boundaries.
    if (leftoverByte !== null) {
        const merged = new Uint8Array(bytes.length + 1);
        merged[0] = leftoverByte;
        merged.set(bytes, 1);
        bytes = merged;
        leftoverByte = null;
    }
    if (bytes.length % 2 === 1) {
        leftoverByte = bytes[bytes.length - 1];
        bytes = bytes.subarray(0, bytes.length - 1);
    }
    if (bytes.length === 0) return;

    // Copy into an aligned buffer (subarray may not be 2-byte aligned for Int16Array).
    const aligned = new Uint8Array(bytes); // fresh, offset 0
    const int16 = new Int16Array(aligned.buffer, 0, aligned.length >> 1);
    const f32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) f32[i] = int16[i] / 32768;

    const buf = ctx.createBuffer(1, f32.length, sampleRate);
    buf.copyToChannel(f32, 0);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);

    const startAt = Math.max(playhead, ctx.currentTime);
    src.start(startAt);
    playhead = startAt + buf.duration;

    activeSources.push(src);
    onSpeakingChange?.(true);
    src.onended = () => {
        activeSources = activeSources.filter((s) => s !== src);
        if (turnId === myTurn && activeSources.length === 0) onSpeakingChange?.(false);
    };
};

/** Open (or re-target) the streaming connection for a persona. Idempotent. */
export function connectTtsStream(
    persona: string,
    languageCode = 'en-IN',
    onSpeaking?: (speaking: boolean) => void
) {
    if (!streamingEnabled()) return;
    onSpeakingChange = onSpeaking || onSpeakingChange;
    const token = localStorage.getItem('token');
    if (!token) return;

    if (socket) {
        socket.emit('tts:open', { persona, languageCode });
        return;
    }

    socket = io(API_BASE_URL, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
    });
    socket.on('connect', () => socket!.emit('tts:open', { persona, languageCode }));
    socket.on('tts:ready', () => { ready = true; });
    socket.on('tts:audio', (payload: { pcm: string; sampleRate: number }) => {
        if (payload?.pcm) handlePcm(payload.pcm, payload.sampleRate || 22050);
    });
    socket.on('tts:final', () => { /* playback drains on its own */ });
    socket.on('tts:error', (e: any) => {
        console.warn('TTS stream error, will fall back to REST:', e?.message);
        ready = false;
    });
    socket.on('disconnect', () => { ready = false; });
    socket.on('connect_error', (err) => {
        console.warn('TTS stream connect_error, falling back to REST:', err.message);
        ready = false;
    });
}

export function speakStream(text: string) {
    if (isTtsStreamReady() && socket) socket.emit('tts:text', { text });
}

export function flushStream() {
    if (isTtsStreamReady() && socket) socket.emit('tts:flush');
}

/** Hard stop for barge-in / new turn: silence audio and reset the stream. */
export function cancelStream() {
    turnId++;
    leftoverByte = null;
    activeSources.forEach((s) => { try { s.stop(); } catch { /* noop */ } });
    activeSources = [];
    if (audioCtx) playhead = audioCtx.currentTime;
    onSpeakingChange?.(false);
    if (socket) socket.emit('tts:cancel');
}

export function disconnectTtsStream() {
    cancelStream();
    if (socket) { socket.disconnect(); socket = null; }
    ready = false;
}
