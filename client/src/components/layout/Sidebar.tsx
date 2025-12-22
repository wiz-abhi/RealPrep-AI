import { NavLink } from 'react-router-dom';
import { Home, User, Settings, Video, FileText, LogOut, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = () => {
    const { logout } = useAuth();

    const navItems = [
        { icon: Home, label: 'Dashboard', path: '/dashboard' },
        { icon: FileText, label: 'Resumes', path: '/resumes' },
        { icon: Video, label: 'Upload', path: '/upload' },
        { icon: Clock, label: 'History', path: '/history' },
        { icon: User, label: 'Profile', path: '/profile' },
        { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    return (
        <aside className="fixed left-0 top-0 w-16 lg:w-56 h-screen glass border-r border-white/5 flex flex-col justify-between py-6 z-40">
            {/* Logo */}
            <div className="flex items-center justify-center lg:justify-start lg:px-6 mb-8">
                <div className="w-8 h-8 rounded border border-white/20 flex items-center justify-center">
                    <span className="text-xs font-bold">R</span>
                </div>
                <span className="hidden lg:block ml-3 text-sm font-light tracking-[0.12em] text-white/80">
                    REALPREP
                </span>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-2 lg:px-3 space-y-1">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `
                            flex items-center justify-center lg:justify-start px-3 py-2.5 rounded transition-all duration-200 group
                            ${isActive
                                ? 'bg-white/5 text-white border border-white/10'
                                : 'text-white/40 hover:text-white/70 hover:bg-white/5 border border-transparent'}
                        `}
                    >
                        <item.icon size={18} className="shrink-0" />
                        <span className="hidden lg:block ml-3 text-sm">{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            {/* Logout */}
            <div className="px-2 lg:px-3">
                <button
                    onClick={logout}
                    className="w-full flex items-center justify-center lg:justify-start px-3 py-2.5 rounded text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
                >
                    <LogOut size={18} />
                    <span className="hidden lg:block ml-3 text-sm">Logout</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
