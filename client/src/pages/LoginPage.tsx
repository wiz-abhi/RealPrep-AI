import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GlassCard } from '../components/ui/GlassCard';

export const LoginPage = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await login(formData);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Login failed');
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
                        />
                    </div>
                    <div>
                        <label className="block text-xs uppercase tracking-wider text-white/30 mb-2">Password</label>
                        <input
                            type="password"
                            className="w-full bg-white/5 border border-white/10 rounded p-3 text-white focus:border-white/30 transition-colors outline-none text-sm"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                            required
                        />
                    </div>

                    <button type="submit" className="btn-primary w-full text-sm">
                        Sign In
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
