import { Request, Response } from 'express';
import { RAGService } from '../services/rag';
import { GeminiService, INTERVIEWER_PERSONAS } from '../services/gemini';
import prisma from '../db';
import { v4 as uuidv4 } from 'uuid';
import { fetchAccessToken } from 'hume';

const gemini = new GeminiService('gemini-3-flash-preview');
const reportGemini = new GeminiService('gemini-2.5-flash-lite');

// Helper for DB retry
const retryDbOperation = async <T>(operation: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
    try {
        return await operation();
    } catch (error: any) {
        if (retries > 0 && (error.code === 'P1001' || error.code === 'P2024')) {
            console.warn(`DB Error ${error.code}. Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return retryDbOperation(operation, retries - 1, delay * 2);
        }
        throw error;
    }
};

// Build system instruction with resume context
const buildSystemInstruction = (persona: string, resumeContext: string, skills: string[], interviewType: string) => {
    const basePersona = INTERVIEWER_PERSONAS[interviewType as keyof typeof INTERVIEWER_PERSONAS] || INTERVIEWER_PERSONAS.technical;

    return `${basePersona}

CANDIDATE CONTEXT:
The candidate has the following skills: ${skills.join(', ')}

Resume highlights:
${resumeContext}

INTERVIEW FOCUS:
${persona || 'Conduct a comprehensive technical interview covering their skills and experience.'}

Remember: You are conducting a real interview. Be conversational, ask follow-up questions, and adapt based on their responses.`;
};

export const startSession = async (req: Request, res: Response) => {
    try {
        const { userId, resumeId, instructionPrompt, interviewType = 'technical' } = req.body;

        if (!userId || !resumeId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Get resume
        const resume = await retryDbOperation(() => prisma.resume.findUnique({
            where: { id: resumeId }
        }));

        if (!resume) {
            return res.status(404).json({ error: 'Resume not found' });
        }

        // Get user's name for personalized greeting
        const user = await retryDbOperation(() => prisma.user.findUnique({
            where: { id: userId },
            select: { name: true }
        }));
        const userName = user?.name || 'there';

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

                await retryDbOperation(() => prisma.resume.update({
                    where: { id: resumeId },
                    data: { skills }
                }));
            } catch (error) {
                console.error('Skill extraction error:', error);
                skills = ['Communication', 'Problem Solving', 'Technical Skills'];
            }
        }

        // Build system instruction
        const systemInstruction = buildSystemInstruction(
            instructionPrompt,
            ragContext,
            skills,
            interviewType
        );

        // Generate AI's opening greeting (AI speaks first!)
        const candidateContext = `
Candidate Name: ${userName}
Skills: ${skills.join(', ')}
Resume Summary: ${ragContext.substring(0, 500)}...
Interview Type: ${interviewType}
Focus: ${instructionPrompt || 'General technical interview'}
`;

        const initialMessage = await gemini.generateInitialGreeting(systemInstruction, candidateContext);

        // Create session with system instruction stored
        const session = await retryDbOperation(() => prisma.session.create({
            data: {
                userId,
                type: interviewType.charAt(0).toUpperCase() + interviewType.slice(1),
                status: 'active',
                score: 0,
                feedback: {
                    systemInstruction,
                    resumeContext: ragContext,
                    skills
                }
            }
        }));

        // Store AI's initial greeting in transcript
        await retryDbOperation(() => prisma.transcript.create({
            data: {
                sessionId: session.id,
                sender: 'ai',
                text: initialMessage,
                timestamp: new Date()
            }
        }));

        res.json({
            success: true,
            data: {
                sessionId: session.id,
                initialMessage, // AI speaks first!
                agentArgs: {
                    initialMessage,
                    skills,
                    instructionPrompt,
                    interviewType
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
        const { sessionId, message, emotions } = req.body;

        // Get session with system instruction
        const session = await prisma.session.findUnique({
            where: { id: sessionId }
        });

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Store user message
        await retryDbOperation(() => prisma.transcript.create({
            data: {
                sessionId,
                sender: 'user',
                text: message
            }
        }));

        // Get conversation history
        const history = await prisma.transcript.findMany({
            where: { sessionId },
            orderBy: { timestamp: 'asc' }
        });

        // Build conversation for Gemini (excluding the just-added user message since we'll send it separately)
        let conversation = history.slice(0, -1).map(t => ({
            role: t.sender === 'user' ? 'user' : 'model',
            parts: t.text
        }));

        // Remove leading 'model' messages (Gemini requires first message to be 'user')
        while (conversation.length > 0 && conversation[0].role === 'model') {
            conversation.shift();
        }

        // Get system instruction from session feedback
        const feedback = session.feedback as any;
        const systemInstruction = feedback?.systemInstruction || INTERVIEWER_PERSONAS.technical;

        // Add emotion context if available
        let emotionContext = '';
        if (emotions && emotions.length > 0) {
            const topEmotions = emotions.slice(0, 3).map((e: any) => `${e.name}: ${Math.round(e.score * 100)}%`).join(', ');
            emotionContext = `\n\n[Candidate's current emotional state: ${topEmotions}. Adapt your tone accordingly.]`;
        }

        // Get AI response with system instruction
        const aiResponse = await gemini.generateInterviewResponse(
            systemInstruction + emotionContext,
            conversation,
            message
        );

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
            data: { response: aiResponse }
        });

    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Failed to process message' });
    }
};

