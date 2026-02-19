import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';
import { GlassCard } from '../components/ui/GlassCard';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';

export const DashboardPage = () => {
    const { user, refreshUser } = useAuth();
    const navigate = useNavigate();
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showWelcome, setShowWelcome] = useState(false);
    const [rechargeInfo, setRechargeInfo] = useState<{ credits: number; total: number } | null>(null);

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

    // Refresh user data (credits may have changed)
    useEffect(() => {
        refreshUser();
    }, []);

    // Check for welcome flag (set after registration)
    useEffect(() => {
        if (localStorage.getItem('showWelcome') === 'true') {
            setShowWelcome(true);
            localStorage.removeItem('showWelcome');
        }
        // Check for recharge success (set after payment)
        const rechargeRaw = localStorage.getItem('rechargeSuccess');
        if (rechargeRaw) {
            try {
                setRechargeInfo(JSON.parse(rechargeRaw));
            } catch { }
            localStorage.removeItem('rechargeSuccess');
        }
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
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <GlassCard hover className="cursor-pointer" onClick={() => navigate('/recharge')}>
                            <p className="text-[10px] uppercase tracking-widest text-white/30 mb-2">Available Credits</p>
                            <div className="flex items-baseline gap-2">
                                <p className={`text-3xl font-light ${(user?.credits ?? 0) > 20 ? 'text-emerald-400' : (user?.credits ?? 0) > 0 ? 'text-yellow-400' : 'text-red-400'}`}>{user?.credits ?? 0}</p>
                                <span className="text-xs text-white/20">credits</span>
                            </div>
                            <p className="text-[10px] text-violet-400/60 mt-2 group-hover:text-violet-400">+ Add Credits</p>
                        </GlassCard>
                        <GlassCard hover>
                            <p className="text-[10px] uppercase tracking-widest text-white/30 mb-2">Total Sessions</p>
                            {loading ? (
                                <div className="h-9 w-16 bg-white/10 rounded animate-pulse" />
                            ) : (
                                <p className="text-3xl font-light text-white">{totalSessions}</p>
                            )}
                        </GlassCard>
                        <GlassCard hover>
                            <p className="text-[10px] uppercase tracking-widest text-white/30 mb-2">Average Score</p>
                            {loading ? (
                                <div className="h-9 w-20 bg-white/10 rounded animate-pulse" />
                            ) : (
                                <p className="text-3xl font-light text-white">{avgScore}%</p>
                            )}
                        </GlassCard>
                        <GlassCard hover>
                            <p className="text-[10px] uppercase tracking-widest text-white/30 mb-2">Focus Area</p>
                            {loading ? (
                                <div className="h-7 w-24 bg-white/10 rounded animate-pulse" />
                            ) : (
                                <p className="text-xl font-light text-white/80">Technical</p>
                            )}
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

            {/* Welcome Popup */}
            {showWelcome && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="bg-zinc-900 border border-white/10 rounded-2xl p-8 max-w-sm mx-4 text-center shadow-2xl animate-in">
                        <div className="text-5xl mb-4">🎉</div>
                        <h2 className="text-xl font-semibold text-white mb-2">Welcome to RealPrep!</h2>
                        <p className="text-sm text-white/50 mb-4">
                            You've been credited with
                        </p>
                        <div className="inline-flex items-baseline gap-1 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-6 py-3 mb-4">
                            <span className="text-4xl font-bold text-emerald-400">50</span>
                            <span className="text-sm text-emerald-400/70">credits</span>
                        </div>
                        <p className="text-xs text-white/40 mb-6">
                            1 credit = 1 minute of interview practice.<br />
                            Use them wisely to ace your interviews!
                        </p>
                        <button
                            onClick={() => setShowWelcome(false)}
                            className="btn-primary w-full text-sm"
                        >
                            Let's Go! 🚀
                        </button>
                    </div>
                </div>
            )}

            {/* Recharge Success Popup */}
            {rechargeInfo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="bg-zinc-900 border border-white/10 rounded-2xl p-8 max-w-sm mx-4 text-center shadow-2xl">
                        <div className="text-5xl mb-4">🌟</div>
                        <h2 className="text-xl font-semibold text-white mb-2">Credits Added!</h2>
                        <p className="text-sm text-white/50 mb-4">
                            Congratulations! Your recharge was successful.
                        </p>
                        <div className="inline-flex items-baseline gap-1 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-6 py-3 mb-2">
                            <span className="text-4xl font-bold text-emerald-400">{rechargeInfo.credits}</span>
                            <span className="text-sm text-emerald-400/70">credits added</span>
                        </div>
                        <p className="text-xs text-white/40 mb-6">
                            Your total balance is now <span className="text-emerald-400 font-medium">{rechargeInfo.total}</span> credits.
                        </p>
                        <button
                            onClick={() => setRechargeInfo(null)}
                            className="btn-primary w-full text-sm"
                        >
                            Awesome! 🚀
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
