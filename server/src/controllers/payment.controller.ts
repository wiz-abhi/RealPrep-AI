import { Request, Response } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { prisma } from '../db';

const CREDITS_PER_RUPEE = 2;

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
        const { amount } = req.body; // amount in INR (rupees)

        if (!amount || typeof amount !== 'number' || amount < 1) {
            return res.status(400).json({ error: 'Amount must be at least ₹1' });
        }

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
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ error: 'Missing payment details' });
        }

        // Verify signature
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
            .update(body)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ error: 'Invalid payment signature' });
        }

        // Calculate credits from the amount (amount is in rupees)
        const credits = (amount || 0) * CREDITS_PER_RUPEE;

        if (credits <= 0) {
            return res.status(400).json({ error: 'Invalid credit amount' });
        }

        // Add credits to user
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
