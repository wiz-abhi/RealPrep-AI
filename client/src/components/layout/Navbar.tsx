import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { NeonButton } from '../ui/NeonButton';
import { useAuth } from '../../context/AuthContext';

export const Navbar = () => {
    const navigate = useNavigate();
    const { user, login, logout } = useAuth();

    return (
        <nav className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 w-[90%] max-w-5xl">
            <div className="glass rounded-full px-8 py-4 flex items-center justify-between shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#00f3ff] to-[#bc13fe] animate-pulse" />
                    <span className="text-xl font-bold tracking-wider text-white">
                        AI<span className="text-[#00f3ff]">NTERVIEW</span>
                    </span>
                </Link>

                {/* Links */}
                <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
                    <Link to="/features" className="hover:text-white transition-colors">Features</Link>
                    <Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link>
                    {user && <Link to="/dashboard" className="text-[#00f3ff] hover:text-[#00f3ff]/80">Dashboard</Link>}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4">
                    {user ? (
                        <div className="flex items-center gap-4">
                            <div className="text-right hidden sm:block">
                                <div className="text-xs text-gray-400">Signed in as</div>
                                <div className="text-sm font-bold">{user.name}</div>
                            </div>
                            <button onClick={logout} className="text-sm text-red-500 hover:text-red-400">Logout</button>
                        </div>
                    ) : (
                        <Link to="/login" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
                            Login
                        </Link>
                    )}

                    <NeonButton onClick={() => navigate(user ? '/dashboard' : '/register')} variant="primary" className="!py-2 !px-4 !text-xs">
                        {user ? 'Dashboard' : 'Start Practice'}
                    </NeonButton>
                </div>
            </div>
        </nav>
    );
};
