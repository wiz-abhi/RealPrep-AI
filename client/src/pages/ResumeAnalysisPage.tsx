import { useState, useEffect } from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import { ScannerOverlay } from '../components/ui/ScannerOverlay';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ResumeAnalysisPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { file, fileName, fileType, resumeId: existingResumeId, skills: existingSkills } = location.state || {};

    const [analyzing, setAnalyzing] = useState(true);
    const [progress, setProgress] = useState(0);
    const [resumeId, setResumeId] = useState(existingResumeId);
    const [skills, setSkills] = useState(existingSkills || []);
    const [error, setError] = useState('');

    useEffect(() => {
        if (file && !resumeId) {
            uploadFile();
        }
    }, [file]);

    const uploadFile = async () => {
        if (!file || !user) return;

        try {
            let content: string;

            if (fileType === 'application/pdf') {
                const arrayBuffer = await file.arrayBuffer();
                const base64 = btoa(
                    new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
                );
                content = `data:application/pdf;base64,${base64}`;
            } else {
                content = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target?.result as string);
                    reader.onerror = reject;
                    reader.readAsText(file);
                });
            }

            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:3000/api/resume/upload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: user.id,
                    content,
                    fileType,
                    fileName
                })
            });

            const data = await res.json();
            if (data.success) {
                setResumeId(data.data.id);
                setSkills(data.data.skills || []);
            } else {
                setError(data.error || 'Upload failed');
            }
        } catch (err) {
            console.error("Upload failed", err);
            setError('Failed to upload resume');
        }
    };

    useEffect(() => {
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    setAnalyzing(false);
                    return 100;
                }
                return prev + 2;
            });
        }, 30);
        return () => clearInterval(interval);
    }, []);

    const handleStartInterview = async () => {
        if (!user || !resumeId) {
            setError('Resume not ready. Please try uploading again.');
            return;
        }
        navigate('/interview-setup', { state: { resumeId, skills } });
    };

    return (
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 min-h-screen pt-32 px-6 pb-20">
            {/* Left: Insights */}
            <GlassCard className="flex flex-col gap-6 p-6">
                <h2 className="text-lg font-light flex items-center gap-2">
                    {error ? '❌ Upload Failed' : analyzing ? (
                        <><span className="animate-pulse">⚡</span> Analyzing...</>
                    ) : "✅ Analysis Complete"}
                </h2>

                {error && <p className="text-sm text-white/50">{error}</p>}

                <div className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-white/40">
                            <span>{analyzing ? "Scanning..." : "Ready"}</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-white/40 transition-all duration-100"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>

                    <div className="space-y-3 pt-4">
                        <h3 className="text-[10px] uppercase tracking-widest text-white/30">Detected Skills</h3>
                        <div className="flex flex-wrap gap-2">
                            {skills && skills.map((skill: string, i: number) => (
                                progress > (i * 10) && (
                                    <span
                                        key={i}
                                        className="px-2 py-1 rounded bg-white/5 text-white/60 text-[10px] border border-white/5"
                                    >
                                        {skill}
                                    </span>
                                )
                            ))}
                            {(!skills || skills.length === 0) && (
                                <span className="text-white/30 text-xs">No skills detected yet.</span>
                            )}
                        </div>
                    </div>
                </div>

                {!analyzing && resumeId && !error && (
                    <button
                        onClick={handleStartInterview}
                        className="btn-primary mt-auto w-full text-sm"
                    >
                        Continue to Setup →
                    </button>
                )}
            </GlassCard>

            {/* Right: Preview */}
            <GlassCard className="relative p-0 overflow-hidden flex items-center justify-center bg-white/5">
                <ScannerOverlay active={analyzing} />

                <div className="text-center space-y-4 opacity-40">
                    <div className="w-16 h-20 border border-dashed border-white/20 rounded mx-auto flex items-center justify-center text-2xl">
                        📄
                    </div>
                    <p className="text-xs text-white/50">{fileName || 'Resume Preview'}</p>
                </div>
            </GlassCard>
        </div>
    );
};
