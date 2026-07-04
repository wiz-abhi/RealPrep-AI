import { getRealtimeSocket } from './realtimeSocket';

/**
 * Streaming STT client (Option B): captures raw PCM16 from the mic via an
 * AudioWorklet and streams it over the shared realtime socket to our server's
 * Sarvam speech-to-text relay. Transcript segments come back as the user speaks
 * (live captions), and the accumulated text is ready the instant they stop —
 * removing the record-then-upload pause of the REST path.
 *
 * Turn model: each user turn closes the Sarvam WS at the end (stt:stop) so the
 * next turn gets a FRESH recognition session — segments can never bleed across
 * turns server-side. The stt:closed → reopen cycle (with capped backoff)
 * pre-warms the next session while the AI is speaking.
 *
 * Falls back to REST STT (in useSarvamSpeech) if the stream isn't ready.
 */

const TARGET_RATE = 16000;
const BATCH_SAMPLES = 1600; // ~100ms at 16kHz per socket message
const TRAILING_MS = 250;    // grace window for late segments after stop
const MAX_REOPEN_ATTEMPTS = 5;

let ready = false;
let listenersAttached = false;
let active = false; // between connect and disconnect (controls auto-reopen)
let lastLang = 'en-IN';
let consecutiveCloses = 0;

let ctx: AudioContext | null = null;
let workletNode: AudioWorkletNode | null = null;
let sourceNode: MediaStreamAudioSourceNode | null = null;
let micStream: MediaStream | null = null;
let workletUrl: string | null = null;

let capturing = false;
let acceptingUntil = 0; // timestamp until which late segments still belong to the ending turn
let accumulated = '';
let onInterim: ((text: string) => void) | null = null;
let sendBuffer: number[] = []; // Int16 samples awaiting a batch flush

const sttEnabled = () => localStorage.getItem('sarvam_stt_streaming') !== 'off';
export const isSttStreamReady = () => ready && sttEnabled();

// Inline AudioWorklet: converts each Float32 frame to Int16 PCM and posts it.
const WORKLET_CODE = `
class PCMWorklet extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) {
      const out = new Int16Array(ch.length);
      for (let i = 0; i < ch.length; i++) {
        let s = Math.max(-1, Math.min(1, ch[i]));
        out[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      this.port.postMessage(out, [out.buffer]);
    }
    return true;
  }
}
registerProcessor('pcm-worklet', PCMWorklet);
`;

const int16ToBase64 = (samples: Int16Array): string => {
    const bytes = new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength);
    let bin = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
        bin += String.fromCharCode.apply(
            null,
            Array.from(bytes.subarray(i, i + chunk)) as unknown as number[]
        );
    }
    return btoa(bin);
};

// Linear resample a Float32 frame from srcRate → 16kHz (safety net; usually the
// AudioContext already runs at 16kHz so this is a no-op passthrough).
const resampleTo16k = (input: Float32Array, srcRate: number): Float32Array => {
    if (srcRate === TARGET_RATE) return input;
    const ratio = srcRate / TARGET_RATE;
    const outLen = Math.floor(input.length / ratio);
    const out = new Float32Array(outLen);
    for (let i = 0; i < outLen; i++) {
        const idx = i * ratio;
        const i0 = Math.floor(idx);
        const i1 = Math.min(i0 + 1, input.length - 1);
        const frac = idx - i0;
        out[i] = input[i0] * (1 - frac) + input[i1] * frac;
    }
    return out;
};

const attachListeners = (s: NonNullable<ReturnType<typeof getRealtimeSocket>>) => {
    if (listenersAttached) return;
    listenersAttached = true;

    s.on('stt:ready', () => {
        ready = true;
        consecutiveCloses = 0;
    });
    s.on('stt:transcript', (p: { text: string }) => {
        // Turn gate: only accept segments while capturing (or in the short
        // trailing window right after stop). Anything else is a stale segment
        // from a previous turn — dropping it prevents transcript corruption.
        if (!capturing && Date.now() > acceptingUntil) return;
        if (p?.text) {
            accumulated = accumulated ? `${accumulated} ${p.text}` : p.text;
            onInterim?.(accumulated);
        }
    });
    s.on('stt:error', (e: any) => {
        console.warn('STT stream error, will fall back to REST:', e?.message);
        ready = false;
    });
    s.on('stt:closed', () => {
        ready = false;
        if (!active) return;
        // Reopen with capped exponential backoff — a persistent failure must
        // not become a reconnect storm against the API. Counter resets on the
        // next successful stt:ready.
        consecutiveCloses++;
        if (consecutiveCloses > MAX_REOPEN_ATTEMPTS) {
            console.warn('STT stream: giving up after repeated closes; REST fallback stays active.');
            return;
        }
        const delay = Math.min(400 * Math.pow(2, consecutiveCloses - 1), 5000);
        setTimeout(() => {
            if (active) s.emit('stt:start', { languageCode: lastLang });
        }, delay);
    });
    // Re-open after a socket-level reconnect (guarded here so repeated
    // connectSttStream calls can't stack duplicate handlers).
    s.on('connect', () => {
        if (active) s.emit('stt:start', { languageCode: lastLang });
    });
};

