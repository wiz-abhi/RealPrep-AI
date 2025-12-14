import { Request, Response } from 'express';
import { RAGService } from '../services/rag';
import { GeminiService } from '../services/gemini';
import prisma from '../db';
import { v4 as uuidv4 } from 'uuid';
import { fetchAccessToken } from 'hume';

const gemini = new GeminiService();

export const startSession = async (req: Request, res: Response) => {
    try {
        const { userId, resumeId, instructionPrompt } = req.body;

        if (!userId || !resumeId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Get resume
        const resume = await prisma.resume.findUnique({
            where: { id: resumeId }
        });

        if (!resume) {
            return res.status(404).json({ error: 'Resume not found' });
        }

        // Retrieve relevant context from RAG
        const query = instructionPrompt || "Tell me about your skills and experience";
        const ragContext = await RAGService.retrieveContext(resumeId, query, 5);

        // Extract skills from RAG context if not already present
        let skills = resume.skills;
        if (!skills || skills.length === 0) {
            try {
                const skillExtractionPrompt = `Based on this resume content, extract key technical skills as a JSON array:
                
${ragContext}

Return ONLY a JSON array of skills, like: ["JavaScript", "React", "Node.js"]`;

                const skillsText = await gemini.generateText(skillExtractionPrompt);
                skills = JSON.parse(skillsText);

                // Update resume with extracted skills
                await prisma.resume.update({
                    where: { id: resumeId },
                    data: { skills }
                });
            } catch (error) {
                console.error('Skill extraction error:', error);
                skills = ['Communication', 'Problem Solving', 'Technical Skills'];
            }
        }

        // Generate initial interview question using RAG context and instruction prompt
        const initialPrompt = `You are an experienced technical interviewer. 
        
User's Instructions: ${instructionPrompt || 'Conduct a comprehensive technical interview'}

Based on the candidate's resume context below, ask an engaging opening question that addresses their instructions:

${ragContext}

Generate a natural, conversational opening question. Be specific and reference their actual experience.`;

        const initialMessage = await gemini.generateText(initialPrompt);

        // Create session
        const session = await prisma.session.create({
            data: {
                userId,
                type: 'Technical',
                status: 'active',
                score: 0,
                feedback: {}
            }
        });

        // Store initial message in transcript
        await prisma.transcript.create({
            data: {
                sessionId: session.id,
                sender: 'ai',
                text: initialMessage,
                timestamp: new Date()
            }
        });

        res.json({
            success: true,
            data: {
                sessionId: session.id,
                agentArgs: {
                    initialMessage,
                    skills,
                    instructionPrompt
                }
            }
        });
    } catch (error) {
        console.error('Start session error:', error);
        res.status(500).json({ error: 'Failed to start session' });
    }
};

export const chat = async (req: Request, res: Response) => {
    try {
        const { sessionId, message } = req.body;

        // Store user message
        await prisma.transcript.create({
            data: {
                sessionId,
                sender: 'user',
                text: message
            }
        });

        // Get conversation history
        const history = await prisma.transcript.findMany({
            where: { sessionId },
            orderBy: { timestamp: 'asc' }
        });

        // Build conversation for Gemini
        const conversation = history.map(t => ({
            role: t.sender === 'user' ? 'user' : 'model',
            parts: t.text // String, not array
        }));

        // Get AI response
        const aiResponse = await gemini.generateResponse(conversation, message);

        // Store AI response
        await prisma.transcript.create({
            data: {
                sessionId,
                sender: 'ai',
                text: aiResponse
            }
        });

        res.json({
            success: true,
            data: { message: aiResponse }
        });

    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Failed to process message' });
    }
};

export const endSession = async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.body;

        await prisma.session.update({
            where: { id: sessionId },
            data: {
                status: 'completed',
                score: 85,
                feedback: JSON.stringify({
                    summary: 'Great interview! Strong technical skills demonstrated.',
                    strengths: ['Clear communication', 'Deep technical knowledge'],
                    improvements: ['Could elaborate more on system design trade-offs']
                })
            }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('End session error:', error);
        res.status(500).json({ error: 'Failed to end session' });
    }
};

export const getAccessToken = async (req: Request, res: Response) => {
    try {
        const apiKey = process.env.HUME_API_KEY;
        const secretKey = process.env.HUME_SECRET_KEY;

        if (!apiKey || !secretKey) {
            return res.status(500).json({ error: 'Hume API keys not configured' });
        }

        const accessToken = await fetchAccessToken({
            apiKey,
            secretKey
        });

        res.json({ accessToken });
    } catch (error) {
        console.error('Hume token error:', error);
        res.status(500).json({ error: 'Failed to fetch Hume access token' });
    }
};

export const getUserSessions = async (req: Request, res: Response) => {
    try {
        const userId = req.userId; // From auth middleware

        const sessions = await prisma.session.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });

        res.json({
            success: true,
            data: sessions
        });
    } catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
};

export const getReport = async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;

        const session = await prisma.session.findUnique({
            where: { id: sessionId },
            include: {
                transcript: {
                    orderBy: { timestamp: 'asc' }
                }
            }
        });

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        res.json({
            success: true,
            data: {
                score: session.score,
                feedback: session.feedback,
                transcript: session.transcript,
                createdAt: session.createdAt
            }
        });
    } catch (error) {
        console.error('Get report error:', error);
        res.status(500).json({ error: 'Failed to fetch report' });
    }
};
