import type { Server, Socket } from 'socket.io';
import WebSocket from 'ws';
import jwt from 'jsonwebtoken';

const SARVAM_TTS_WS = 'wss://api.sarvam.ai/text-to-speech/ws';
const SARVAM_STT_WS = 'wss://api.sarvam.ai/speech-to-text/ws';
// saarika:v2.5 is the proven streaming model; override via SARVAM_STT_MODEL.
const STT_MODEL = process.env.SARVAM_STT_MODEL || 'saarika:v2.5';
const STT_SAMPLE_RATE = 16000;

// The streaming WebSocket uses bulbul:v2, whose speaker roster differs from
// the REST path's v3. Valid v2 speakers: anushka, abhilash, manisha, vidya,
// arya, karun, hitesh.
const TTS_MODEL = 'bulbul:v2';
const PERSONA_SPEAKERS: Record<string, string> = {
    technical: 'anushka',   // Friday — female
    behavioral: 'abhilash', // Michael Torres — male
    systemDesign: 'karun',  // Alex Rivera — male
};
const DEFAULT_SPEAKER = 'anushka';

// We stream raw 16-bit PCM (linear16) — the client plays it gaplessly via
// Web Audio with no per-chunk decode. Sample rate is fixed here and echoed
// to the client so it can build AudioBuffers correctly.
const SAMPLE_RATE = 22050;

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_do_not_use_in_prod';

type SocketState = {
    sarvam: WebSocket | null;   // TTS WS (assigned immediately on create, may be CONNECTING)
    persona: string;
    languageCode: string;
    pendingText: string[];      // text queued until the TTS socket is OPEN
    stt: WebSocket | null;      // STT WS (assigned immediately on create)
    sttLang: string;
};

/**
 * Registers the streaming speech relay on the existing Socket.io server.
 *
 * Flow: browser ⟷ (Socket.io) ⟷ our server ⟷ (raw WS) ⟷ Sarvam.
 * The Sarvam API key never leaves the server.
 *
 * TTS events:  tts:open / tts:text / tts:flush / tts:cancel  →  tts:ready / tts:audio / tts:final / tts:error
 * STT events:  stt:start / stt:audio / stt:stop              →  stt:ready / stt:transcript / stt:closed / stt:error
 */
