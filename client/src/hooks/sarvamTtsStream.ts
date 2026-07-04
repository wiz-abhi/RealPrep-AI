import { getRealtimeSocket } from './realtimeSocket';

/**
 * Streaming TTS client (Option A): uses the shared realtime Socket.io connection
 * to reach our server's Sarvam Bulbul TTS relay. Audio arrives as raw PCM16 and
 * plays gaplessly via the Web Audio API. Falls back to the REST pipeline if the
 * stream isn't ready.
 */

let ready = false;
let listenersAttached = false;
let lastPersona = 'technical';
let lastLang = 'en-IN';

let audioCtx: AudioContext | null = null;
let playhead = 0;
let turnId = 0;
let leftoverByte: number | null = null;
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

    const aligned = new Uint8Array(bytes);
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

export function connectTtsStream(
    persona: string,
    languageCode = 'en-IN',
    onSpeaking?: (speaking: boolean) => void
) {
    if (!streamingEnabled()) return;
    onSpeakingChange = onSpeaking || onSpeakingChange;
    lastPersona = persona;
    lastLang = languageCode;

    const s = getRealtimeSocket();
    if (!s) return;

    if (!listenersAttached) {
        listenersAttached = true;
        s.on('tts:ready', () => { ready = true; });
        s.on('tts:audio', (p: { pcm: string; sampleRate: number }) => {
            if (p?.pcm) handlePcm(p.pcm, p.sampleRate || 22050);
        });
        s.on('tts:final', () => {
            // Utterance boundary: drop any odd-byte carry so a stale byte can't
            // prepend a click to the next utterance's first chunk.
            leftoverByte = null;
        });
        s.on('tts:error', (e: any) => {
            console.warn('TTS stream error, will fall back to REST:', e?.message);
            ready = false;
        });
        s.on('disconnect', () => { ready = false; });
        s.on('connect_error', (err) => {
            console.warn('Realtime socket connect_error:', err.message);
            ready = false;
        });
        s.on('connect', () => s.emit('tts:open', { persona: lastPersona, languageCode: lastLang }));
    }

    if (s.connected) s.emit('tts:open', { persona, languageCode });
}

export function speakStream(text: string) {
    const s = getRealtimeSocket();
    if (isTtsStreamReady() && s) s.emit('tts:text', { text });
}

export function flushStream() {
    const s = getRealtimeSocket();
    if (isTtsStreamReady() && s) s.emit('tts:flush');
}

export function cancelStream() {
    turnId++;
    leftoverByte = null;
    activeSources.forEach((src) => { try { src.stop(); } catch { /* noop */ } });
    activeSources = [];
    if (audioCtx) playhead = audioCtx.currentTime;
    onSpeakingChange?.(false);
    const s = getRealtimeSocket();
    if (s) s.emit('tts:cancel');
}
