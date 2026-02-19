import { Request, Response } from 'express';
import prisma from '../db';

/**
 * GET /api/admin/users
 * List all registered users with their credits, role, and session count.
 */
export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                email: true,
                credits: true,
                role: true,
                banned: true,
                createdAt: true,
                _count: {
                    select: { sessions: true }
                }
            }
        });

        const formatted = users.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            credits: u.credits,
            role: u.role,
            banned: u.banned,
            createdAt: u.createdAt,
            sessionCount: u._count.sessions
        }));

        res.json({ success: true, data: formatted });
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

/**
 * PUT /api/admin/users/:userId/credits
 * Update a user's credit balance.
 * Body: { credits: number }
 */
export const updateUserCredits = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const { credits } = req.body;

        if (typeof credits !== 'number' || credits < 0) {
            return res.status(400).json({ error: 'Credits must be a non-negative number' });
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: { credits },
            select: {
                id: true,
                name: true,
                email: true,
                credits: true
            }
        });

        res.json({ success: true, data: user });
    } catch (error) {
        console.error('Update credits error:', error);
        res.status(500).json({ error: 'Failed to update credits' });
    }
};

/**
 * PUT /api/admin/users/:userId/ban
 * Toggle a user's banned status.
 * Body: { banned: boolean }
 */
export const toggleBanUser = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const { banned } = req.body;

        if (typeof banned !== 'boolean') {
            return res.status(400).json({ error: 'banned must be a boolean' });
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: { banned },
            select: { id: true, banned: true }
        });

        res.json({ success: true, data: user });
    } catch (error) {
        console.error('Toggle ban error:', error);
        res.status(500).json({ error: 'Failed to update ban status' });
    }
};
