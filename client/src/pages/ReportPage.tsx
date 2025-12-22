import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import { GlassCard } from '../components/ui/GlassCard';

export const ReportPage = () => {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchReport();
    }, [sessionId]);

    const fetchReport = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:3000/api/interview/report/${sessionId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.success) {
                setReport(data.data);
            } else {
                setError('Failed to load report');
            }
        } catch {
            setError('Failed to load report');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen bg-black">
                <Sidebar />
                <main className="flex-1 p-8 pt-24 flex items-center justify-center">
                    <div className="text-white/30">Loading report...</div>
                </main>
            </div>
        );
    }

    if (error || !report) {
        return (
            <div className="flex min-h-screen bg-black">
                <Sidebar />
                <main className="flex-1 p-8 pt-24 flex items-center justify-center">
                    <GlassCard className="p-8 text-center max-w-md">
                        <div className="text-4xl mb-4 opacity-30">⚠️</div>
                        <h2 className="text-lg font-light mb-2 text-white/80">Report Not Available</h2>
                        <p className="text-white/40 text-sm mb-6">{error || 'No report for this session.'}</p>
                        <button onClick={() => navigate('/dashboard')} className="btn-primary text-sm">
                            Back to Dashboard
                        </button>
                    </GlassCard>
                </main>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-black text-white">
            <Sidebar />

            <main className="flex-1 ml-16 lg:ml-56 p-8 pt-24">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-light">Interview Report</h1>
                        <button onClick={() => navigate('/dashboard')} className="btn-secondary text-sm">
                            Back to Dashboard
                        </button>
                    </div>

                    {/* Score */}
                    <GlassCard className="text-center p-8">
                        <p className="text-[10px] uppercase tracking-widest text-white/30 mb-4">Overall Score</p>
                        <div className="text-5xl font-light text-white/90 mb-2">
                            {report.score || 0}/100
                        </div>
                        <p className="text-sm text-white/40">
                            {report.score >= 80 ? 'Excellent Performance' :
                                report.score >= 60 ? 'Good Job' :
                                    report.score > 0 ? 'Keep Practicing' :
                                        'Score pending...'}
                        </p>
                    </GlassCard>

                    {/* Feedback */}
                    {report.feedback && typeof report.feedback === 'object' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {report.feedback.strengths?.length > 0 && (
                                <GlassCard className="p-5">
                                    <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-4">Strengths</h3>
                                    <ul className="space-y-2">
                                        {report.feedback.strengths.map((s: string, i: number) => (
                                            <li key={i} className="text-sm text-white/70 flex items-start gap-2">
                                                <span className="text-white/40">•</span>
                                                {s}
                                            </li>
                                        ))}
                                    </ul>
                                </GlassCard>
                            )}

                            {report.feedback.improvements?.length > 0 && (
                                <GlassCard className="p-5">
                                    <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-4">Improvements</h3>
                                    <ul className="space-y-2">
                                        {report.feedback.improvements.map((s: string, i: number) => (
                                            <li key={i} className="text-sm text-white/70 flex items-start gap-2">
                                                <span className="text-white/40">•</span>
                                                {s}
                                            </li>
                                        ))}
                                    </ul>
                                </GlassCard>
                            )}
                        </div>
                    )}

                    {/* Summary */}
                    {report.feedback?.summary && (
                        <GlassCard className="p-5">
                            <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-4">Summary</h3>
                            <p className="text-sm text-white/70 leading-relaxed">
                                {report.feedback.summary}
                            </p>
                        </GlassCard>
                    )}

                    {/* Transcript */}
                    {report.transcript?.length > 0 && (
                        <GlassCard className="p-5">
                            <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-4">Transcript</h3>
                            <div className="space-y-3 max-h-80 overflow-y-auto">
                                {report.transcript.map((msg: any, i: number) => (
                                    <div key={i} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                                        <span className="text-[9px] mb-1 text-white/30">
                                            {msg.sender === 'user' ? 'You' : 'AI'}
                                        </span>
                                        <div className={`max-w-[80%] p-2.5 rounded text-xs leading-relaxed
                                            ${msg.sender === 'user'
                                                ? 'bg-white/10 text-white/80'
                                                : 'bg-white/5 text-white/60'
                                            }`}
                                        >
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </GlassCard>
                    )}

                    {/* Actions */}
                    <div className="flex gap-4 justify-center pt-4">
                        <button onClick={() => navigate('/resumes')} className="btn-primary text-sm">
                            New Interview
                        </button>
                        <button
                            onClick={() => window.print()}
                            className="btn-secondary text-sm"
                        >
                            Print Report
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
};