export function registerTtsStream(io: Server) {
    // Authenticate the socket handshake with the same JWT as the REST API.
    io.use((socket, next) => {
        try {
            const token =
                (socket.handshake.auth && (socket.handshake.auth as any).token) ||
                (socket.handshake.query && (socket.handshake.query as any).token);
            if (!token) return next(new Error('unauthorized'));
            const payload = jwt.verify(token, JWT_SECRET) as any;
            (socket.data as any).userId = payload.userId;
            next();
        } catch {
            next(new Error('unauthorized'));
        }
    });

    io.on('connection', (socket: Socket) => {
        const state: SocketState = {
            sarvam: null,
            persona: 'technical',
            languageCode: 'en-IN',
            pendingText: [],
            stt: null,
            sttLang: 'en-IN',
        };

        // ── TTS ──

        const closeSarvam = () => {
            const ws = state.sarvam;
            state.sarvam = null;
            state.pendingText = [];
            if (ws) {
                try { ws.removeAllListeners(); } catch { /* noop */ }
                try { ws.close(); } catch { /* noop */ }
            }
        };

        const sendConfig = (ws: WebSocket) => {
            const speaker = PERSONA_SPEAKERS[state.persona] || DEFAULT_SPEAKER;
            ws.send(JSON.stringify({
                type: 'config',
                data: {
                    model: TTS_MODEL,
                    target_language_code: state.languageCode,
                    speaker,
                    output_audio_codec: 'linear16',
                    speech_sample_rate: String(SAMPLE_RATE),
                },
            }));
        };

        const openSarvam = () => {
            const apiKey = process.env.SARVAM_API_KEY;
            if (!apiKey) {
                socket.emit('tts:error', { message: 'SARVAM_API_KEY not set' });
                return;
            }
            if (state.sarvam) return; // exists (OPEN or CONNECTING)

            const ws = new WebSocket(SARVAM_TTS_WS, {
                headers: { 'Api-Subscription-Key': apiKey },
            });
            // Claim the slot immediately — a cancel during CONNECTING cleanly
            // closes THIS socket instead of leaking a half-open one.
            state.sarvam = ws;

            ws.on('open', () => {
                if (state.sarvam !== ws) return; // cancelled while connecting
                sendConfig(ws);
                const queued = state.pendingText;
                state.pendingText = [];
                for (const t of queued) {
                    ws.send(JSON.stringify({ type: 'text', data: { text: t } }));
                }
                socket.emit('tts:ready');
            });

            ws.on('message', (raw: WebSocket.RawData) => {
                let msg: any;
                try { msg = JSON.parse(raw.toString()); } catch { return; }
                if (msg?.type === 'audio' && msg.data?.audio) {
                    socket.emit('tts:audio', { pcm: msg.data.audio, sampleRate: SAMPLE_RATE });
                } else if (msg?.type === 'event' && msg.data?.event_type === 'final') {
                    socket.emit('tts:final');
                } else if (msg?.type === 'error') {
                    socket.emit('tts:error', { message: msg.data?.message || 'Sarvam TTS error' });
                }
            });

            ws.on('error', (err: Error) => {
                console.error('Sarvam TTS WS error:', err.message);
                socket.emit('tts:error', { message: 'Sarvam TTS connection failed' });
                if (state.sarvam === ws) closeSarvam();
            });

            ws.on('close', () => {
                if (state.sarvam === ws) {
                    state.sarvam = null;
                    // Tell the client (deliberate closes remove listeners first,
                    // so this only fires on unexpected upstream closes) — else
                    // the client could wait on tts:final forever.
                    socket.emit('tts:error', { message: 'TTS stream closed upstream' });
                }
            });
        };

        socket.on('tts:open', (payload: { persona?: string; languageCode?: string }) => {
            state.persona = payload?.persona || 'technical';
            state.languageCode = payload?.languageCode || 'en-IN';
            openSarvam();
        });

        socket.on('tts:text', (payload: { text?: string }) => {
            const text = (payload?.text || '').slice(0, 2400);
            if (!text.trim()) return;
            if (state.sarvam && state.sarvam.readyState === WebSocket.OPEN) {
                state.sarvam.send(JSON.stringify({ type: 'text', data: { text } }));
            } else {
                // Queue; drained when the socket opens (openSarvam no-ops if
                // one is already connecting). Capped so a connect loop can't
                // grow the buffer unboundedly.
                if (state.pendingText.length < 50) state.pendingText.push(text);
                openSarvam();
            }
        });

        socket.on('tts:flush', () => {
            if (state.sarvam && state.sarvam.readyState === WebSocket.OPEN) {
                state.sarvam.send(JSON.stringify({ type: 'flush' }));
            }
        });

        // Hard stop (barge-in / new turn): discard buffered text and re-open a
        // clean stream so the next turn is pre-warmed.
        socket.on('tts:cancel', () => {
            closeSarvam();
            openSarvam();
        });

        // Full teardown (leaving the interview): close upstream WITHOUT the
        // pre-warm reopen — otherwise every finished interview leaks a live
        // Sarvam WS until the tab closes.
        socket.on('tts:close', () => {
            closeSarvam();
        });

        // ── STT ──

        const closeStt = () => {
            const ws = state.stt;
            state.stt = null;
            if (ws) {
                try { ws.removeAllListeners(); } catch { /* noop */ }
                try { ws.close(); } catch { /* noop */ }
                // Deliberate close does not emit 'close' after removeAllListeners,
                // so tell the client explicitly (it decides whether to reopen).
                socket.emit('stt:closed');
            }
        };

        const openStt = (languageCode: string) => {
            const apiKey = process.env.SARVAM_API_KEY;
            if (!apiKey) {
                socket.emit('stt:error', { message: 'SARVAM_API_KEY not set' });
                return;
            }
            if (state.stt) return; // exists (OPEN or CONNECTING)
            state.sttLang = languageCode || 'en-IN';

            const url =
                `${SARVAM_STT_WS}?language-code=${encodeURIComponent(state.sttLang)}` +
                `&model=${encodeURIComponent(STT_MODEL)}&mode=transcribe&sample_rate=${STT_SAMPLE_RATE}`;
            const ws = new WebSocket(url, {
                headers: { 'Api-Subscription-Key': apiKey },
            });
            state.stt = ws; // claim immediately (see TTS note)

            ws.on('open', () => {
                if (state.stt !== ws) return;
                socket.emit('stt:ready');
            });
            ws.on('message', (raw: WebSocket.RawData) => {
                let msg: any;
                try { msg = JSON.parse(raw.toString()); } catch { return; }
                if (msg?.type === 'data' && typeof msg.data?.transcript === 'string') {
                    if (msg.data.transcript.trim()) {
                        socket.emit('stt:transcript', { text: msg.data.transcript });
                    }
                } else if (msg?.type === 'error') {
                    socket.emit('stt:error', { message: msg.data?.message || 'Sarvam STT error' });
                }
            });
            ws.on('error', (err: Error) => {
                console.error('Sarvam STT WS error:', err.message);
                socket.emit('stt:error', { message: 'Sarvam STT connection failed' });
                if (state.stt === ws) closeStt();
            });
            ws.on('close', () => {
                if (state.stt === ws) {
                    state.stt = null;
                    socket.emit('stt:closed');
                }
            });
        };

        socket.on('stt:start', (payload: { languageCode?: string }) => {
            openStt(payload?.languageCode || 'en-IN');
        });

        socket.on('stt:audio', (payload: { pcm?: string }) => {
            if (!payload?.pcm) return;
            if (state.stt && state.stt.readyState === WebSocket.OPEN) {
                state.stt.send(JSON.stringify({
                    audio: {
                        data: payload.pcm,
                        sample_rate: String(STT_SAMPLE_RATE),
                        encoding: 'audio/wav',
                    },
                }));
            }
        });

        socket.on('stt:stop', () => {
            closeStt();
        });

        socket.on('disconnect', () => {
            closeSarvam();
            closeStt();
        });
    });
}
