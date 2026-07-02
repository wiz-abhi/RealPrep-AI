import { useState } from 'react';
import { API_BASE_URL } from '../config/api';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import { GlassCard } from '../components/ui/GlassCard';
import { useAuth } from '../context/AuthContext';

export const InterviewSetupPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { resumeId } = location.state || {};

    const [instructionPrompt, setInstructionPrompt] = useState('');
    const [interviewType, setInterviewType] = useState<'technical' | 'behavioral' | 'systemDesign'>('technical');
    const [referenceFile, setReferenceFile] = useState<File | null>(null);
    const [referenceType, setReferenceType] = useState<'SamplePaper' | 'JobDescription'>('JobDescription');
    const [durationMinutes, setDurationMinutes] = useState(30);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    useState(() => {
        const prefill = localStorage.getItem('prefill_focus_topic');
        if (prefill) {
            setInstructionPrompt(`Focus on improving my weak areas: ${prefill}`);
            localStorage.removeItem('prefill_focus_topic');
        }
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setReferenceFile(e.target.files[0]);
        }
    };

    const handleStartInterview = async () => {
        if (!resumeId) {
            setError('No resume selected');
            return;
        }

        setUploading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');

            if (referenceFile) {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    const content = e.target?.result as string;
                    await fetch(`${API_BASE_URL}/api/reference/upload`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            title: referenceFile.name,
                            content,
                            type: referenceType
                        })
                    });
                };
                reader.readAsText(referenceFile);
            }

            const res = await fetch(`${API_BASE_URL}/api/interview/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: user?.id,
                    resumeId,
                    instructionPrompt: instructionPrompt || 'Conduct a comprehensive technical interview focusing on my skills and experience.',
                    interviewType,
                    durationMinutes
                })
            });

            const data = await res.json();

            if (res.status === 403 && data.error === 'Insufficient credits') {
                setError(`Insufficient credits! You need ${data.required} credits but only have ${data.available}. Contact admin for more.`);
                setUploading(false); // Ensure uploading state is reset
                return;
            }

            if (data.success) {
                navigate('/pre-join', {
                    state: {
                        sessionId: data.data.sessionId,
                        agentArgs: data.data.agentArgs,
                        durationMinutes: durationMinutes
                    }
                });
            } else {
                setError(data.error || 'Failed to start interview');
            }
        } catch (err) {
            console.error('Start interview error:', err);
            setError('Failed to start interview. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const interviewTypes = [
        { key: 'technical' as const, label: 'Technical', emoji: '💻', desc: 'DSA, coding, system concepts' },
        { key: 'behavioral' as const, label: 'Behavioral', emoji: '🤝', desc: 'STAR method, teamwork, leadership' },
        { key: 'systemDesign' as const, label: 'System Design', emoji: '🏗️', desc: 'Architecture, scalability, trade-offs' },
    ];

    const promptSuggestions = [
        "Focus on system design",
        "Behavioral questions",
        "Data structures & algorithms",
        "Frontend development",
        "AI/ML experience",
        "Cloud technologies"
    ];

    // Auto-detect interview type from quick suggestion click
    const handleSuggestionClick = (suggestion: string) => {
        setInstructionPrompt(suggestion);
        const lower = suggestion.toLowerCase();
        if (lower.includes('behavioral')) {
            setInterviewType('behavioral');
        } else if (lower.includes('system design')) {
            setInterviewType('systemDesign');
        } else {
            setInterviewType('technical');
        }
    };

    return (
        <div className="flex min-h-screen bg-black text-white">
            <Sidebar />

            <main className="flex-1 ml-16 lg:ml-56 p-8 pt-24">
                <div className="max-w-3xl mx-auto space-y-6">
                    {/* Header */}
                    <div>
                        <h1 className="text-2xl font-light text-white">Interview Setup</h1>
                        <p className="text-white/40 mt-1 text-sm">
                            Customize your practice session
                        </p>
                    </div>

                    {error && (
                        <div className="p-4 rounded bg-white/5 border border-white/10 text-white/70 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Interview Type Selector */}
                    <GlassCard className="p-6">
                        <h2 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-4">
                            Interview Type
                        </h2>
                        <div className="grid grid-cols-3 gap-3">
                            {interviewTypes.map((type) => (
                                <button
                                    key={type.key}
                                    onClick={() => setInterviewType(type.key)}
                                    className={`p-4 rounded-lg border text-left transition-all ${interviewType === type.key
                                            ? 'bg-white/10 border-white/30 ring-1 ring-white/20'
                                            : 'bg-white/5 border-white/10 hover:border-white/20'
                                        }`}
                                >
                                    <div className="text-xl mb-2">{type.emoji}</div>
                                    <div className={`text-sm font-medium ${interviewType === type.key ? 'text-white' : 'text-white/70'
                                        }`}>{type.label}</div>
                                    <div className="text-[10px] text-white/30 mt-1">{type.desc}</div>
                                </button>
                            ))}
                        </div>
                    </GlassCard>

                    {/* Instructions */}
                    <GlassCard className="p-6">
                        <h2 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-4">
                            Interview Focus <span className="text-white/30">(Optional)</span>
                        </h2>
                        <textarea
                            value={instructionPrompt}
                            onChange={(e) => setInstructionPrompt(e.target.value)}
                            placeholder="Example: Focus on my backend development experience, especially with Node.js and databases..."
                            className="w-full h-28 px-4 py-3 rounded bg-white/5 border border-white/10 focus:border-white/30 focus:outline-none resize-none text-sm text-white placeholder:text-white/20"
                        />

                        <div className="mt-4">
                            <p className="text-[10px] uppercase tracking-wider text-white/30 mb-2">Quick suggestions</p>
                            <div className="flex flex-wrap gap-2">
                                {promptSuggestions.map((suggestion, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleSuggestionClick(suggestion)}
                                        className="px-3 py-1.5 text-xs rounded bg-white/5 border border-white/5 hover:border-white/20 transition-all text-white/60 hover:text-white/90"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </GlassCard>

                    {/* Interview Duration */}
                    <GlassCard className="p-6">
                        <h2 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-4">
                            Interview Duration
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            {[5, 10, 15, 30].map((mins) => (
                                <button
                                    key={mins}
                                    onClick={() => setDurationMinutes(mins)}
                                    className={`px-4 py-2 text-sm rounded border transition-all ${durationMinutes === mins
                                        ? 'bg-white text-black border-white'
                                        : 'bg-white/5 text-white/60 border-white/10 hover:border-white/20'
                                        }`}
                                >
                                    {mins} min
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-white/30 mt-3">
                            Interview will auto-save when time expires
                        </p>

                        {/* Credit Info */}
                        <div className={`mt-4 p-3 rounded-lg border ${(user?.credits ?? 0) < durationMinutes
                            ? 'bg-red-500/10 border-red-500/20'
                            : 'bg-white/5 border-white/10'
                            }`}>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-white/50">Your credits</span>
                                <span className={`font-mono font-medium ${(user?.credits ?? 0) < durationMinutes ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {user?.credits ?? 0}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-xs mt-1">
                                <span className="text-white/50">Cost ({durationMinutes} min)</span>
                                <span className="text-white/70 font-mono">−{durationMinutes}</span>
                            </div>
                            {(user?.credits ?? 0) < durationMinutes && (
                                <p className="text-[10px] text-red-400/80 mt-2">
                                    Not enough credits.{' '}
                                    <button
                                        onClick={() => navigate('/recharge')}
                                        className="underline text-violet-400 hover:text-violet-300"
                                    >
                                        Add Credits
                                    </button>{' '}
                                    or choose a shorter duration.
                                </p>
                            )}
                        </div>
                    </GlassCard>

                    {/* Reference Documents */}
                    <GlassCard className="p-6">
                        <h2 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-4">
                            Reference Document <span className="text-white/30">(Optional)</span>
                        </h2>

                        <div className="space-y-4">
                            <div className="flex gap-6">
                                <label className="flex items-center gap-2 cursor-pointer text-sm">
                                    <input
                                        type="radio"
                                        value="JobDescription"
                                        checked={referenceType === 'JobDescription'}
                                        onChange={(e) => setReferenceType(e.target.value as any)}
                                        className="w-3 h-3"
                                    />
                                    <span className="text-white/60">Job Description</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer text-sm">
                                    <input
                                        type="radio"
                                        value="SamplePaper"
                                        checked={referenceType === 'SamplePaper'}
                                        onChange={(e) => setReferenceType(e.target.value as any)}
                                        className="w-3 h-3"
                                    />
                                    <span className="text-white/60">Sample Questions</span>
                                </label>
                            </div>

                            <div className="border border-dashed border-white/10 rounded p-6 text-center hover:border-white/20 transition-all">
                                <input
                                    type="file"
                                    onChange={handleFileChange}
                                    accept=".txt,.md,.pdf"
                                    className="hidden"
                                    id="reference-upload"
                                />
                                <label htmlFor="reference-upload" className="cursor-pointer">
                                    {referenceFile ? (
                                        <div>
                                            <div className="text-2xl mb-2 opacity-50">📄</div>
                                            <p className="text-sm text-white/80">{referenceFile.name}</p>
                                            <p className="text-xs text-white/30 mt-1">Click to change</p>
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="text-2xl mb-2 opacity-30">📎</div>
                                            <p className="text-sm text-white/50">Upload reference document</p>
                                            <p className="text-xs text-white/30 mt-1">TXT, MD, or PDF</p>
                                        </div>
                                    )}
                                </label>
                            </div>
                        </div>
                    </GlassCard>

                    {/* Actions */}
                    <div className="flex gap-4">
                        <button
                            onClick={() => navigate('/resumes')}
                            className="btn-secondary text-sm"
                        >
                            ← Back
                        </button>
                        <button
                            onClick={handleStartInterview}
                            disabled={uploading || (user?.credits ?? 0) < durationMinutes}
                            className="btn-primary flex-1 text-sm disabled:opacity-40"
                        >
                            {uploading ? 'Starting...' : (user?.credits ?? 0) < durationMinutes ? 'Insufficient Credits' : 'Start Interview →'}
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
};
