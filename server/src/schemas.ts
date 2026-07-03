import { z } from 'zod';

// ── Auth ──
export const registerSchema = z.object({
    email: z.string().email().max(254),
    password: z.string().min(6).max(128),
    name: z.string().min(1).max(100).optional(),
});

export const loginSchema = z.object({
    email: z.string().email().max(254),
    password: z.string().min(1).max(128),
});

export const forgotPasswordSchema = z.object({
    email: z.string().email().max(254),
});

export const resetPasswordSchema = z.object({
    email: z.string().email().max(254),
    token: z.string().min(16).max(256),
    newPassword: z.string().min(6).max(128),
});

// ── Payment ──
export const createOrderSchema = z.object({
    amount: z.number().int().min(1).max(100000), // INR
});

export const verifyPaymentSchema = z.object({
    razorpay_order_id: z.string().min(1).max(128),
    razorpay_payment_id: z.string().min(1).max(128),
    razorpay_signature: z.string().min(1).max(256),
});

// ── Interview ──
export const startSessionSchema = z.object({
    resumeId: z.string().uuid(),
    instructionPrompt: z.string().max(500).optional().nullable(),
    interviewType: z.enum(['technical', 'behavioral', 'systemDesign']).optional(),
    durationMinutes: z.number().int().min(1).max(120).optional(),
    // legacy field some clients still send; ignored server-side
    userId: z.string().optional(),
}).passthrough();

export const chatSchema = z.object({
    sessionId: z.string().uuid(),
    message: z.string().min(1).max(8000),
    emotions: z.array(z.object({ name: z.string(), score: z.number() }).passthrough()).optional(),
}).passthrough();
