import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';
import { PageLoader } from '../components/ui/Loader';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import { GlassCard } from '../components/ui/GlassCard';
import { Sparkles, Brain, Heart, Target, ChevronDown, ChevronUp, Activity } from 'lucide-react';
import { SimpleMarkdown } from '../components/ui/SimpleMarkdown';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

// Transform raw emotionHistory entries into chart points: composure (Joy) vs
// stress (Fear + Anxiety) sampled at each snapshot during the interview.
const buildEmotionTimeline = (emotionHistory: any[]): any[] => {
    if (!Array.isArray(emotionHistory) || emotionHistory.length === 0) return [];
    return emotionHistory.map((entry: any, i: number) => {
        const get = (name: string) =>
            entry.emotions?.find((e: any) => e.name === name)?.score || 0;
        return {
            index: i + 1,
            confidence: Math.round(get('Joy') * 100),
            stress: Math.round((get('Fear') + get('Anxiety')) * 50),
        };
    });
};

export const ReportPage = () => {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [improvementPlan, setImprovementPlan] = useState<any>(null);
    const [loadingPlan, setLoadingPlan] = useState(false);
    const [showPlan, setShowPlan] = useState(false);
    const [expandedQuestions, setExpandedQuestions] = useState<Record<number, boolean>>({});

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
                // Use the persisted plan if one was already generated for this session.
                if (data.data?.feedback?.improvementPlan) {
                    setImprovementPlan(data.data.feedback.improvementPlan);
                }
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
                <main className="flex-1 ml-16 lg:ml-56 p-8 pt-24 flex items-center justify-center">
                    <PageLoader text="Loading report..." />
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
    const emotionTimeline = buildEmotionTimeline(report.feedback?.emotionHistory || []);

    return (
        <div className="flex min-h-screen bg-black text-white">
            <div className="print:hidden">
                <Sidebar />
            </div>

            <main className="flex-1 ml-16 lg:ml-56 p-8 pt-24 print:ml-0 print:p-4 print:pt-4">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-light">Interview Report</h1>
                        <button onClick={() => navigate('/dashboard')} className="btn-secondary text-sm print:hidden">
                            Back to Dashboard
                        </button>
                    </div>

                    {/* Score & Skill Dimensions */}
                    {(() => {
                        const technical = report.feedback?.technicalAccuracy || 70;
                        const communication = report.feedback?.communicationSkills || 70;
                        const problemSolving = report.feedback?.problemSolving || 70;

                        const center = 120;
                        const radius = 80;
                        const getCoordinates = (score: number, angle: number) => {
                            const val = (score / 100) * radius;
                            const x = center + val * Math.cos(angle);
                            const y = center + val * Math.sin(angle);
                            return { x, y };
                        };

                        const angles = [-Math.PI / 2, Math.PI / 6, 5 * Math.PI / 6];
                        
                        const p1 = getCoordinates(technical, angles[0]);
                        const p2 = getCoordinates(communication, angles[1]);
                        const p3 = getCoordinates(problemSolving, angles[2]);

                        const gridPoints = [25, 50, 75, 100].map(level => {
                            const pt1 = getCoordinates(level, angles[0]);
                            const pt2 = getCoordinates(level, angles[1]);
                            const pt3 = getCoordinates(level, angles[2]);
                            return `${pt1.x},${pt1.y} ${pt2.x},${pt2.y} ${pt3.x},${pt3.y}`;
                        });

                        const lbl1 = getCoordinates(115, angles[0]);
                        const lbl2 = getCoordinates(115, angles[1]);
                        const lbl3 = getCoordinates(115, angles[2]);

                        return (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Overall Score */}
                                <GlassCard className="text-center p-8 flex flex-col justify-center items-center">
                                    <p className="text-[10px] uppercase tracking-widest text-white/30 mb-4">Overall Score</p>
                                    <div className="text-6xl font-light text-white/90 mb-2">
                                        {report.score || 0}<span className="text-sm text-white/40">/100</span>
                                    </div>
                                    <p className="text-sm text-white/50 mb-4">
                                        {report.score >= 80 ? 'Excellent Performance' :
                                            report.score >= 60 ? 'Good Job' :
                                                report.score > 0 ? 'Keep Practicing' :
                                                    'Score pending...'}
                                    </p>
                                    <div className="flex gap-4 mt-2">
                                        <div className="text-center px-4 py-2 bg-white/5 rounded border border-white/5">
                                            <div className="text-sm font-semibold text-emerald-400">{technical}</div>
                                            <div className="text-[8px] text-white/40 uppercase">Tech</div>
                                        </div>
                                        <div className="text-center px-4 py-2 bg-white/5 rounded border border-white/5">
                                            <div className="text-sm font-semibold text-cyan-400">{communication}</div>
                                            <div className="text-[8px] text-white/40 uppercase">Comm</div>
                                        </div>
                                        <div className="text-center px-4 py-2 bg-white/5 rounded border border-white/5">
                                            <div className="text-sm font-semibold text-purple-400">{problemSolving}</div>
                                            <div className="text-[8px] text-white/40 uppercase">Problem</div>
                                        </div>
                                    </div>
                                </GlassCard>

                                {/* Radar Chart */}
                                <GlassCard className="p-6 flex flex-col justify-center items-center">
                                    <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider mb-4">Skills Dimension</h3>
                                    <svg width="240" height="240" className="overflow-visible">
                                        {/* Grid Circles/Polygons */}
                                        {gridPoints.map((points, idx) => (
                                            <polygon
                                                key={idx}
                                                points={points}
                                                fill="none"
                                                stroke="rgba(255, 255, 255, 0.08)"
                                                strokeWidth="1"
                                            />
                                        ))}
                                        {/* Axes */}
                                        {angles.map((angle, idx) => {
                                            const end = getCoordinates(100, angle);
                                            return (
                                                <line
                                                    key={idx}
                                                    x1={center}
                                                    y1={center}
                                                    x2={end.x}
                                                    y2={end.y}
                                                    stroke="rgba(255, 255, 255, 0.1)"
                                                    strokeWidth="1"
                                                    strokeDasharray="2,2"
                                                />
                                            );
                                        })}
                                        {/* Labels */}
                                        <text x={lbl1.x} y={lbl1.y} textAnchor="middle" alignmentBaseline="middle" className="text-[9px] fill-white/60 font-medium">Technical</text>
                                        <text x={lbl2.x + 5} y={lbl2.y} textAnchor="start" alignmentBaseline="middle" className="text-[9px] fill-white/60 font-medium">Communication</text>
                                        <text x={lbl3.x - 5} y={lbl3.y} textAnchor="end" alignmentBaseline="middle" className="text-[9px] fill-white/60 font-medium">Problem Solving</text>

                                        {/* Scores Polygon */}
                                        <polygon
                                            points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`}
                                            fill="rgba(16, 185, 129, 0.15)"
                                            stroke="rgba(16, 185, 129, 0.85)"
                                            strokeWidth="2"
                                            className="drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                                        />

                                        {/* Interactive Dots */}
                                        <circle cx={p1.x} cy={p1.y} r="3" fill="#10b981" />
                                        <circle cx={p2.x} cy={p2.y} r="3" fill="#06b6d4" />
                                        <circle cx={p3.x} cy={p3.y} r="3" fill="#a855f7" />
                                    </svg>
                                </GlassCard>
                            </div>
                        );
                    })()}

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

                    {/* Emotion Timeline (Phase 4.3) */}
                    {emotionTimeline.length >= 3 && (
                        <GlassCard className="p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <Activity size={16} className="text-cyan-400" />
                                <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">Composure Over Time</h3>
                            </div>
                            <div className="h-52">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={emotionTimeline} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                                        <XAxis
                                            dataKey="index"
                                            stroke="rgba(255,255,255,0.2)"
                                            tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
                                            label={{ value: 'During interview →', position: 'insideBottom', offset: -2, fontSize: 9, fill: 'rgba(255,255,255,0.3)' }}
                                        />
                                        <YAxis
                                            domain={[0, 100]}
                                            stroke="rgba(255,255,255,0.2)"
                                            tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
                                        />
                                        <Tooltip
                                            contentStyle={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
                                            labelFormatter={(v) => `Snapshot ${v}`}
                                        />
                                        <ReferenceLine y={50} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
                                        <Line type="monotone" dataKey="confidence" name="Confidence" stroke="#34d399" strokeWidth={2} dot={false} />
                                        <Line type="monotone" dataKey="stress" name="Stress" stroke="#f87171" strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex gap-4 justify-center mt-2 text-[10px] text-white/40">
                                <span className="flex items-center gap-1.5"><span className="w-2 h-0.5 bg-emerald-400 inline-block" /> Confidence</span>
                                <span className="flex items-center gap-1.5"><span className="w-2 h-0.5 bg-red-400 inline-block" /> Stress</span>
                            </div>
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

                    {/* Per-Question Analysis */}
                    {report.feedback?.questionAnalysis && report.feedback.questionAnalysis.length > 0 && (
                        <GlassCard className="p-5">
                            <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-4">Question-by-Question Analysis</h3>
                            <div className="space-y-4">
                                {report.feedback.questionAnalysis.map((item: any, i: number) => {
                                    const isExpanded = !!expandedQuestions[i];
                                    const itemScore = item.score ?? 70;
                                    const scoreColor = itemScore >= 80 ? 'text-green-400 border-green-500/25 bg-green-500/5' :
                                                       itemScore >= 60 ? 'text-yellow-400 border-yellow-500/25 bg-yellow-500/5' :
                                                       'text-red-400 border-red-500/25 bg-red-500/5';
                                    return (
                                        <div key={i} className="border border-white/5 rounded-lg overflow-hidden bg-white/2">
                                            <button
                                                onClick={() => {
                                                    setExpandedQuestions(prev => ({
                                                        ...prev,
                                                        [i]: !prev[i]
                                                    }));
                                                }}
                                                className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-all gap-4"
                                            >
                                                <div className="flex-1">
                                                    <span className="text-[9px] uppercase tracking-wider text-white/30">Question {i + 1}</span>
                                                    <h4 className="text-xs font-medium text-white/80 line-clamp-1 mt-0.5">{item.question}</h4>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className={`px-2 py-0.5 text-xs rounded border ${scoreColor}`}>
                                                        {itemScore}/100
                                                    </span>
                                                    {isExpanded ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
                                                </div>
                                            </button>
                                            {isExpanded && (
                                                <div className="p-4 border-t border-white/5 bg-black/40 space-y-3">
                                                    <div>
                                                        <span className="text-[9px] uppercase tracking-wider text-white/30">Question</span>
                                                        <p className="text-xs text-white/80 mt-1">{item.question}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-[9px] uppercase tracking-wider text-white/30">Your Answer</span>
                                                        <p className="text-xs text-white/70 mt-1 whitespace-pre-wrap bg-white/5 p-2.5 rounded border border-white/5">{item.answer || '(No response provided)'}</p>
                                                    </div>
                                                    {item.feedback && (
                                                        <div>
                                                            <span className="text-[9px] uppercase tracking-wider text-white/30">AI Feedback</span>
                                                            <div className="text-xs text-white/80 mt-1 border-l-2 border-emerald-500 pl-3 py-0.5">
                                                                <SimpleMarkdown text={item.feedback} />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
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
                                            <SimpleMarkdown text={msg.text} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </GlassCard>
                    )}

                    {/* Actions */}
                    {(() => {
                        const handlePracticeWeakAreas = () => {
                            const improvements = report.feedback?.improvements || [];
                            const focusTopic = improvements.slice(0, 2).join(', ');
                            localStorage.setItem('prefill_focus_topic', focusTopic);
                            navigate('/resumes');
                        };

                        return (
                            <div className="flex gap-4 justify-center pt-4 print:hidden">
                                {report.feedback?.improvements?.length > 0 && (
                                    <button 
                                        onClick={handlePracticeWeakAreas} 
                                        className="btn-primary text-sm bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium border-0 hover:opacity-90 transition-all cursor-pointer"
                                    >
                                        Practice Weak Areas
                                    </button>
                                )}
                                <button onClick={() => navigate('/resumes')} className="btn-secondary text-sm">
                                    New Interview
                                </button>
                                <button
                                    onClick={() => window.print()}
                                    className="btn-secondary text-sm"
                                >
                                    Print Report
                                </button>
                            </div>
                        );
                    })()}
                </div>
            </main>
        </div>
    );
};
