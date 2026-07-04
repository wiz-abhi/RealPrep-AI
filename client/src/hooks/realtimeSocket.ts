import { io, type Socket } from 'socket.io-client';
import { API_BASE_URL } from '../config/api';

/**
 * Single shared Socket.io connection for all realtime features (streaming TTS
 * and streaming STT). Both modules attach their own `tts:*` / `stt:*` listeners
 * to this one socket, so we don't open two connections per interview.
 */
let socket: Socket | null = null;

export function getRealtimeSocket(): Socket | null {
    if (socket) return socket;
    const token = localStorage.getItem('token');
    if (!token) return null;
    socket = io(API_BASE_URL, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
    });
    return socket;
}

export function disconnectRealtimeSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}
