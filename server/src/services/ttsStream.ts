import type { Server, Socket } from 'socket.io';
import WebSocket from 'ws';
import jwt from 'jsonwebtoken';

const SARVAM_TTS_WS = 'wss://api.sarvam.ai/text-to-speech/ws';

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
    sarvam: WebSocket | null;
    persona: string;
    languageCode: string;
    pendingText: string[]; // text queued before the Sarvam socket is open
    opening: boolean;
};

/**
 * Registers the streaming-TTS relay on the existing Socket.io server.
 *
 * Flow: browser ⟷ (Socket.io) ⟷ our server ⟷ (raw WS) ⟷ Sarvam Bulbul.
 * The Sarvam API key never leaves the server.
 *
 * Client → server events:
 *   'tts:open'  { persona, languageCode }   open/prepare the Sarvam stream
 *   'tts:text'  { text }                    synthesize this text (streams back)
 *   'tts:flush' {}                          flush buffered text
 *   'tts:cancel'{}                          hard stop (barge-in / new turn)
 * Server → client events:
 *   'tts:ready'                             stream is connected
 *   'tts:audio' { pcm: base64, sampleRate } a chunk of PCM16 audio
 *   'tts:final'                             synthesis finished
 *   'tts:error' { message }                 fall back to REST on the client
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
            opening: false,
        };

        const closeSarvam = () => {
            if (state.sarvam) {
                try { state.sarvam.removeAllListeners(); } catch { /* noop */ }
                try { state.sarvam.close(); } catch { /* noop */ }
                state.sarvam = null;
            }
            state.pendingText = [];
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
            if (state.sarvam || state.opening) return;
            state.opening = true;

            const ws = new WebSocket(SARVAM_TTS_WS, {
                headers: { 'Api-Subscription-Key': apiKey },
            });

            ws.on('open', () => {
                state.opening = false;
                state.sarvam = ws;
                sendConfig(ws);
                // Drain any text queued before the connection opened.
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
                state.opening = false;
                console.error('Sarvam TTS WS error:', err.message);
                socket.emit('tts:error', { message: 'Sarvam TTS connection failed' });
                closeSarvam();
            });

            ws.on('close', () => {
                if (state.sarvam === ws) state.sarvam = null;
            });
        };

        socket.on('tts:open', (payload: { persona?: string; languageCode?: string }) => {
            state.persona = payload?.persona || 'technical';
            state.languageCode = payload?.languageCode || 'en-IN';
            if (!state.sarvam && !state.opening) openSarvam();
        });

        socket.on('tts:text', (payload: { text?: string }) => {
            const text = (payload?.text || '').slice(0, 2400);
            if (!text.trim()) return;
            if (state.sarvam && state.sarvam.readyState === WebSocket.OPEN) {
                state.sarvam.send(JSON.stringify({ type: 'text', data: { text } }));
            } else {
                state.pendingText.push(text);
                if (!state.opening) openSarvam();
            }
        });

        socket.on('tts:flush', () => {
            if (state.sarvam && state.sarvam.readyState === WebSocket.OPEN) {
                state.sarvam.send(JSON.stringify({ type: 'flush' }));
            }
        });

        // Hard stop: tear the Sarvam socket down and immediately re-open a clean
        // one so the next turn is ready. Anything still buffered is discarded.
        socket.on('tts:cancel', () => {
            closeSarvam();
            openSarvam();
        });

        socket.on('disconnect', () => {
            closeSarvam();
        });
    });
}
