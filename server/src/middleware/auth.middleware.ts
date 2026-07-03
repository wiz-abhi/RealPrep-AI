import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const FALLBACK_SECRET = 'dev_secret_do_not_use_in_prod';

// Refuse to serve if we're in production without a real JWT_SECRET.
// (index.ts also checks; this is defense-in-depth for imports outside the main bootstrap.)
if (
    process.env.NODE_ENV === 'production' &&
    (!process.env.JWT_SECRET || process.env.JWT_SECRET === FALLBACK_SECRET)
) {
    console.error('FATAL: JWT_SECRET is not set in production. Refusing to serve.');
    process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET || FALLBACK_SECRET;

// Extend Express Request
declare global {
    namespace Express {
        interface Request {
            userId?: string;
        }
    }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) return res.sendStatus(403);
        req.userId = user.userId;
        next();
    });
};
