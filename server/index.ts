import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import rateLimit from 'express-rate-limit';

dotenv.config();

// Fail hard in production if JWT secret was not overridden.
if (
    process.env.NODE_ENV === 'production' &&
    (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'dev_secret_do_not_use_in_prod')
) {
    console.error('FATAL: JWT_SECRET is not set in production. Refusing to start.');
    process.exit(1);
}

// Warn (but don't crash) if the LLM key is missing — some flows still work without it.
if (!process.env.SARVAM_API_KEY) {
    console.warn('WARNING: SARVAM_API_KEY is not set — interview endpoints will fail until it is.');
}

// Get frontend origin from environment or use defaults
const allowedOrigins = [
    'http://localhost:5173',
    process.env.FRONTEND_URL || ''
].filter(Boolean);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"]
    }
});

import resumeRoutes from './src/routes/resume.routes';
import interviewRoutes from './src/routes/interview.routes';
import referenceRoutes from './src/routes/reference.routes';
import authRoutes from './src/routes/auth.routes';
import userRoutes from './src/routes/user.routes';
import adminRoutes from './src/routes/admin.routes';
import paymentRoutes from './src/routes/payment.routes';
import speechRoutes from './src/routes/speech.routes';
import { cleanupExpiredResumes } from './src/controllers/resume.controller';
import { registerTtsStream } from './src/services/ttsStream';

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// ──────────────────────────────────────────────────
// Rate limiting
// Strict on auth (brute-force target); moderate on chat & speech (LLM/audio $$).
// ──────────────────────────────────────────────────
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many auth attempts. Try again later.' },
});

const chatLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 min
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Slow down.' },
});

const speechLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 90, // TTS+STT combined for a normal interview
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many speech requests. Slow down.' },
});

app.use('/api/auth', authLimiter);
// NOTE: Express prefix matching does NOT cover '/chat-stream' under '/chat' —
// list both explicitly or the streaming (token-burning) endpoint is unlimited.
app.use(['/api/interview/chat', '/api/interview/chat-stream'], chatLimiter);
app.use('/api/interview/code', chatLimiter);
app.use('/api/speech', speechLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/reference', referenceRoutes);
app.use('/api/speech', speechRoutes);

// Basic Health Check
app.get('/health', (req: express.Request, res: express.Response) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Streaming TTS relay (Sarvam Bulbul WebSocket ⟷ browser via Socket.io).
registerTtsStream(io);

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

    // Run cleanup on startup and every hour
    cleanupExpiredResumes();
    setInterval(cleanupExpiredResumes, 60 * 60 * 1000); // Every hour
});
