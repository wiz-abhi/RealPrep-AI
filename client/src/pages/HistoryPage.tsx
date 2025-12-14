import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import { GlassCard } from '../components/ui/GlassCard';
import { NeonButton } from '../components/ui/NeonButton';

export const HistoryPage = () => {
    const navigate = useNavigate();
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'completed' | 'active'>('all');

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:3000/api/interview/history', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            setSessions(data.data || []);
        } catch (error) {
            console.error('Failed to fetch history:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredSessions = sessions.filter(session => {
        if (filter === 'all') return true;
        return session.status === filter;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'text-green-400 bg-green-500/10 border-green-500/20';
            case 'active': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
            default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
        }
    };

    if (loading) {
        return (
            <div className="flex bg-[#050505] min-h-screen">
                <Sidebar />
                <main className="flex-1 p-6 flex items-center justify-center">
                    <div className="text-white text-xl">Loading history...</div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex bg-[#050505] min-h-screen text-white">
            <Sidebar />

            <main className="flex-1 p-6 overflow-y-auto">
                <div className="max-w-6xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold">Interview History</h1>
                            <p className="text-gray-400 mt-2">
                                View all your past interview sessions and reports
                            </p>
                        </div>
                        <NeonButton onClick={() => navigate('/resumes')}>
                            New Interview
                        </NeonButton>
                    </div>

                    {/* Filters */}
                    <div className="flex gap-3">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-lg transition-all ${filter === 'all'
                                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                                    : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                                }`}
                        >
                            All Sessions
                        </button>
                        <button
                            onClick={() => setFilter('completed')}
                            className={`px-4 py-2 rounded-lg transition-all ${filter === 'completed'
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                                    : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                                }`}
                        >
                            Completed
                        </button>
                        <button
                            onClick={() => setFilter('active')}
                            className={`px-4 py-2 rounded-lg transition-all ${filter === 'active'
                                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                                    : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                                }`}
                        >
                            Active
                        </button>
                    </div>

                    {/* Sessions List */}
                    {filteredSessions.length === 0 ? (
                        <GlassCard className="p-12 text-center">
                            <div className="text-6xl mb-4">📋</div>
                            <h3 className="text-xl font-bold mb-2">No Sessions Found</h3>
                            <p className="text-gray-400 mb-6">
                                {filter === 'all'
                                    ? "You haven't completed any interviews yet. Start your first one!"
                                    : `No ${filter} sessions found.`}
                            </p>
                            <NeonButton onClick={() => navigate('/resumes')}>
                                Start Interview
                            </NeonButton>
                        </GlassCard>
                    ) : (
                        <div className="space-y-4">
                            {filteredSessions.map((session) => (
                                <GlassCard
                                    key={session.id}
                                    className="p-6 hover:scale-[1.02] transition-transform cursor-pointer"
                                    onClick={() => session.status === 'completed' && navigate(`/report/${session.id}`)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-xl font-bold">{session.type} Interview</h3>
                                                <span className={`px-3 py-1 rounded-full text-xs border ${getStatusColor(session.status)}`}>
                                                    {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-400">
                                                {new Date(session.createdAt).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            {session.status === 'completed' && (
                                                <div className="text-center">
                                                    <div className="text-3xl font-bold text-cyan-400">
                                                        {session.score || 0}
                                                    </div>
                                                    <div className="text-xs text-gray-500">Score</div>
                                                </div>
                                            )}

                                            {session.status === 'completed' ? (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/report/${session.id}`);
                                                    }}
                                                    className="px-4 py-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all"
                                                >
                                                    View Report →
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate('/interview', { state: { sessionId: session.id } });
                                                    }}
                                                    className="px-4 py-2 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/20 transition-all"
                                                >
                                                    Continue →
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </GlassCard>
                            ))}
                        </div>
                    )}

                    {/* Stats Summary */}
                    {sessions.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <GlassCard className="p-6 text-center">
                                <div className="text-4xl font-bold text-cyan-400">
                                    {sessions.length}
                                </div>
                                <p className="text-gray-400 mt-2">Total Sessions</p>
                            </GlassCard>

                            <GlassCard className="p-6 text-center">
                                <div className="text-4xl font-bold text-green-400">
                                    {sessions.filter(s => s.status === 'completed').length}
                                </div>
                                <p className="text-gray-400 mt-2">Completed</p>
                            </GlassCard>

                            <GlassCard className="p-6 text-center">
                                <div className="text-4xl font-bold text-purple-400">
                                    {sessions.filter(s => s.status === 'completed').length > 0
                                        ? Math.round(
                                            sessions
                                                .filter(s => s.status === 'completed')
                                                .reduce((sum, s) => sum + (s.score || 0), 0) /
                                            sessions.filter(s => s.status === 'completed').length
                                        )
                                        : 0}
                                </div>
                                <p className="text-gray-400 mt-2">Average Score</p>
                            </GlassCard>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};
