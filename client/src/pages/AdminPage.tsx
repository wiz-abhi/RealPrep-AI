import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/api';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, CreditCard, Search, Save, X, ArrowLeft } from 'lucide-react';

interface AdminUser {
    id: string;
    name: string | null;
    email: string;
    credits: number;
    role: string;
    createdAt: string;
    sessionCount: number;
}

export const AdminPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editCredits, setEditCredits] = useState<number>(0);
    const [saving, setSaving] = useState(false);

    // Redirect non-admins
    useEffect(() => {
        if (user && user.role !== 'admin') {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    // Fetch all users
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${API_BASE_URL}/api/admin/users`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.status === 403) {
                    setError('Admin access required');
                    return;
                }

                const data = await res.json();
                if (data.success) {
                    setUsers(data.data);
                }
            } catch (err) {
                setError('Failed to fetch users');
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    const handleEditCredits = (userId: string, currentCredits: number) => {
        setEditingId(userId);
        setEditCredits(currentCredits);
    };

    const handleSaveCredits = async (userId: string) => {
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/credits`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ credits: editCredits })
            });

            const data = await res.json();
            if (data.success) {
                setUsers(prev => prev.map(u =>
                    u.id === userId ? { ...u, credits: editCredits } : u
                ));
                setEditingId(null);
            }
        } catch (err) {
            console.error('Save credits error:', err);
        } finally {
            setSaving(false);
        }
    };

    const filteredUsers = users.filter(u =>
        (u.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    const totalCredits = users.reduce((sum, u) => sum + u.credits, 0);
    const totalSessions = users.reduce((sum, u) => sum + u.sessionCount, 0);

    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white/50" />
                    <p className="text-sm text-white/50">Loading admin panel...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="text-center">
                    <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <p className="text-red-400 text-lg mb-2">{error}</p>
                    <button onClick={() => navigate('/dashboard')} className="text-sm text-white/50 hover:text-white underline">
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white">
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/dashboard')} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
                            <ArrowLeft size={20} className="text-white/60" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <Shield size={20} className="text-emerald-400" />
                                <h1 className="text-2xl font-bold">Admin Panel</h1>
                            </div>
                            <p className="text-sm text-white/40 mt-1">Manage users and credits</p>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-zinc-900/80 border border-white/10 rounded-xl p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <Users size={18} className="text-blue-400" />
                            <span className="text-xs text-white/40 uppercase tracking-wider">Total Users</span>
                        </div>
                        <p className="text-3xl font-bold text-white">{users.length}</p>
                    </div>
                    <div className="bg-zinc-900/80 border border-white/10 rounded-xl p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <CreditCard size={18} className="text-emerald-400" />
                            <span className="text-xs text-white/40 uppercase tracking-wider">Total Credits</span>
                        </div>
                        <p className="text-3xl font-bold text-white">{totalCredits}</p>
                    </div>
                    <div className="bg-zinc-900/80 border border-white/10 rounded-xl p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <Users size={18} className="text-purple-400" />
                            <span className="text-xs text-white/40 uppercase tracking-wider">Total Sessions</span>
                        </div>
                        <p className="text-3xl font-bold text-white">{totalSessions}</p>
                    </div>
                </div>

                {/* Search */}
                <div className="mb-6">
                    <div className="relative max-w-md">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by name or email..."
                            className="w-full bg-zinc-900 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20"
                        />
                    </div>
                </div>

                {/* Users Table */}
                <div className="bg-zinc-900/50 border border-white/10 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="text-left px-5 py-3 text-xs text-white/40 uppercase tracking-wider font-medium">User</th>
                                    <th className="text-left px-5 py-3 text-xs text-white/40 uppercase tracking-wider font-medium">Email</th>
                                    <th className="text-center px-5 py-3 text-xs text-white/40 uppercase tracking-wider font-medium">Credits</th>
                                    <th className="text-center px-5 py-3 text-xs text-white/40 uppercase tracking-wider font-medium">Role</th>
                                    <th className="text-center px-5 py-3 text-xs text-white/40 uppercase tracking-wider font-medium">Sessions</th>
                                    <th className="text-left px-5 py-3 text-xs text-white/40 uppercase tracking-wider font-medium">Joined</th>
                                    <th className="text-center px-5 py-3 text-xs text-white/40 uppercase tracking-wider font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map(u => (
                                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                                                    {(u.name || u.email)[0].toUpperCase()}
                                                </div>
                                                <span className="text-sm text-white/80">{u.name || '—'}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-sm text-white/50">{u.email}</td>
                                        <td className="px-5 py-4 text-center">
                                            {editingId === u.id ? (
                                                <div className="flex items-center justify-center gap-2">
                                                    <input
                                                        type="number"
                                                        value={editCredits}
                                                        onChange={e => setEditCredits(Math.max(0, parseInt(e.target.value) || 0))}
                                                        className="w-20 bg-zinc-800 border border-white/20 rounded px-2 py-1 text-sm text-white text-center focus:outline-none focus:border-emerald-500"
                                                        autoFocus
                                                    />
                                                    <button
                                                        onClick={() => handleSaveCredits(u.id)}
                                                        disabled={saving}
                                                        className="p-1 rounded hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                                                    >
                                                        <Save size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingId(null)}
                                                        className="p-1 rounded hover:bg-red-500/20 text-red-400 transition-colors"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className={`text-sm font-mono font-medium ${u.credits > 20 ? 'text-emerald-400' : u.credits > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                    {u.credits}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${u.role === 'admin'
                                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                : 'bg-white/5 text-white/40 border border-white/10'
                                                }`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-center text-sm text-white/50">{u.sessionCount}</td>
                                        <td className="px-5 py-4 text-sm text-white/40">
                                            {new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <button
                                                onClick={() => handleEditCredits(u.id, u.credits)}
                                                className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all"
                                            >
                                                Edit Credits
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {filteredUsers.length === 0 && (
                        <div className="py-12 text-center text-white/30 text-sm">
                            {search ? 'No users match your search' : 'No users found'}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
