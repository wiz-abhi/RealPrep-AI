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
        const { userId, resumeId, instructionPrompt, interviewType = 'technical', durationMinutes = 30 } = req.body;

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
        })) as { name: string | null } | null;
        const userName = user?.name || 'there';

        // Retrieve relevant context from RAG
        const query = instructionPrompt || "Tell me about your skills and experience";
        const ragContext = await RAGService.retrieveContext(resumeId, query, 5);

        // Extract skills from RAG context if not already present
        let skills = resume.skills as string[];
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
        const startedAt = new Date().toISOString();
        const session = await retryDbOperation(() => prisma.session.create({
            data: {
                userId,
                type: interviewType.charAt(0).toUpperCase() + interviewType.slice(1),
                status: 'active',
                score: 0,
                feedback: {
                    systemInstruction,
                    resumeContext: ragContext,
                    skills,
                    startedAt,
                    durationMinutes: Number(durationMinutes)
                }
            }
        }));

        // Store AI's initial greeting in transcript
        await retryDbOperation(() => prisma.transcript.create({
            data: {
                sessionId: (session as { id: string }).id,
                sender: 'ai',
                text: initialMessage,
                timestamp: new Date()
            }
        }));

        res.json({
            success: true,
            data: {
                sessionId: (session as { id: string }).id,
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

// Get session details for resuming an interview
export const getSession = async (req: Request, res: Response) => {
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

        const feedback = session.feedback as any;

        res.json({
            success: true,
            data: {
                sessionId: session.id,
                status: session.status,
                type: session.type,
                startedAt: feedback?.startedAt || session.createdAt.toISOString(),
                durationMinutes: feedback?.durationMinutes || 30,
                transcript: session.transcript.map((t: { sender: string; text: string; timestamp: Date }) => ({
                    sender: t.sender,
                    text: t.text,
                    timestamp: t.timestamp
                })),
                skills: feedback?.skills || [],
                interviewType: session.type
            }
        });
    } catch (error) {
        console.error('Get session error:', error);
        res.status(500).json({ error: 'Failed to get session' });
    }
};

// Update session duration (for PreJoinPage override)
export const updateSessionDuration = async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const { durationMinutes } = req.body;

        const session = await prisma.session.findUnique({
            where: { id: sessionId }
        });

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const currentFeedback = (session.feedback as any) || {};

        // Update feedback with new duration and reset startedAt to now
        const updatedFeedback = {
            ...currentFeedback,
            durationMinutes: Number(durationMinutes),
            startedAt: new Date().toISOString() // Reset start time when duration changes
        };

        await prisma.session.update({
            where: { id: sessionId },
            data: { feedback: updatedFeedback }
        });

        res.json({
            success: true,
            message: 'Duration updated',
            data: { durationMinutes: Number(durationMinutes) }
        });
    } catch (error) {
        console.error('Update duration error:', error);
        res.status(500).json({ error: 'Failed to update duration' });
    }
};

