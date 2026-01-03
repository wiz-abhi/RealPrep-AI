import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';
import { GlassCard } from '../components/ui/GlassCard';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';

export const DashboardPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSessions = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${API_BASE_URL}/api/interview/history`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) {
                    setSessions(data.data.map((s: any) => ({
                        id: s.id,
                        type: s.type,
                        date: new Date(s.createdAt).toLocaleDateString(),
                        score: s.score || '-',
                        duration: '20m'
                    })));
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchSessions();
    }, []);

    const totalSessions = sessions.length;
    const avgScore = sessions.length > 0
        ? Math.round(sessions.reduce((acc, s) => acc + (s.score === '-' ? 0 : s.score), 0) / sessions.length)
        : '-';

    return (
        <div className="flex min-h-screen bg-black">
            <Sidebar />

            <main className="flex-1 ml-16 lg:ml-56 p-8 pt-24">
                <div className="max-w-5xl mx-auto space-y-8">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-light text-white">
                                Welcome back, <span className="font-normal">{user?.name}</span>
                            </h1>
                            <p className="text-white/40 mt-1 text-sm">Ready for your next practice session?</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => navigate('/resumes')}
                                className="btn-secondary text-sm"
                            >
                                My Resumes
                            </button>
                            <button
                                onClick={() => navigate('/upload')}
                                className="btn-primary text-sm"
                            >
                                + New Interview
                            </button>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <GlassCard hover>
                            <p className="text-[10px] uppercase tracking-widest text-white/30 mb-2">Total Sessions</p>
                            <p className="text-3xl font-light text-white">{totalSessions}</p>
                        </GlassCard>
                        <GlassCard hover>
                            <p className="text-[10px] uppercase tracking-widest text-white/30 mb-2">Average Score</p>
                            <p className="text-3xl font-light text-white">{avgScore}%</p>
                        </GlassCard>
                        <GlassCard hover>
                            <p className="text-[10px] uppercase tracking-widest text-white/30 mb-2">Focus Area</p>
                            <p className="text-xl font-light text-white/80">Technical</p>
                        </GlassCard>
                    </div>

                    {/* Features */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <GlassCard
                            hover
                            className="cursor-pointer text-center py-6"
                            onClick={() => navigate('/upload')}
                        >
                            <div className="text-2xl mb-2">🎙️</div>
                            <h3 className="text-sm font-medium text-white/80">Interview Practice</h3>
                            <p className="text-[10px] text-white/30 mt-1">AI-powered mock interviews</p>
                        </GlassCard>
                        <GlassCard
                            hover
                            className="cursor-pointer text-center py-6"
                            onClick={() => navigate('/resumes')}
                        >
                            <div className="text-2xl mb-2">📊</div>
                            <h3 className="text-sm font-medium text-white/80">Resume ATS</h3>
                            <p className="text-[10px] text-white/30 mt-1">Check ATS compatibility</p>
                        </GlassCard>
                        <GlassCard
                            hover
                            className="cursor-pointer text-center py-6 opacity-50"
                        >
                            <div className="text-2xl mb-2">📝</div>
                            <h3 className="text-sm font-medium text-white/80">Resume Maker</h3>
                            <p className="text-[10px] text-white/30 mt-1">Coming soon</p>
                        </GlassCard>
                        <GlassCard
                            hover
                            className="cursor-pointer text-center py-6 opacity-50"
                        >
                            <div className="text-2xl mb-2">💬</div>
                            <h3 className="text-sm font-medium text-white/80">Discussion</h3>
                            <p className="text-[10px] text-white/30 mt-1">Coming soon</p>
                        </GlassCard>
                    </div>

                    {/* Recent Sessions */}
                    <GlassCard className="p-6">
                        <h2 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-6">Recent Sessions</h2>
                        <div className="space-y-3">
                            {loading ? (
                                <div className="text-center text-white/30 py-8">Loading...</div>
                            ) : sessions.length === 0 ? (
                                <div className="text-center text-white/30 py-8">No sessions yet. Start one!</div>
                            ) : (
                                sessions.map((session) => (
                                    <div
                                        key={session.id}
                                        className="flex items-center justify-between p-4 rounded border border-white/5 hover:bg-white/5 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded border border-white/10 flex items-center justify-center text-sm">
                                                {session.type === 'System Design' ? '🏗️' : '💻'}
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-medium text-white/90">{session.type}</h4>
                                                <p className="text-xs text-white/30">{session.date} • {session.duration}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-medium text-white/80">{session.score}/100</div>
                                            <div className="text-[10px] text-white/30 uppercase tracking-wider">Score</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </GlassCard>
                </div>
            </main>
        </div>
    );
};
