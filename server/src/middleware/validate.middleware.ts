import { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';

/**
 * Validate req.body against a Zod schema. On failure, respond 400 with the
 * first issue's message (client-friendly), never the raw Zod error object.
 */
export const validateBody = (schema: ZodType<any>) =>
    (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            const first = result.error.issues[0];
            const path = first?.path?.join('.') || 'body';
            return res.status(400).json({ error: `Invalid ${path}: ${first?.message || 'validation failed'}` });
        }
        req.body = result.data;
        next();
    };
