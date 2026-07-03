import { useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import { GlassCard } from '../components/ui/GlassCard';

export const ResetPasswordPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
    const email = useMemo(() => searchParams.get('email') || '', [searchParams]);

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [done, setDone] = useState(false);

    const linkInvalid = !token || !email;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, token, newPassword }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setDone(true);
                setTimeout(() => navigate('/login'), 2500);
            } else {
                setError(data.error || 'Reset failed. The link may have expired.');
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
                    <h2 className="text-2xl font-light text-white">Reset Password</h2>
                    <p className="text-sm text-white/40 mt-2">
                        {done ? 'All set!' : `for ${email || 'your account'}`}
                    </p>
                </div>

                {linkInvalid ? (
                    <div className="text-center space-y-6">
                        <div className="bg-white/5 border border-white/10 text-white/70 p-4 rounded text-sm">
                            This reset link is invalid or incomplete.
                        </div>
                        <Link to="/forgot-password" className="text-sm text-white/50 hover:text-white transition-colors">
                            Request a new link
                        </Link>
                    </div>
                ) : done ? (
                    <div className="text-center space-y-6">
                        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400/90 p-4 rounded text-sm">
                            Password updated. Redirecting you to sign in…
                        </div>
                        <Link to="/login" className="text-sm text-white/50 hover:text-white transition-colors">
                            Sign in now
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
                                <label className="block text-xs uppercase tracking-wider text-white/30 mb-2">New Password</label>
                                <input
                                    type="password"
                                    className="w-full bg-white/5 border border-white/10 rounded p-3 text-white focus:border-white/30 transition-colors outline-none text-sm"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    disabled={isLoading}
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-white/30 mb-2">Confirm Password</label>
                                <input
                                    type="password"
                                    className="w-full bg-white/5 border border-white/10 rounded p-3 text-white focus:border-white/30 transition-colors outline-none text-sm"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    disabled={isLoading}
                                />
                            </div>
                            <button type="submit" className="btn-primary w-full text-sm" disabled={isLoading}>
                                {isLoading ? 'Updating...' : 'Update Password'}
                            </button>
                        </form>
                    </>
                )}
            </GlassCard>
        </div>
    );
};
