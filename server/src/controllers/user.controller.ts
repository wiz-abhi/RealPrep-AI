import { Request, Response } from 'express';
import prisma from '../db';
import bcrypt from 'bcryptjs';

export const getProfile = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
};

export const getStats = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;

        // Get total interviews
        const sessions = await prisma.session.findMany({
            where: { userId }
        });

        const totalInterviews = sessions.length;
        const completedSessions = sessions.filter((s: { status: string }) => s.status === 'completed');
        const averageScore = completedSessions.length > 0
            ? Math.round(completedSessions.reduce((sum: number, s: { score: number | null }) => sum + (s.score || 0), 0) / completedSessions.length)
            : 0;

        // Get top skills from resumes
        const resumes = await prisma.resume.findMany({
            where: { userId },
            select: { skills: true }
        });

        const allSkills = resumes.flatMap((r: { skills: string[] }) => r.skills);
        const skillCounts = allSkills.reduce((acc: Record<string, number>, skill: string) => {
            acc[skill] = (acc[skill] || 0) + 1;
            return acc;
        }, {});

        const topSkills = Object.entries(skillCounts)
            .sort(([, a]: any, [, b]: any) => b - a)
            .slice(0, 5)
            .map(([skill]) => skill);

        res.json({
            success: true,
            data: {
                totalInterviews,
                averageScore,
                topSkills
            }
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
};

export const listResumes = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;

        const resumes = await prisma.resume.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                fileUrl: true,
                skills: true,
                createdAt: true
            }
        });

        res.json({
            success: true,
            data: resumes
        });
    } catch (error) {
        console.error('List resumes error:', error);
        res.status(500).json({ error: 'Failed to fetch resumes' });
    }
};

export const deleteResume = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        const { resumeId } = req.params;

        // Verify ownership
        const resume = await prisma.resume.findFirst({
            where: {
                id: resumeId,
                userId
            }
        });

        if (!resume) {
            return res.status(404).json({ error: 'Resume not found' });
        }

        // Delete resume and associated chunks
        await prisma.resumeChunk.deleteMany({
            where: { resumeId }
        });

        await prisma.resume.delete({
            where: { id: resumeId }
        });

        res.json({
            success: true,
            message: 'Resume deleted successfully'
        });
    } catch (error) {
        console.error('Delete resume error:', error);
        res.status(500).json({ error: 'Failed to delete resume' });
    }
};

export const changePassword = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        const { currentPassword, newPassword } = req.body;

        // Get user
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify current password
        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
};

export const updateSettings = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        const { emailNotifications, interviewReminders } = req.body;

        // For now, just return success
        // In production, you'd store these preferences in the database
        res.json({
            success: true,
            message: 'Settings updated successfully'
        });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
};

export const deleteAccount = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;

        // Delete all user data
        await prisma.transcript.deleteMany({
            where: { session: { userId } }
        });

        await prisma.session.deleteMany({
            where: { userId }
        });

        await prisma.resumeChunk.deleteMany({
            where: { resume: { userId } }
        });

        await prisma.resume.deleteMany({
            where: { userId }
        });

        await prisma.user.delete({
            where: { id: userId }
        });

        res.json({
            success: true,
            message: 'Account deleted successfully'
        });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ error: 'Failed to delete account' });
    }
};
