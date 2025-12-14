import { Request, Response } from 'express';
import prisma from '../db';
import { generateToken, hashPassword, comparePassword } from '../utils/auth';

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
        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });

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

        const token = generateToken(user.id);
        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });

    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
};
