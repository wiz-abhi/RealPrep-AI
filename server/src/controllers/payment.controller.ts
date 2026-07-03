import { Request, Response } from 'express';
import Razorpay from 'razorpay';
import { prisma } from '../db';
import { verifyRazorpaySignature, creditsForPaise, CREDITS_PER_RUPEE } from '../utils/payment';

let razorpayInstance: Razorpay | null = null;
function getRazorpay() {
    if (!razorpayInstance) {
        razorpayInstance = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID!,
            key_secret: process.env.RAZORPAY_KEY_SECRET!
        });
    }
    return razorpayInstance;
}

// Create a Razorpay order
export const createOrder = async (req: Request, res: Response) => {
    try {
        const { amount } = req.body; // amount in INR (rupees), validated by Zod

        const credits = amount * CREDITS_PER_RUPEE;

        const order = await getRazorpay().orders.create({
            amount: amount * 100, // Razorpay expects paise
            currency: 'INR',
            receipt: `cr_${req.userId!.slice(-8)}_${Date.now().toString(36)}`,
            notes: {
                userId: req.userId!,
                credits: credits.toString(),
                amountINR: amount.toString()
            }
        });

        res.json({
            success: true,
            data: {
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                credits
            }
        });
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({ error: 'Failed to create payment order' });
    }
};

// Verify payment and credit the user
export const verifyPayment = async (req: Request, res: Response) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!verifyRazorpaySignature(
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            process.env.RAZORPAY_KEY_SECRET!
        )) {
            return res.status(400).json({ error: 'Invalid payment signature' });
        }

        // Credits come from the ORDER as recorded server-side — never from the
        // client body (a client could otherwise pay ₹1 and claim ₹1000).
        const order: any = await getRazorpay().orders.fetch(razorpay_order_id);

        if (!order) {
            return res.status(400).json({ error: 'Order not found' });
        }
        if (order.notes?.userId && order.notes.userId !== req.userId) {
            return res.status(403).json({ error: 'Order belongs to a different user' });
        }

        const credits = creditsForPaise(Number(order.amount));
        if (credits <= 0) {
            return res.status(400).json({ error: 'Invalid credit amount' });
        }

        // Idempotency: refuse to credit the same payment twice.
        const alreadyCredited = order.notes?.credited === 'true';
        if (alreadyCredited) {
            return res.status(409).json({ error: 'Payment already credited' });
        }
        try {
            await getRazorpay().orders.edit(razorpay_order_id, {
                notes: { ...order.notes, credited: 'true', paymentId: razorpay_payment_id }
            });
        } catch (e) {
            // Notes update is best-effort; log but don't block crediting.
            console.warn('Failed to mark order as credited:', e);
        }

        const user = await prisma.user.update({
            where: { id: req.userId },
            data: { credits: { increment: credits } },
            select: { credits: true }
        });

        res.json({
            success: true,
            data: {
                creditsAdded: credits,
                totalCredits: user.credits,
                paymentId: razorpay_payment_id
            }
        });
    } catch (error) {
        console.error('Verify payment error:', error);
        res.status(500).json({ error: 'Failed to verify payment' });
    }
};
