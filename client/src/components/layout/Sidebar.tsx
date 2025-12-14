import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, User, Settings, Video, FileText, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = () => {
    const { logout } = useAuth();

    const navItems = [
        { icon: Home, label: 'Dashboard', path: '/dashboard' },
        { icon: FileText, label: 'My Resumes', path: '/resumes' },
        { icon: Video, label: 'Upload Resume', path: '/upload' },
        { icon: FileText, label: 'History', path: '/history' },
        { icon: User, label: 'Profile', path: '/profile' },
        { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    return (
        <aside className="w-20 lg:w-64 h-screen glass border-r border-white/10 flex flex-col justify-between py-6 z-20">
            {/* Logo Area */}
            <div className="flex items-center justify-center lg:justify-start lg:px-8 mb-10">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-purple-600 animate-pulse flex-shrink-0" />
                <span className="hidden lg:block ml-3 font-bold text-xl tracking-wider">AI<span className="text-cyan-400">NT</span></span>
            </div>

            {/* Nav Links */}
            <nav className="flex-1 px-4 space-y-2">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `
                            flex items-center justify-center lg:justify-start px-4 py-3 rounded-xl transition-all duration-200 group
                            ${isActive
                                ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-white border border-white/10 shadow-[0_0_15px_rgba(0,243,255,0.1)]'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'}
                        `}
                    >
                        <item.icon size={20} className="group-hover:text-cyan-400 transition-colors" />
                        <span className="hidden lg:block ml-3 font-medium">{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            {/* Logout */}
            <div className="px-4 mt-auto">
                <button
                    onClick={logout}
                    className="w-full flex items-center justify-center lg:justify-start px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all group"
                >
                    <LogOut size={20} />
                    <span className="hidden lg:block ml-3 font-medium">Logout</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
