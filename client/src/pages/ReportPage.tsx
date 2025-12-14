import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import { GlassCard } from '../components/ui/GlassCard';
import { NeonButton } from '../components/ui/NeonButton';

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
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();

            if (data.success) {
                setReport(data.data);
            } else {
                setError('Failed to load report');
            }
        } catch (error) {
            console.error('Failed to fetch report:', error);
            setError('Failed to load report');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex bg-[#050505] min-h-screen">
                <Sidebar />
                <main className="flex-1 p-6 flex items-center justify-center">
                    <div className="text-white text-xl">Loading report...</div>
                </main>
            </div>
        );
    }

    if (error || !report) {
        return (
            <div className="flex bg-[#050505] min-h-screen">
                <Sidebar />
                <main className="flex-1 p-6 flex items-center justify-center">
                    <GlassCard className="p-8 text-center">
                        <div className="text-6xl mb-4">⚠️</div>
                        <h2 className="text-2xl font-bold mb-2">Report Not Available</h2>
                        <p className="text-gray-400 mb-6">{error || 'This interview session has no report yet.'}</p>
                        <NeonButton onClick={() => navigate('/dashboard')}>
                            Back to Dashboard
                        </NeonButton>
                    </GlassCard>
                </main>
            </div>
        );
    }

    return (
        <div className="flex bg-[#050505] min-h-screen text-white">
            <Sidebar />

            <main className="flex-1 p-6 overflow-y-auto">
                <div className="max-w-5xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <h1 className="text-3xl font-bold">Interview Report</h1>
                        <NeonButton onClick={() => navigate('/dashboard')}>
                            Back to Dashboard
                        </NeonButton>
                    </div>

                    {/* Score Card */}
                    <GlassCard className="text-center p-8">
                        <h2 className="text-xl text-gray-400 mb-4">Overall Score</h2>
                        <div className="text-7xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                            {report.score || 0}/100
                        </div>
                        <p className="text-gray-400 mt-4">
                            {report.score >= 80 ? '🎉 Excellent Performance!' :
                                report.score >= 60 ? '👍 Good Job!' :
                                    report.score > 0 ? '💪 Keep Practicing!' :
                                        '⏳ Score pending...'}
                        </p>
                    </GlassCard>

                    {/* Feedback */}
                    {report.feedback && typeof report.feedback === 'object' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {report.feedback.strengths && report.feedback.strengths.length > 0 && (
                                <GlassCard className="p-6">
                                    <h3 className="text-xl font-bold text-green-400 mb-4">✅ Strengths</h3>
                                    <ul className="space-y-2">
                                        {report.feedback.strengths.map((strength: string, i: number) => (
                                            <li key={i} className="text-gray-300">• {strength}</li>
                                        ))}
                                    </ul>
                                </GlassCard>
                            )}

                            {report.feedback.improvements && report.feedback.improvements.length > 0 && (
                                <GlassCard className="p-6">
                                    <h3 className="text-xl font-bold text-yellow-400 mb-4">💡 Areas for Improvement</h3>
                                    <ul className="space-y-2">
                                        {report.feedback.improvements.map((improvement: string, i: number) => (
                                            <li key={i} className="text-gray-300">• {improvement}</li>
                                        ))}
                                    </ul>
                                </GlassCard>
                            )}
                        </div>
                    )}

                    {/* Summary */}
                    {report.feedback?.summary && (
                        <GlassCard className="p-6">
                            <h3 className="text-xl font-bold mb-4">📝 Summary</h3>
                            <p className="text-gray-300 leading-relaxed">
                                {report.feedback.summary}
                            </p>
                        </GlassCard>
                    )}

                    {/* Transcript */}
                    {report.transcript && report.transcript.length > 0 && (
                        <GlassCard className="p-6">
                            <h3 className="text-xl font-bold mb-4">💬 Transcript</h3>
                            <div className="space-y-4 max-h-96 overflow-y-auto">
                                {report.transcript.map((msg: any, i: number) => (
                                    <div key={i} className={`${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                                        <span className="text-xs text-gray-500 block mb-1">
                                            {msg.sender === 'user' ? 'YOU' : 'AI INTERVIEWER'}
                                        </span>
                                        <div className={`inline-block px-4 py-2 rounded-lg ${msg.sender === 'user'
                                                ? 'bg-cyan-500/10 text-cyan-300'
                                                : 'bg-purple-500/10 text-purple-300'
                                            }`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </GlassCard>
                    )}

                    {/* No Data Message */}
                    {(!report.transcript || report.transcript.length === 0) && (
                        <GlassCard className="p-8 text-center">
                            <p className="text-gray-400">
                                No transcript available for this session yet.
                            </p>
                        </GlassCard>
                    )}

                    {/* Actions */}
                    <div className="flex gap-4 justify-center">
                        <NeonButton onClick={() => navigate('/resumes')}>
                            Start New Interview
                        </NeonButton>
                        <button
                            onClick={() => window.print()}
                            className="px-6 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all"
                        >
                            📄 Print Report
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
};
