import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import { GlassCard } from '../components/ui/GlassCard';
import { Sparkles, Brain, Heart, Target, ChevronDown, ChevronUp } from 'lucide-react';

export const ReportPage = () => {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [improvementPlan, setImprovementPlan] = useState<any>(null);
    const [loadingPlan, setLoadingPlan] = useState(false);
    const [showPlan, setShowPlan] = useState(false);

    useEffect(() => {
        fetchReport();
    }, [sessionId]);

    const fetchReport = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/interview/report/${sessionId}`, {
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

    const generateImprovementPlan = async () => {
        setLoadingPlan(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/interview/improvement-plan`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ sessionId })
            });
            const data = await res.json();
            if (data.success) {
                setImprovementPlan(data.data);
                setShowPlan(true);
            }
        } catch (err) {
            console.error('Failed to generate improvement plan:', err);
        } finally {
            setLoadingPlan(false);
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

    const emotionalAnalysis = report.feedback?.emotionalAnalysis;

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

                    {/* Emotional Analysis */}
                    {emotionalAnalysis && (emotionalAnalysis.dominantEmotions?.length > 0 || emotionalAnalysis.stressPoints > 0) && (
                        <GlassCard className="p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <Heart size={16} className="text-pink-400" />
                                <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">Emotional Analysis</h3>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="text-center p-3 bg-white/5 rounded-lg">
                                    <div className="text-2xl font-light text-green-400">{emotionalAnalysis.averageConfidence || 0}%</div>
                                    <div className="text-[10px] text-white/40 uppercase mt-1">Confidence</div>
                                </div>
                                <div className="text-center p-3 bg-white/5 rounded-lg">
                                    <div className="text-2xl font-light text-yellow-400">{emotionalAnalysis.averageNervousness || 0}%</div>
                                    <div className="text-[10px] text-white/40 uppercase mt-1">Nervousness</div>
                                </div>
                                <div className="text-center p-3 bg-white/5 rounded-lg">
                                    <div className="text-2xl font-light text-red-400">{emotionalAnalysis.stressPoints || 0}</div>
                                    <div className="text-[10px] text-white/40 uppercase mt-1">Stress Points</div>
                                </div>
                                <div className="text-center p-3 bg-white/5 rounded-lg">
                                    <div className={`text-2xl font-light ${emotionalAnalysis.emotionTrend === 'improving' ? 'text-green-400' :
                                        emotionalAnalysis.emotionTrend === 'declining' ? 'text-red-400' : 'text-white/60'
                                        }`}>
                                        {emotionalAnalysis.emotionTrend === 'improving' ? '↑' :
                                            emotionalAnalysis.emotionTrend === 'declining' ? '↓' : '→'}
                                    </div>
                                    <div className="text-[10px] text-white/40 uppercase mt-1">Trend</div>
                                </div>
                            </div>
                            {emotionalAnalysis.dominantEmotions?.length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {emotionalAnalysis.dominantEmotions.map((emotion: string, i: number) => (
                                        <span key={i} className="px-2 py-1 bg-white/5 rounded text-xs text-white/60">
                                            {emotion}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </GlassCard>
                    )}

                    {/* Feedback */}
                    {report.feedback && typeof report.feedback === 'object' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {report.feedback.strengths?.length > 0 && (
                                <GlassCard className="p-5">
                                    <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-4">Strengths</h3>
                                    <ul className="space-y-2">
                                        {report.feedback.strengths.map((s: string, i: number) => (
                                            <li key={i} className="text-sm text-white/70 flex items-start gap-2">
                                                <span className="text-green-400">✓</span>
                                                {s}
                                            </li>
                                        ))}
                                    </ul>
                                </GlassCard>
                            )}

                            {report.feedback.improvements?.length > 0 && (
                                <GlassCard className="p-5">
                                    <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-4">Areas to Improve</h3>
                                    <ul className="space-y-2">
                                        {report.feedback.improvements.map((s: string, i: number) => (
                                            <li key={i} className="text-sm text-white/70 flex items-start gap-2">
                                                <span className="text-yellow-400">→</span>
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

                    {/* Improvement Plan Section */}
                    <GlassCard className="p-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Sparkles size={16} className="text-purple-400" />
                                <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">Personalized Improvement Plan</h3>
                            </div>
                            {!improvementPlan && (
                                <button
                                    onClick={generateImprovementPlan}
                                    disabled={loadingPlan}
                                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
                                >
                                    {loadingPlan ? 'Generating...' : 'Generate Plan'}
                                </button>
                            )}
                            {improvementPlan && (
                                <button
                                    onClick={() => setShowPlan(!showPlan)}
                                    className="text-white/40 hover:text-white/60"
                                >
                                    {showPlan ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </button>
                            )}
                        </div>

                        {showPlan && improvementPlan && (
                            <div className="mt-6 space-y-6">
                                {/* Technical Plan */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Brain size={14} className="text-blue-400" />
                                        <h4 className="text-xs font-medium text-white/50 uppercase">Technical Development</h4>
                                    </div>
                                    <div className="space-y-3 pl-5">
                                        {improvementPlan.technicalPlan?.gaps?.length > 0 && (
                                            <div>
                                                <p className="text-[10px] text-white/30 mb-1">Knowledge Gaps</p>
                                                <ul className="space-y-1">
                                                    {improvementPlan.technicalPlan.gaps.map((g: string, i: number) => (
                                                        <li key={i} className="text-xs text-white/60">• {g}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {improvementPlan.technicalPlan?.resources?.length > 0 && (
                                            <div>
                                                <p className="text-[10px] text-white/30 mb-1">Recommended Resources</p>
                                                <ul className="space-y-1">
                                                    {improvementPlan.technicalPlan.resources.map((r: string, i: number) => (
                                                        <li key={i} className="text-xs text-white/60">• {r}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {improvementPlan.technicalPlan?.timeline && (
                                            <p className="text-xs text-white/40">Timeline: {improvementPlan.technicalPlan.timeline}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Communication Plan */}
                                {improvementPlan.communicationPlan && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <Target size={14} className="text-green-400" />
                                            <h4 className="text-xs font-medium text-white/50 uppercase">Communication Skills</h4>
                                        </div>
                                        <div className="space-y-3 pl-5">
                                            <p className="text-xs text-white/60">{improvementPlan.communicationPlan.currentLevel}</p>
                                            {improvementPlan.communicationPlan.techniques?.length > 0 && (
                                                <ul className="space-y-1">
                                                    {improvementPlan.communicationPlan.techniques.map((t: string, i: number) => (
                                                        <li key={i} className="text-xs text-white/60">• {t}</li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Emotional Readiness */}
                                {improvementPlan.emotionalReadiness && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <Heart size={14} className="text-pink-400" />
                                            <h4 className="text-xs font-medium text-white/50 uppercase">Emotional Readiness</h4>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-5">
                                            {improvementPlan.emotionalReadiness.stressManagement?.length > 0 && (
                                                <div>
                                                    <p className="text-[10px] text-white/30 mb-1">Stress Management</p>
                                                    <ul className="space-y-1">
                                                        {improvementPlan.emotionalReadiness.stressManagement.map((s: string, i: number) => (
                                                            <li key={i} className="text-xs text-white/60">• {s}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                            {improvementPlan.emotionalReadiness.confidenceBuilding?.length > 0 && (
                                                <div>
                                                    <p className="text-[10px] text-white/30 mb-1">Confidence Building</p>
                                                    <ul className="space-y-1">
                                                        {improvementPlan.emotionalReadiness.confidenceBuilding.map((c: string, i: number) => (
                                                            <li key={i} className="text-xs text-white/60">• {c}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                            {improvementPlan.emotionalReadiness.interviewAnxiety?.length > 0 && (
                                                <div>
                                                    <p className="text-[10px] text-white/30 mb-1">Interview Anxiety</p>
                                                    <ul className="space-y-1">
                                                        {improvementPlan.emotionalReadiness.interviewAnxiety.map((a: string, i: number) => (
                                                            <li key={i} className="text-xs text-white/60">• {a}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Action Items */}
                                {improvementPlan.actionItems?.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-medium text-white/50 uppercase mb-3">Action Items</h4>
                                        <div className="space-y-2">
                                            {improvementPlan.actionItems.map((item: any, i: number) => (
                                                <div key={i} className="flex items-center gap-3 p-2 bg-white/5 rounded">
                                                    <span className={`px-2 py-0.5 text-[10px] rounded ${item.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                                                        item.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                                            'bg-green-500/20 text-green-400'
                                                        }`}>
                                                        {item.priority}
                                                    </span>
                                                    <span className="text-xs text-white/70 flex-1">{item.task}</span>
                                                    <span className="text-[10px] text-white/30">{item.deadline}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Overall Advice */}
                                {improvementPlan.overallAdvice && (
                                    <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/20">
                                        <p className="text-sm text-white/70 italic">{improvementPlan.overallAdvice}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </GlassCard>

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
