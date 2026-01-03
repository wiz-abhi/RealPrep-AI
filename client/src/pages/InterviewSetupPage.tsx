import { useState } from 'react';
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
    const [referenceFile, setReferenceFile] = useState<File | null>(null);
    const [referenceType, setReferenceType] = useState<'SamplePaper' | 'JobDescription'>('JobDescription');
    const [durationMinutes, setDurationMinutes] = useState(30);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

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
                    await fetch('http://localhost:3000/api/reference/upload', {
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

            const res = await fetch('http://localhost:3000/api/interview/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: user?.id,
                    resumeId,
                    instructionPrompt: instructionPrompt || 'Conduct a comprehensive technical interview focusing on my skills and experience.',
                    durationMinutes
                })
            });

            const data = await res.json();

            if (data.success) {
                navigate('/pre-join', {
                    state: {
                        sessionId: data.data.sessionId,
                        agentArgs: data.data.agentArgs
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

    const promptSuggestions = [
        "Focus on system design",
        "Behavioral questions",
        "Data structures & algorithms",
        "Frontend development",
        "AI/ML experience",
        "Cloud technologies"
    ];

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

                    {/* Instructions */}
                    <GlassCard className="p-6">
                        <h2 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-4">
                            Interview Focus
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
                                        onClick={() => setInstructionPrompt(suggestion)}
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
                            disabled={uploading}
                            className="btn-primary flex-1 text-sm"
                        >
                            {uploading ? 'Starting...' : 'Start Interview →'}
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
};
