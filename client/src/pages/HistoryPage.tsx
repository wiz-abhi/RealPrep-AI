import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import { GlassCard } from '../components/ui/GlassCard';
import { Trash2 } from 'lucide-react';

export const HistoryPage = () => {
    const navigate = useNavigate();
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'completed' | 'active'>('all');
    const [clearing, setClearing] = useState(false);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:3000/api/interview/history', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setSessions(data.data || []);
        } catch (error) {
            console.error('Failed to fetch history:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClearHistory = async () => {
        if (!confirm('Are you sure you want to clear all interview history? This cannot be undone.')) return;

        setClearing(true);
        try {
            const token = localStorage.getItem('token');
            await fetch('http://localhost:3000/api/interview/clear-history', {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setSessions([]);
        } catch (error) {
            console.error('Failed to clear history:', error);
        } finally {
            setClearing(false);
        }
    };

    const filteredSessions = sessions.filter(session => {
        if (filter === 'all') return true;
        return session.status === filter;
    });

    if (loading) {
        return (
            <div className="flex min-h-screen bg-black">
                <Sidebar />
                <main className="flex-1 ml-16 lg:ml-56 p-8 pt-24 flex items-center justify-center">
                    <div className="text-white/30">Loading history...</div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-black text-white">
            <Sidebar />

            <main className="flex-1 ml-16 lg:ml-56 p-8 pt-24">
                <div className="max-w-5xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-light">Interview History</h1>
                            <p className="text-white/40 text-sm mt-1">View past sessions and reports</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {sessions.length > 0 && (
                                <button
                                    onClick={handleClearHistory}
                                    disabled={clearing}
                                    className="flex items-center gap-2 px-3 py-2 text-xs text-white/40 hover:text-white border border-white/10 rounded hover:bg-white/5 transition-all disabled:opacity-50"
                                >
                                    <Trash2 size={14} />
                                    {clearing ? 'Clearing...' : 'Clear History'}
                                </button>
                            )}
                            <button onClick={() => navigate('/resumes')} className="btn-primary text-sm">
                                New Interview
                            </button>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex gap-2">
                        {['all', 'completed', 'active'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f as any)}
                                className={`px-4 py-2 rounded text-sm transition-all ${filter === f
                                    ? 'bg-white/10 text-white border border-white/20'
                                    : 'bg-white/5 text-white/40 border border-white/5 hover:bg-white/10'
                                    }`}
                            >
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>

                    {/* Sessions */}
                    {filteredSessions.length === 0 ? (
                        <GlassCard className="p-12 text-center">
                            <div className="text-4xl mb-4 opacity-30">📋</div>
                            <h3 className="text-lg font-light mb-2 text-white/80">No Sessions Found</h3>
                            <p className="text-white/40 text-sm mb-6">
                                {filter === 'all'
                                    ? "Start your first interview to see history here."
                                    : `No ${filter} sessions.`}
                            </p>
                            <button onClick={() => navigate('/resumes')} className="btn-primary text-sm">
                                Start Interview
                            </button>
                        </GlassCard>
                    ) : (
                        <div className="space-y-3">
                            {filteredSessions.map((session) => (
                                <GlassCard
                                    key={session.id}
                                    hover
                                    className="p-5"
                                    onClick={() => session.status === 'completed' && navigate(`/report/${session.id}`)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="text-sm font-medium text-white/90">
                                                    {session.type} Interview
                                                </h3>
                                                <span className={`px-2 py-0.5 rounded text-[10px] border ${session.status === 'completed'
                                                    ? 'text-white/60 bg-white/5 border-white/10'
                                                    : 'text-white/40 bg-white/5 border-white/5'
                                                    }`}>
                                                    {session.status}
                                                </span>
                                            </div>
                                            <p className="text-xs text-white/30">
                                                {new Date(session.createdAt).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            {session.status === 'completed' && (
                                                <div className="text-right">
                                                    <div className="text-lg font-light text-white/80">
                                                        {session.score || 0}
                                                    </div>
                                                    <div className="text-[10px] text-white/30 uppercase tracking-wider">Score</div>
                                                </div>
                                            )}

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (session.status === 'completed') {
                                                        navigate(`/report/${session.id}`);
                                                    } else {
                                                        navigate('/interview', { state: { sessionId: session.id } });
                                                    }
                                                }}
                                                className="btn-secondary text-xs"
                                            >
                                                {session.status === 'completed' ? 'View Report' : 'Continue'}
                                            </button>
                                        </div>
                                    </div>
                                </GlassCard>
                            ))}
                        </div>
                    )}

                    {/* Stats */}
                    {sessions.length > 0 && (
                        <div className="grid grid-cols-3 gap-4 pt-6">
                            <GlassCard hover className="p-5 text-center">
                                <div className="text-2xl font-light text-white/90">{sessions.length}</div>
                                <p className="text-[10px] uppercase tracking-widest text-white/30 mt-2">Total</p>
                            </GlassCard>
                            <GlassCard hover className="p-5 text-center">
                                <div className="text-2xl font-light text-white/90">
                                    {sessions.filter(s => s.status === 'completed').length}
                                </div>
                                <p className="text-[10px] uppercase tracking-widest text-white/30 mt-2">Completed</p>
                            </GlassCard>
                            <GlassCard hover className="p-5 text-center">
                                <div className="text-2xl font-light text-white/90">
                                    {sessions.filter(s => s.status === 'completed').length > 0
                                        ? Math.round(
                                            sessions
                                                .filter(s => s.status === 'completed')
                                                .reduce((sum, s) => sum + (s.score || 0), 0) /
                                            sessions.filter(s => s.status === 'completed').length
                                        )
                                        : 0}
                                </div>
                                <p className="text-[10px] uppercase tracking-widest text-white/30 mt-2">Avg Score</p>
                            </GlassCard>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};
