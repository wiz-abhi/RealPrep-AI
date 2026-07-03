import { Request, Response } from 'express';

/**
 * Reference-doc ingestion is temporarily disabled during the Sarvam migration.
 * Reason: Sarvam has no embeddings API, so the previous pgvector-based path
 * no longer works. Resumes are now inlined directly (see IMPROVEMENT_PLAN.md
 * Phase 0.3); a proper reference-doc retrieval path will return later using a
 * local embedding model like all-MiniLM-L6-v2 via @xenova/transformers.
 */
export const uploadReference = async (_req: Request, res: Response) => {
    res.status(501).json({
        error: 'Reference doc ingestion is temporarily disabled during migration',
    });
};
