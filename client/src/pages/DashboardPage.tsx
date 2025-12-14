import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import { NeonButton } from '../components/ui/NeonButton';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const DashboardPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSessions = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch('http://localhost:3000/api/interview/history', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) {
                    setSessions(data.data.map((s: any) => ({
                        id: s.id,
                        type: s.type,
                        date: new Date(s.createdAt).toLocaleDateString(),
                        score: s.score || '-',
                        duration: '20m' // Placeholder as duration isn't tracking yet
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
    const avgScore = sessions.length > 0 ? Math.round(sessions.reduce((acc, s) => acc + (s.score === '-' ? 0 : s.score), 0) / sessions.length) : '-';

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            {/* Header Stats */}
            <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Welcome back, {user?.name}</h1>
                    <p className="text-gray-400">Ready for your next mock interview?</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => navigate('/resumes')}
                        className="px-6 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all"
                    >
                        My Resumes
                    </button>
                    <NeonButton onClick={() => navigate('/upload')}>
                        + New Interview
                    </NeonButton>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <GlassCard hoverEffect>
                    <h3 className="text-gray-400 text-sm uppercase tracking-wider">Total Sessions</h3>
                    <p className="text-4xl font-bold text-white mt-2">{totalSessions}</p>
                </GlassCard>
                <GlassCard hoverEffect>
                    <h3 className="text-gray-400 text-sm uppercase tracking-wider">Avg. Score</h3>
                    <p className="text-4xl font-bold text-[#00f3ff] mt-2">{avgScore}%</p>
                </GlassCard>
                <GlassCard hoverEffect>
                    <h3 className="text-gray-400 text-sm uppercase tracking-wider">Focus Area</h3>
                    <p className="text-xl font-bold text-[#bc13fe] mt-2">Technical</p>
                </GlassCard>
            </div>

            {/* Recent Activity */}
            <GlassCard className="p-8">
                <h2 className="text-xl font-bold mb-6">Recent Sessions</h2>
                <div className="space-y-4">
                    {loading ? <div className="text-center text-gray-500">Loading history...</div> : sessions.length === 0 ? <div className="text-center text-gray-500">No sessions yet. Start one!</div> : sessions.map((session) => (
                        <div key={session.id} className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded bg-gradient-to-br from-[#00f3ff]/20 to-[#bc13fe]/20 flex items-center justify-center text-lg">
                                    {session.type === 'System Design' ? '🏗️' : '💻'}
                                </div>
                                <div>
                                    <h4 className="font-bold">{session.type}</h4>
                                    <p className="text-xs text-gray-400">{session.date} • {session.duration}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <div className="text-sm font-bold text-[#00f3ff]">{session.score}/100</div>
                                    <div className="text-xs text-gray-500">Score</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </GlassCard>
        </div>
    );
};
