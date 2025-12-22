import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User, Settings, ChevronDown } from 'lucide-react';

export const Navbar = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50">
            <div className="glass border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="w-8 h-8 rounded border border-white/20 flex items-center justify-center group-hover:border-white/40 transition-colors">
                            <span className="text-sm font-bold">R</span>
                        </div>
                        <span className="text-lg font-light tracking-[0.15em] text-white/90">
                            REALPREP AI
                        </span>
                    </Link>

                    {/* Navigation Links */}
                    <div className="hidden md:flex items-center gap-8 text-sm">
                        <Link to="/features" className="text-white/50 hover:text-white transition-colors">
                            Features
                        </Link>
                        <Link to="/pricing" className="text-white/50 hover:text-white transition-colors">
                            Pricing
                        </Link>
                        {user && (
                            <Link to="/dashboard" className="text-white/50 hover:text-white transition-colors">
                                Dashboard
                            </Link>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                        {user ? (
                            <>
                                {/* User Dropdown */}
                                <div className="relative" ref={dropdownRef}>
                                    <button
                                        onClick={() => setDropdownOpen(!dropdownOpen)}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-white/5 transition-colors"
                                    >
                                        <span className="text-sm text-white/80">{user.name}</span>
                                        <ChevronDown size={14} className={`text-white/40 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {dropdownOpen && (
                                        <div className="absolute right-0 mt-2 w-48 glass rounded-lg border border-white/10 py-2 shadow-xl">
                                            <Link
                                                to="/profile"
                                                className="flex items-center gap-3 px-4 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                                                onClick={() => setDropdownOpen(false)}
                                            >
                                                <User size={14} />
                                                Profile
                                            </Link>
                                            <Link
                                                to="/settings"
                                                className="flex items-center gap-3 px-4 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                                                onClick={() => setDropdownOpen(false)}
                                            >
                                                <Settings size={14} />
                                                Settings
                                            </Link>
                                            <div className="border-t border-white/5 my-2" />
                                            <button
                                                onClick={() => { logout(); setDropdownOpen(false); }}
                                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
                                            >
                                                <LogOut size={14} />
                                                Logout
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Logout Icon */}
                                <button
                                    onClick={logout}
                                    className="p-2 rounded hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors"
                                    title="Logout"
                                >
                                    <LogOut size={18} />
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    to="/login"
                                    className="text-sm text-white/50 hover:text-white transition-colors"
                                >
                                    Login
                                </Link>
                                <button
                                    onClick={() => navigate('/register')}
                                    className="btn-primary text-sm"
                                >
                                    Get Started
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};