/** Open the STT stream for the interview (call once on load). */
export function connectSttStream(languageCode = 'en-IN') {
    if (!sttEnabled()) return;
    const s = getRealtimeSocket();
    if (!s) return;
    active = true;
    lastLang = languageCode;
    attachListeners(s);
    if (s.connected) s.emit('stt:start', { languageCode });
    // If not yet connected, the guarded 'connect' listener opens it.
}

/** Begin streaming mic audio for one user turn. Returns true if streaming started. */
export async function startSttCapture(onInterimCb: (text: string) => void): Promise<boolean> {
    if (!isSttStreamReady()) return false;
    const s = getRealtimeSocket();
    if (!s) return false;
    if (capturing) return true; // already capturing this turn

    accumulated = '';
    sendBuffer = [];
    acceptingUntil = 0;
    onInterim = onInterimCb;

    try {
        micStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });

        ctx = new AudioContext({ sampleRate: TARGET_RATE });
        if (!workletUrl) {
            workletUrl = URL.createObjectURL(new Blob([WORKLET_CODE], { type: 'application/javascript' }));
        }
        await ctx.audioWorklet.addModule(workletUrl);

        sourceNode = ctx.createMediaStreamSource(micStream);
        workletNode = new AudioWorkletNode(ctx, 'pcm-worklet');
        const srcRate = ctx.sampleRate;
        if (srcRate !== TARGET_RATE) {
            console.warn(`STT capture: AudioContext at ${srcRate}Hz, resampling to ${TARGET_RATE}Hz`);
        }

        workletNode.port.onmessage = (ev: MessageEvent) => {
            if (!capturing) return;
            const frame = ev.data as Int16Array;
            if (srcRate === TARGET_RATE) {
                for (let i = 0; i < frame.length; i++) sendBuffer.push(frame[i]);
            } else {
                const f32 = new Float32Array(frame.length);
                for (let i = 0; i < frame.length; i++) f32[i] = frame[i] / 32768;
                const rs = resampleTo16k(f32, srcRate);
                for (let i = 0; i < rs.length; i++) {
                    const v = Math.max(-1, Math.min(1, rs[i]));
                    sendBuffer.push(v < 0 ? v * 0x8000 : v * 0x7fff);
                }
            }
            while (sendBuffer.length >= BATCH_SAMPLES) {
                const batch = Int16Array.from(sendBuffer.splice(0, BATCH_SAMPLES));
                s.emit('stt:audio', { pcm: int16ToBase64(batch) });
            }
        };

        sourceNode.connect(workletNode);
        // Do NOT connect worklet to destination (we don't want to hear the mic).
        capturing = true;
        return true;
    } catch (err) {
        console.error('startSttCapture failed:', err);
        await stopSttCapture();
        return false;
    }
}

/** Stop streaming; returns the final accumulated transcript for the turn. */
export async function stopSttCapture(): Promise<string> {
    capturing = false;
    acceptingUntil = Date.now() + TRAILING_MS;
    const s = getRealtimeSocket();
    // Flush any remaining samples.
    if (s && sendBuffer.length > 0) {
        const batch = Int16Array.from(sendBuffer);
        sendBuffer = [];
        s.emit('stt:audio', { pcm: int16ToBase64(batch) });
    }
    try { workletNode?.disconnect(); } catch { /* noop */ }
    try { sourceNode?.disconnect(); } catch { /* noop */ }
    workletNode = null;
    sourceNode = null;
    if (micStream) { micStream.getTracks().forEach((t) => t.stop()); micStream = null; }
    if (ctx) { try { await ctx.close(); } catch { /* noop */ } ctx = null; }

    // Give trailing transcript segments a moment to arrive.
    await new Promise((r) => setTimeout(r, TRAILING_MS));
    const finalText = accumulated.trim();

    // End this recognition session so the NEXT turn starts fresh — prevents
    // Sarvam from carrying audio context across turns (merged/duplicated text).
    // The stt:closed handler pre-warms a new session while the AI replies.
    if (s) s.emit('stt:stop');
    ready = false;

    return finalText;
}

export function disconnectSttStream() {
    active = false;
    capturing = false;
    ready = false;
    const s = getRealtimeSocket();
    if (s) s.emit('stt:stop');
}
