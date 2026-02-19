import { Request, Response, NextFunction } from 'express';
import prisma from '../db';

/**
 * Middleware: Require admin role.
 * Must be used AFTER authenticateToken so req.userId is set.
 */
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            select: { role: true }
        });

        if (!user || user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        next();
    } catch (error) {
        console.error('Admin middleware error:', error);
        res.status(500).json({ error: 'Authorization check failed' });
    }
};