export const chat = async (req: Request, res: Response) => {
    try {
        const { sessionId, message, emotions } = req.body;
        const userGeminiKey = req.headers['x-user-gemini-key'] as string | undefined;

        // Get session with system instruction
        const session = await prisma.session.findUnique({
            where: { id: sessionId }
        });

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Store emotions in session feedback for later analysis
        if (emotions && emotions.length > 0) {
            const currentFeedback = (session.feedback as any) || {};
            const emotionHistory = currentFeedback.emotionHistory || [];
            emotionHistory.push({
                timestamp: new Date().toISOString(),
                emotions: emotions.slice(0, 5) // Store top 5 emotions
            });
            await prisma.session.update({
                where: { id: sessionId },
                data: {
                    feedback: { ...currentFeedback, emotionHistory }
                }
            });
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
        let conversation = history.slice(0, -1).map((t: { sender: string; text: string }) => ({
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

        // Get AI response with system instruction (use user's key if provided)
        const aiResponse = await gemini.generateInterviewResponse(
            systemInstruction + emotionContext,
            conversation,
            message,
            userGeminiKey // Pass user's custom key if available
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

        // Get session to retrieve emotion history
        const session = await prisma.session.findUnique({
            where: { id: sessionId }
        });

        // Get all transcripts
        const transcripts = await prisma.transcript.findMany({
            where: { sessionId },
            orderBy: { timestamp: 'asc' }
        });

        // Analyze emotion history
        const sessionFeedback = (session?.feedback as any) || {};
        const emotionHistory = sessionFeedback.emotionHistory || [];

        // Calculate emotional analysis
        let emotionalAnalysis = {
            averageConfidence: 0,
            averageNervousness: 0,
            stressPoints: 0,
            emotionTrend: 'stable' as string,
            dominantEmotions: [] as string[]
        };

        if (emotionHistory.length > 0) {
            const allEmotions: Record<string, number[]> = {};
            emotionHistory.forEach((entry: any) => {
                entry.emotions?.forEach((e: any) => {
                    if (!allEmotions[e.name]) allEmotions[e.name] = [];
                    allEmotions[e.name].push(e.score);
                });
            });

            // Calculate averages
            const avgScores: Record<string, number> = {};
            Object.entries(allEmotions).forEach(([name, scores]) => {
                avgScores[name] = scores.reduce((a, b) => a + b, 0) / scores.length;
            });

            emotionalAnalysis.averageConfidence = Math.round((avgScores['Joy'] || 0) * 100);
            emotionalAnalysis.averageNervousness = Math.round(((avgScores['Fear'] || 0) + (avgScores['Anxiety'] || 0)) * 50);
            emotionalAnalysis.stressPoints = emotionHistory.filter((e: any) =>
                e.emotions?.some((em: any) => (em.name === 'Fear' || em.name === 'Anxiety') && em.score > 0.3)
            ).length;

            // Get dominant emotions
            const sortedEmotions = Object.entries(avgScores)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([name, score]) => `${name} (${Math.round(score * 100)}%)`);
            emotionalAnalysis.dominantEmotions = sortedEmotions;

            // Determine trend
            if (emotionHistory.length >= 3) {
                const firstHalf = emotionHistory.slice(0, Math.floor(emotionHistory.length / 2));
                const secondHalf = emotionHistory.slice(Math.floor(emotionHistory.length / 2));
                const getAvgStress = (entries: any[]) => {
                    let total = 0, count = 0;
                    entries.forEach(e => e.emotions?.forEach((em: any) => {
                        if (em.name === 'Fear' || em.name === 'Anxiety') { total += em.score; count++; }
                    }));
                    return count > 0 ? total / count : 0;
                };
                const firstStress = getAvgStress(firstHalf);
                const secondStress = getAvgStress(secondHalf);
                if (secondStress < firstStress - 0.1) emotionalAnalysis.emotionTrend = 'improving';
                else if (secondStress > firstStress + 0.1) emotionalAnalysis.emotionTrend = 'declining';
            }
        }

        // Generate evaluation
        const conversationText = transcripts.map((t: { sender: string; text: string }) =>
            `${t.sender === 'user' ? 'Candidate' : 'Interviewer'}: ${t.text}`
        ).join('\n\n');

        const emotionSummary = emotionHistory.length > 0
            ? `\n\nEMOTIONAL DATA:\n- Dominant emotions: ${emotionalAnalysis.dominantEmotions.join(', ')}\n- Stress points detected: ${emotionalAnalysis.stressPoints}\n- Overall trend: ${emotionalAnalysis.emotionTrend}`
            : '';

        const evaluationPrompt = `Evaluate this interview transcript and provide a score from 0-100 and detailed feedback.

TRANSCRIPT:
${conversationText}${emotionSummary}

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

        // Add emotional analysis to evaluation
        evaluation.emotionalAnalysis = emotionalAnalysis;

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

// End session without generating AI report (to save Gemini tokens)
export const endSessionWithoutReport = async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.body;

        // Just mark session as completed without AI evaluation
        await prisma.session.update({
            where: { id: sessionId },
            data: {
                status: 'completed',
                score: 0,
                feedback: {
                    summary: 'Interview completed without AI evaluation',
                    strengths: [],
                    improvements: [],
                    noReport: true
                }
            }
        });

        res.json({
            success: true,
            data: { message: 'Session closed without report' }
        });

    } catch (error) {
        console.error('End session error:', error);
        res.status(500).json({ error: 'Failed to end session' });
    }
};

// Generate detailed improvement plan based on interview performance and emotions
export const generateImprovementPlan = async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.body;

        // Get session with feedback and transcript
        const session = await prisma.session.findUnique({
            where: { id: sessionId }
        });

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const transcripts = await prisma.transcript.findMany({
            where: { sessionId },
            orderBy: { timestamp: 'asc' }
        });

        const feedback = session.feedback as any;
        const emotionalAnalysis = feedback?.emotionalAnalysis || {};
        const emotionHistory = feedback?.emotionHistory || [];

        // Build context for improvement plan
        const conversationText = transcripts.map((t: { sender: string; text: string }) =>
            `${t.sender === 'user' ? 'Candidate' : 'Interviewer'}: ${t.text}`
        ).join('\n\n');

        const emotionalContext = emotionHistory.length > 0 ? `
EMOTIONAL ANALYSIS:
- Dominant Emotions: ${emotionalAnalysis.dominantEmotions?.join(', ') || 'Not available'}
- Average Confidence: ${emotionalAnalysis.averageConfidence || 0}%
- Nervousness Level: ${emotionalAnalysis.averageNervousness || 0}%
- Stress Points Detected: ${emotionalAnalysis.stressPoints || 0}
- Emotional Trend: ${emotionalAnalysis.emotionTrend || 'stable'}
` : '';

        const performanceContext = `
PERFORMANCE SCORES:
- Overall Score: ${session.score || 0}/100
- Technical Accuracy: ${feedback?.technicalAccuracy || 'N/A'}
- Communication Skills: ${feedback?.communicationSkills || 'N/A'}
- Problem Solving: ${feedback?.problemSolving || 'N/A'}

STRENGTHS: ${feedback?.strengths?.join(', ') || 'None identified'}
AREAS FOR IMPROVEMENT: ${feedback?.improvements?.join(', ') || 'None identified'}
`;

        const improvementPrompt = `Based on this interview data, create a comprehensive and personalized improvement plan.

INTERVIEW TRANSCRIPT:
${conversationText}

${performanceContext}
${emotionalContext}

Create a detailed improvement plan in JSON format:
{
    "technicalPlan": {
        "gaps": ["<specific topic/skill gap 1>", "<gap 2>"],
        "resources": ["<recommended resource 1>", "<resource 2>"],
        "practiceExercises": ["<exercise 1>", "<exercise 2>"],
        "timeline": "<suggested learning timeline>"
    },
    "communicationPlan": {
        "currentLevel": "<brief assessment>",
        "improvements": ["<specific improvement 1>", "<improvement 2>"],
        "techniques": ["<technique to practice 1>", "<technique 2>"]
    },
    "emotionalReadiness": {
        "stressManagement": ["<tip 1>", "<tip 2>"],
        "confidenceBuilding": ["<strategy 1>", "<strategy 2>"],
        "interviewAnxiety": ["<coping mechanism 1>", "<mechanism 2>"]
    },
    "actionItems": [
        {"task": "<specific task>", "priority": "high|medium|low", "deadline": "<suggested timeframe>"},
        {"task": "<task 2>", "priority": "high|medium|low", "deadline": "<timeframe>"}
    ],
    "overallAdvice": "<personalized motivational advice based on their performance>"
}`;

        const planText = await reportGemini.generateText(improvementPrompt);
        let improvementPlan;
        try {
            improvementPlan = JSON.parse(planText);
        } catch {
            improvementPlan = {
                technicalPlan: { gaps: ['Unable to generate detailed analysis'], resources: [], practiceExercises: [], timeline: '2-4 weeks' },
                communicationPlan: { currentLevel: 'Needs review', improvements: [], techniques: [] },
                emotionalReadiness: { stressManagement: [], confidenceBuilding: [], interviewAnxiety: [] },
                actionItems: [],
                overallAdvice: 'Keep practicing and stay confident!'
            };
        }

        res.json({
            success: true,
            data: improvementPlan
        });

    } catch (error) {
        console.error('Generate improvement plan error:', error);
        res.status(500).json({ error: 'Failed to generate improvement plan' });
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

        const sessionIds = sessions.map((s: { id: string }) => s.id);

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
