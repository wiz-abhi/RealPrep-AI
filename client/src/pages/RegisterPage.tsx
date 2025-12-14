import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GlassCard } from '../components/ui/GlassCard';
import { NeonButton } from '../components/ui/NeonButton';

export const RegisterPage = () => {
    const navigate = useNavigate();
    const { register } = useAuth();
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await register(formData);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Registration failed');
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center">
            <GlassCard className="w-full max-w-md p-8">
                <h2 className="text-3xl font-bold mb-6 text-center">Create Account</h2>
                {error && <div className="bg-red-500/10 text-red-500 p-3 rounded-lg mb-4 text-center">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Name</label>
                        <input
                            type="text"
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-cyan-500 transition-colors outline-none"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                        <input
                            type="email"
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-cyan-500 transition-colors outline-none"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Password</label>
                        <input
                            type="password"
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-cyan-500 transition-colors outline-none"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                            required
                        />
                    </div>

                    <NeonButton variant="primary" className="w-full justify-center">
                        Sign Up
                    </NeonButton>
                </form>

                <p className="mt-6 text-center text-gray-400">
                    Already have an account? <Link to="/login" className="text-cyan-400 hover:underline">Log in</Link>
                </p>
            </GlassCard>
        </div>
    );
};
