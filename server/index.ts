import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

import resumeRoutes from './src/routes/resume.routes';
import interviewRoutes from './src/routes/interview.routes';
import referenceRoutes from './src/routes/reference.routes';
import authRoutes from './src/routes/auth.routes';
import userRoutes from './src/routes/user.routes';
import { cleanupExpiredResumes } from './src/controllers/resume.controller';

// ... (existing code)

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/user', userRoutes);
app.use('/api/reference', referenceRoutes);

// Basic Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Socket.io Connection
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

    // Run cleanup on startup and every hour
    cleanupExpiredResumes();
    setInterval(cleanupExpiredResumes, 60 * 60 * 1000); // Every hour
});
