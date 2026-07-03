import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GlassCard } from '../components/ui/GlassCard';

export const LoginPage = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            await login(formData);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Login failed');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 pt-20">
            <GlassCard className="w-full max-w-md p-8">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-light text-white">Welcome Back</h2>
                    <p className="text-sm text-white/40 mt-2">Sign in to continue</p>
                </div>

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
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs uppercase tracking-wider text-white/30">Password</label>
                            <Link to="/forgot-password" className="text-[11px] text-white/30 hover:text-white/60 transition-colors">
                                Forgot password?
                            </Link>
                        </div>
                        <input
                            type="password"
                            className="w-full bg-white/5 border border-white/10 rounded p-3 text-white focus:border-white/30 transition-colors outline-none text-sm"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                            required
                            disabled={isLoading}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn-primary w-full text-sm flex items-center justify-center gap-2"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Signing in...
                            </>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-white/40">
                    Don't have an account?{' '}
                    <Link to="/register" className="text-white/70 hover:text-white transition-colors">
                        Sign up
                    </Link>
                </p>
            </GlassCard>
        </div>
    );
};
