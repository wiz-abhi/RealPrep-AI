import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../db';
import { generateToken, hashPassword, comparePassword } from '../utils/auth';
import { sendPasswordResetEmail } from '../services/mailer';

export const register = async (req: Request, res: Response) => {
    try {
        const { email, password, name } = req.body;

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) return res.status(400).json({ error: 'User already exists' });

        const hashedPassword = await hashPassword(password);
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name
            }
        });

        const token = generateToken(user.id);
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, credits: user.credits, role: user.role } });

    } catch (error) {
        res.status(500).json({ error: 'Registration failed' });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(400).json({ error: 'Invalid credentials' });

        const isValid = await comparePassword(password, user.password);
        if (!isValid) return res.status(400).json({ error: 'Invalid credentials' });

        if (user.banned) {
            return res.status(403).json({ error: 'SERVICE_UNAVAILABLE', message: 'We sincerely apologize for the inconvenience. This service is currently unavailable for your account. Please contact support for assistance.' });
        }

        const token = generateToken(user.id);
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, credits: user.credits, role: user.role } });

    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
};

const hashToken = (raw: string) => crypto.createHash('sha256').update(raw).digest('hex');

/**
 * POST /api/auth/forgot-password
 * Always responds 200 with the same message (no email enumeration).
 * If the email exists, a 30-minute single-use token is created and mailed.
 */
export const forgotPassword = async (req: Request, res: Response) => {
    const genericResponse = {
        success: true,
        message: 'If an account exists for that email, a reset link has been sent.'
    };
    try {
        const { email } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.json(genericResponse);

        // Invalidate previous unused tokens for this user.
        await prisma.passwordResetToken.deleteMany({
            where: { userId: user.id, usedAt: null }
        });

        const rawToken = crypto.randomBytes(32).toString('hex');
        await prisma.passwordResetToken.create({
            data: {
                userId: user.id,
                tokenHash: hashToken(rawToken),
                expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            }
        });

        const base = process.env.FRONTEND_URL || 'http://localhost:5173';
        // HashRouter — the route lives after the #.
        const resetUrl = `${base}/#/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;
        await sendPasswordResetEmail(email, resetUrl);

        res.json(genericResponse);
    } catch (error) {
        console.error('Forgot password error:', error);
        // Still generic — never leak whether the account exists.
        res.json(genericResponse);
    }
};

/**
 * POST /api/auth/reset-password
 * Body: { email, token, newPassword }
 */
export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { email, token, newPassword } = req.body;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(400).json({ error: 'Invalid or expired reset link' });

        const record = await prisma.passwordResetToken.findUnique({
            where: { tokenHash: hashToken(token) }
        });

        if (
            !record ||
            record.userId !== user.id ||
            record.usedAt ||
            record.expiresAt < new Date()
        ) {
            return res.status(400).json({ error: 'Invalid or expired reset link' });
        }

        const hashedPassword = await hashPassword(newPassword);
        await prisma.$transaction([
            prisma.user.update({
                where: { id: user.id },
                data: { password: hashedPassword }
            }),
            prisma.passwordResetToken.update({
                where: { id: record.id },
                data: { usedAt: new Date() }
            }),
        ]);

        res.json({ success: true, message: 'Password updated. You can now log in.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
};
