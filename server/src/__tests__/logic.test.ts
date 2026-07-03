import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    sanitizeUserPrompt,
    computeRemainingSeconds,
    computePhaseInfo,
} from '../controllers/interview.controller';
import { verifyRazorpaySignature, creditsForPaise, CREDITS_PER_RUPEE } from '../utils/payment';
import crypto from 'crypto';

// ── sanitizeUserPrompt ──
describe('sanitizeUserPrompt', () => {
    it('returns empty string for null/undefined', () => {
        expect(sanitizeUserPrompt(null)).toBe('');
        expect(sanitizeUserPrompt(undefined)).toBe('');
    });

    it('strips control characters', () => {
        expect(sanitizeUserPrompt('hello\x00world\x1F!')).toBe('hello world !');
    });

    it('caps length at maxLen', () => {
        const long = 'a'.repeat(1000);
        expect(sanitizeUserPrompt(long, 500)).toHaveLength(500);
    });

    it('trims whitespace', () => {
        expect(sanitizeUserPrompt('  focus on DSA  ')).toBe('focus on DSA');
    });
});

// ── computeRemainingSeconds (server-authoritative timer + pause math) ──
describe('computeRemainingSeconds', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    const at = (iso: string) => new Date(iso).getTime();

    it('computes remaining from startedAt + duration', () => {
        vi.setSystemTime(at('2026-01-01T10:10:00Z')); // 10 min elapsed
        const { remainingSeconds, totalDurationSeconds } = computeRemainingSeconds({
            startedAt: '2026-01-01T10:00:00Z',
            durationMinutes: 30,
        });
        expect(totalDurationSeconds).toBe(1800);
        expect(remainingSeconds).toBe(1200);
    });

    it('never goes below zero', () => {
        vi.setSystemTime(at('2026-01-01T12:00:00Z')); // way past the end
        const { remainingSeconds } = computeRemainingSeconds({
            startedAt: '2026-01-01T10:00:00Z',
            durationMinutes: 30,
        });
        expect(remainingSeconds).toBe(0);
    });

    it('excludes accumulated paused time (pausedMs)', () => {
        vi.setSystemTime(at('2026-01-01T10:10:00Z'));
        const { remainingSeconds } = computeRemainingSeconds({
            startedAt: '2026-01-01T10:00:00Z',
            durationMinutes: 30,
            pausedMs: 5 * 60 * 1000, // 5 min paused earlier
        });
        // 10 min wall clock - 5 min paused = 5 min consumed → 25 min left
        expect(remainingSeconds).toBe(1500);
    });

    it('excludes a currently-open pause window (pausedAt)', () => {
        vi.setSystemTime(at('2026-01-01T10:10:00Z'));
        const { remainingSeconds } = computeRemainingSeconds({
            startedAt: '2026-01-01T10:00:00Z',
            durationMinutes: 30,
            pausedAt: '2026-01-01T10:06:00Z', // paused 4 min ago, still paused
        });
        // 10 min wall clock - 4 min open pause = 6 min consumed → 24 min left
        expect(remainingSeconds).toBe(1440);
    });

    it('combines accumulated and open pauses', () => {
        vi.setSystemTime(at('2026-01-01T10:20:00Z'));
        const { remainingSeconds } = computeRemainingSeconds({
            startedAt: '2026-01-01T10:00:00Z',
            durationMinutes: 30,
            pausedMs: 3 * 60 * 1000,
            pausedAt: '2026-01-01T10:15:00Z',
        });
        // 20 wall - 3 accumulated - 5 open = 12 consumed → 18 left
        expect(remainingSeconds).toBe(1080);
    });

    it('defaults to 30 minutes when duration missing', () => {
        vi.setSystemTime(at('2026-01-01T10:00:00Z'));
        const { totalDurationSeconds } = computeRemainingSeconds({
            startedAt: '2026-01-01T10:00:00Z',
        });
        expect(totalDurationSeconds).toBe(1800);
    });
});

// ── computePhaseInfo (interview state machine) ──
describe('computePhaseInfo', () => {
    const plan = {
        phases: [
            { name: 'Intro', focus: 'warm-up', targetQuestions: 1 },
            { name: 'Technical', focus: 'skills', targetQuestions: 3 },
            { name: 'Wrap-up', focus: 'closing', targetQuestions: 1 },
        ],
        totalTargetQuestions: 5,
    };

    it('starts in the first phase', () => {
        const info = computePhaseInfo(plan, 0);
        expect(info.phaseName).toBe('Intro');
        expect(info.questionInPhase).toBe(1);
    });

    it('moves through phases as questions accumulate', () => {
        expect(computePhaseInfo(plan, 1).phaseName).toBe('Technical');
        expect(computePhaseInfo(plan, 2).phaseName).toBe('Technical');
        expect(computePhaseInfo(plan, 3).phaseName).toBe('Technical');
        expect(computePhaseInfo(plan, 4).phaseName).toBe('Wrap-up');
    });

    it('stays in the final phase when past the plan', () => {
        const info = computePhaseInfo(plan, 42);
        expect(info.phaseName).toBe('Wrap-up');
    });
});

// ── Razorpay signature + credits ──
describe('verifyRazorpaySignature', () => {
    const secret = 'test_secret_key';
    const sign = (orderId: string, paymentId: string) =>
        crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');

    it('accepts a valid signature', () => {
        const sig = sign('order_1', 'pay_1');
        expect(verifyRazorpaySignature('order_1', 'pay_1', sig, secret)).toBe(true);
    });

    it('rejects a tampered signature', () => {
        const sig = sign('order_1', 'pay_1');
        expect(verifyRazorpaySignature('order_1', 'pay_2', sig, secret)).toBe(false);
        expect(verifyRazorpaySignature('order_2', 'pay_1', sig, secret)).toBe(false);
    });

    it('rejects empty/missing inputs', () => {
        expect(verifyRazorpaySignature('', 'pay_1', 'x', secret)).toBe(false);
        expect(verifyRazorpaySignature('order_1', 'pay_1', '', secret)).toBe(false);
        expect(verifyRazorpaySignature('order_1', 'pay_1', 'short', secret)).toBe(false);
    });
});

describe('creditsForPaise', () => {
    it('converts paise to credits at the configured rate', () => {
        expect(creditsForPaise(100 * 100)).toBe(100 * CREDITS_PER_RUPEE); // ₹100
        expect(creditsForPaise(1 * 100)).toBe(CREDITS_PER_RUPEE); // ₹1
    });

    it('returns 0 for invalid amounts', () => {
        expect(creditsForPaise(0)).toBe(0);
        expect(creditsForPaise(-500)).toBe(0);
        expect(creditsForPaise(NaN)).toBe(0);
    });

    it('floors partial rupees', () => {
        expect(creditsForPaise(150)).toBe(CREDITS_PER_RUPEE); // ₹1.50 → 1 whole rupee
    });
});
