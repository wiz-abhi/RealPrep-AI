import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import { ScannerOverlay } from '../components/ui/ScannerOverlay';
import { NeonButton } from '../components/ui/NeonButton';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ResumeAnalysisPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { file, fileName, fileType, resumeId: existingResumeId, skills: existingSkills } = location.state || {};

    const [analyzing, setAnalyzing] = useState(true);
    const [progress, setProgress] = useState(0);
    const [starting, setStarting] = useState(false);
    const [resumeId, setResumeId] = useState(existingResumeId);
    const [skills, setSkills] = useState(existingSkills || []);
    const [error, setError] = useState('');

    useEffect(() => {
        // If we have a file, upload it
        if (file && !resumeId) {
            uploadFile();
        }
    }, [file]);

    const uploadFile = async () => {
        if (!file || !user) return;

        try {
            let content: string;

            // Handle PDF files
            if (fileType === 'application/pdf') {
                const arrayBuffer = await file.arrayBuffer();
                const base64 = btoa(
                    new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
                );
                content = `data:application/pdf;base64,${base64}`;
            } else {
                // Handle text files
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
        // Simulate scanning visual
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

        setStarting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:3000/api/interview/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: user.id,
                    resumeId: resumeId,
                    instructionPrompt: "Focus on my weak areas identified in the resume."
                })
            });

            const data = await res.json();
            console.log('Start interview response:', data);

            if (data.success) {
                navigate('/interview', {
                    state: {
                        sessionId: data.data.sessionId,
                        agentArgs: data.data.agentArgs
                    }
                });
            } else {
                setError(data.error || 'Failed to start interview');
            }
        } catch (err) {
            console.error("Failed to start", err);
            setError('Failed to start interview. Please try again.');
        } finally {
            setStarting(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 h-[80vh]">
            {/* Left Side: Real-time Insights */}
            <GlassCard className="flex flex-col gap-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    {error ? '❌ Upload Failed' : analyzing ? <><span className="animate-pulse">⚡</span> Analysis In Progress</> : "✅ Analysis Complete"}
                </h2>

                {error && <p className="text-red-400 text-sm">{error}</p>}

                <div className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm text-gray-400">
                            <span>{analyzing ? "Scanning Resume..." : "Ready to Interview"}</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-[#00f3ff] to-[#bc13fe] transition-all duration-100"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>

                    <div className="space-y-3 pt-4">
                        <h3 className="tex-sm uppercase tracking-widest text-gray-500">Detected Skills</h3>
                        <div className="flex flex-wrap gap-2">
                            {skills && skills.map((skill: string, i: number) => (
                                progress > (i * 10) && (
                                    <span key={i} className="px-3 py-1 rounded bg-[#00f3ff]/10 text-[#00f3ff] text-xs border border-[#00f3ff]/20 animate-fade-in">
                                        {skill}
                                    </span>
                                )
                            ))}
                            {!skills && <span className="text-gray-500 text-sm">No skills detected or mock mode.</span>}
                        </div>
                    </div>
                </div>

                {!analyzing && resumeId && !error && (
                    <NeonButton onClick={handleStartInterview} className="mt-auto w-full justify-center" disabled={starting}>
                        {starting ? "Initializing Agent..." : "Start Interview Session →"}
                    </NeonButton>
                )}
            </GlassCard>

            {/* Right Side: Resume Preview with Scanner */}
            <GlassCard className="relative p-0 overflow-hidden flex items-center justify-center bg-white/5">
                <ScannerOverlay active={analyzing} />

                <div className="text-center space-y-4 opacity-50">
                    <div className="w-20 h-24 border-2 border-dashed border-gray-600 rounded mx-auto flex items-center justify-center">
                        📄
                    </div>
                    <p className="text-sm">{fileName || 'Resume Preview'}</p>
                </div>
            </GlassCard>
        </div>
    );
};
