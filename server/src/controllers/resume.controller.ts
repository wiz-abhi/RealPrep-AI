import { Request, Response } from 'express';
import prisma from '../db';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/resume/upload
 * Authenticated. Parses PDF/text resume content, stores the full text in
 * Resume.content (RAG chunking removed — see project_sarvam_migration).
 */
export const uploadResume = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        if (!userId) return res.status(401).json({ error: 'Not authenticated' });

        const { content, fileType, fileName, temporary } = req.body || {};
        if (!content) return res.status(400).json({ error: 'Missing content' });

        let textContent: string = content;

        if (fileType === 'application/pdf') {
            try {
                // pdf-parse is CJS — require to avoid ESM interop issues.
                const pdfParse = require('pdf-parse');
                const base64Data = String(content).includes(',')
                    ? String(content).split(',')[1]
                    : String(content);
                const pdfBuffer = Buffer.from(base64Data, 'base64');
                const pdfData = await pdfParse(pdfBuffer);
                textContent = pdfData.text;

                if (!textContent || textContent.trim().length === 0) {
                    return res.status(400).json({ error: 'Could not extract text from PDF' });
                }
            } catch (pdfError) {
                console.error('PDF parsing error:', pdfError);
                return res.status(400).json({ error: 'Failed to parse PDF file' });
            }
        }

        // Cap resume text at ~40KB to keep DB rows sane. Well above a typical resume.
        if (textContent.length > 40000) {
            textContent = textContent.slice(0, 40000);
        }

        const expiresAt = temporary
            ? new Date(Date.now() + 2 * 60 * 60 * 1000)
            : null;

        const resumeId = uuidv4();
        const resume = await prisma.resume.create({
            data: {
                id: resumeId,
                userId,
                content: textContent, // ← Full resume text now inlined (Sarvam migration)
                fileUrl: fileName || 'uploaded-resume',
                skills: [], // populated lazily on interview start
                temporary: !!temporary,
                expiresAt,
            },
        });

        res.json({
            success: true,
            data: {
                id: resume.id,
                skills: ['Analyzing...'],
                message: 'Resume stored successfully',
                temporary: !!temporary,
            },
        });
    } catch (error) {
        console.error('Resume upload error:', error);
        res.status(500).json({ error: 'Failed to process resume' });
    }
};

/**
 * Background task — deletes temporary resumes past their expiry.
 * Also clears any legacy ResumeChunk rows tied to them (safe no-op for
 * new uploads since chunks are no longer written).
 */
export const cleanupExpiredResumes = async () => {
    try {
        const expiredResumes = await prisma.resume.findMany({
            where: {
                temporary: true,
                expiresAt: { lte: new Date() },
            },
            select: { id: true },
        });

        for (const resume of expiredResumes) {
            try {
                await prisma.resumeChunk.deleteMany({ where: { resumeId: resume.id } });
            } catch (err) {
                // Chunks table may be gone in a future migration — non-fatal.
                console.warn('resumeChunk deleteMany warning:', err);
            }
            await prisma.resume.delete({ where: { id: resume.id } });
        }

        if (expiredResumes.length > 0) {
            console.log(`Cleaned up ${expiredResumes.length} expired temporary resumes`);
        }
    } catch (error) {
        console.error('Cleanup error:', error);
    }
};
