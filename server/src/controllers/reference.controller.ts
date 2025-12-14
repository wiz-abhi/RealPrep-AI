import { Request, Response } from 'express';
import { RAGService } from '../services/rag';
import prisma from '../db';
import { v4 as uuidv4 } from 'uuid';

export const uploadReference = async (req: Request, res: Response) => {
    try {
        const { title, content, type } = req.body;
        // type: 'SamplePaper' | 'JobDescription'

        // 1. Store in DB (Metadata)
        // Note: In schema, we simply used ReferenceDoc model which stores embedding + content.
        // We might want to just rely on RAGService to do the insertion since schema implies chunk-level storage?
        // Let's check schema. ReferenceDoc has content + embedding. 
        // If we want to store the "original" doc, we might need a parent model, but for now 
        // let's follow the simple pattern: We ingest the whole text, RAGService chunks it and stores multiple ReferenceDocs rows?
        // Wait, schema.prisma check:
        // model ReferenceDoc { id, title, content, type, embedding ... }
        // This looks like 1 row = 1 chunk usually. 
        // Let's adjust RAGService to handle "Parent Doc" vs "Chunks" if needed, 
        // or just treat every upload as a single "Doc" if it's small, OR split it.
        // Looking at RAGService.ingestReferenceDoc:
        // it calls chunkText, then inserts multiple rows into ReferenceDoc.
        // So "ReferenceDoc" table is actually "ReferenceChunk" table in practice.

        await RAGService.ingestReferenceDoc(title, content, type || 'Resource');

        res.json({
            success: true,
            message: 'Reference document processed and indexed.'
        });

    } catch (error) {
        console.error('Reference upload error:', error);
        res.status(500).json({ error: 'Failed to process reference document' });
    }
};