export const endSession = async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.body;

        // Get all transcripts
        const transcripts = await prisma.transcript.findMany({
            where: { sessionId },
            orderBy: { timestamp: 'asc' }
        });

        // Generate evaluation
        const conversationText = transcripts.map(t =>
            `${t.sender === 'user' ? 'Candidate' : 'Interviewer'}: ${t.text}`
        ).join('\n\n');

        const evaluationPrompt = `Evaluate this interview transcript and provide a score from 0-100 and detailed feedback.

TRANSCRIPT:
${conversationText}

Provide your response as JSON:
{
    "score": <number 0-100>,
    "summary": "<brief overall assessment>",
    "strengths": ["<strength 1>", "<strength 2>"],
    "improvements": ["<area 1>", "<area 2>"],
    "technicalAccuracy": <number 0-100>,
    "communicationSkills": <number 0-100>,
    "problemSolving": <number 0-100>
}`;

        const evaluationText = await reportGemini.generateText(evaluationPrompt);
        let evaluation;
        try {
            evaluation = JSON.parse(evaluationText);
        } catch {
            evaluation = { score: 70, summary: 'Interview completed', strengths: [], improvements: [] };
        }

        // Update session
        await prisma.session.update({
            where: { id: sessionId },
            data: {
                status: 'completed',
                score: evaluation.score,
                feedback: evaluation
            }
        });

        res.json({
            success: true,
            data: evaluation
        });

    } catch (error) {
        console.error('End session error:', error);
        res.status(500).json({ error: 'Failed to end session' });
    }
};

export const getUserSessions = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;

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

export const clearHistory = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;

        const sessions = await prisma.session.findMany({
            where: { userId },
            select: { id: true }
        });

        const sessionIds = sessions.map(s => s.id);

        await prisma.transcript.deleteMany({
            where: { sessionId: { in: sessionIds } }
        });

        await prisma.session.deleteMany({
            where: { userId }
        });

        res.json({ success: true, message: 'History cleared' });
    } catch (error) {
        console.error('Clear history error:', error);
        res.status(500).json({ error: 'Failed to clear history' });
    }
};

export const getAccessToken = async (req: Request, res: Response) => {
    try {
        const accessToken = await fetchAccessToken({
            apiKey: process.env.HUME_API_KEY!,
            secretKey: process.env.HUME_SECRET_KEY!
        });
        res.json({ accessToken });
    } catch (error) {
        console.error('Hume token error:', error);
        res.status(500).json({ error: 'Failed to get Hume token' });
    }
};
