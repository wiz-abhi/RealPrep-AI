import { Request, Response } from 'express';
import { GeminiService } from '../services/gemini';
import { RAGService } from '../services/rag';
import prisma from '../db';
import { v4 as uuidv4 } from 'uuid';
const pdfParse = require('pdf-parse');

const gemini = new GeminiService();

export const uploadResume = async (req: Request, res: Response) => {
    try {
        const { content, userId, fileType, fileName } = req.body;

        let textContent = content;

        // Handle PDF files (base64 encoded)
        if (fileType === 'application/pdf') {
            try {
                const pdfParse = require('pdf-parse');
                const base64Data = content.split(',')[1] || content;
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

        // Store in DB (only metadata, NOT full content)
        const resumeId = uuidv4();
        const resume = await prisma.resume.create({
            data: {
                id: resumeId,
                userId: userId || 'mock-user-id',
                content: '', // Empty - we only store chunks
                fileUrl: fileName || 'uploaded-resume',
                skills: [] // Will be populated during interview start
            }
        });

        // Only do RAG Ingestion (chunking + indexing)
        await RAGService.ingestResume(resume.id, textContent);

        res.json({
            success: true,
            data: {
                id: resume.id,
                skills: ['Analyzing...'], // Placeholder for UI
                message: 'Resume indexed successfully'
            }
        });

    } catch (error) {
        console.error('Resume upload error:', error);
        res.status(500).json({ error: 'Failed to process resume' });
    }
};
