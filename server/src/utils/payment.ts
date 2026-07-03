import crypto from 'crypto';

export const CREDITS_PER_RUPEE = 2;

/**
 * Verify a Razorpay payment signature.
 * signature = HMAC-SHA256(orderId + "|" + paymentId, keySecret)
 */
export const verifyRazorpaySignature = (
    orderId: string,
    paymentId: string,
    signature: string,
    keySecret: string
): boolean => {
    if (!orderId || !paymentId || !signature || !keySecret) return false;
    const expected = crypto
        .createHmac('sha256', keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');
    // Constant-time compare to avoid timing side-channels.
    if (expected.length !== signature.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
};

/** Credits for a paise amount (Razorpay orders store amounts in paise). */
export const creditsForPaise = (paise: number): number => {
    if (!Number.isFinite(paise) || paise <= 0) return 0;
    return Math.floor(paise / 100) * CREDITS_PER_RUPEE;
};
