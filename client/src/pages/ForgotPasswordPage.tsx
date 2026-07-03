import { useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import { GlassCard } from '../components/ui/GlassCard';

export const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setSent(true);
            } else {
                setError(data.error || 'Something went wrong. Try again.');
            }
        } catch {
            setError('Could not reach the server. Try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 pt-20">
            <GlassCard className="w-full max-w-md p-8">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-light text-white">Forgot Password</h2>
                    <p className="text-sm text-white/40 mt-2">
                        {sent ? 'Check your inbox' : "We'll email you a reset link"}
                    </p>
                </div>

                {sent ? (
                    <div className="text-center space-y-6">
                        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400/90 p-4 rounded text-sm">
                            If an account exists for <strong>{email}</strong>, a reset link has been
                            sent. The link expires in 30 minutes.
                        </div>
                        <Link to="/login" className="text-sm text-white/50 hover:text-white transition-colors">
                            ← Back to sign in
                        </Link>
                    </div>
                ) : (
                    <>
                        {error && (
                            <div className="bg-white/5 border border-white/10 text-white/70 p-3 rounded text-sm text-center mb-6">
                                {error}
                            </div>
                        )}
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-white/30 mb-2">Email</label>
                                <input
                                    type="email"
                                    className="w-full bg-white/5 border border-white/10 rounded p-3 text-white focus:border-white/30 transition-colors outline-none text-sm"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                    disabled={isLoading}
                                    autoFocus
                                />
                            </div>
                            <button type="submit" className="btn-primary w-full text-sm" disabled={isLoading}>
                                {isLoading ? 'Sending...' : 'Send Reset Link'}
                            </button>
                        </form>
                        <p className="mt-6 text-center text-sm text-white/40">
                            Remembered it?{' '}
                            <Link to="/login" className="text-white/70 hover:text-white transition-colors">
                                Sign in
                            </Link>
                        </p>
                    </>
                )}
            </GlassCard>
        </div>
    );
};
