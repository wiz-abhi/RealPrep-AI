import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import { GlassCard } from '../components/ui/GlassCard';
import { NeonButton } from '../components/ui/NeonButton';
import { useAuth } from '../context/AuthContext';

export const ResumesPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [resumes, setResumes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchResumes();
    }, []);

    const fetchResumes = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:3000/api/resume/list', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setResumes(data.data || []);
        } catch (error) {
            console.error('Failed to fetch resumes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectResume = (resumeId: string) => {
        navigate('/interview-setup', { state: { resumeId } });
    };

    if (loading) {
        return (
            <div className="flex bg-[#050505] min-h-screen">
                <Sidebar />
                <main className="flex-1 p-6 flex items-center justify-center">
                    <div className="text-white text-xl">Loading resumes...</div>
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
                        <div>
                            <h1 className="text-3xl font-bold">My Resumes</h1>
                            <p className="text-gray-400 mt-2">
                                Select a resume to start an interview or upload a new one
                            </p>
                        </div>
                        <NeonButton onClick={() => navigate('/upload')}>
                            + Upload New Resume
                        </NeonButton>
                    </div>

                    {/* Resumes Grid */}
                    {resumes.length === 0 ? (
                        <GlassCard className="p-12 text-center">
                            <div className="text-6xl mb-4">📄</div>
                            <h3 className="text-xl font-bold mb-2">No Resumes Yet</h3>
                            <p className="text-gray-400 mb-6">
                                Upload your first resume to get started with AI mock interviews
                            </p>
                            <NeonButton onClick={() => navigate('/upload')}>
                                Upload Resume
                            </NeonButton>
                        </GlassCard>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {resumes.map((resume) => (
                                <GlassCard
                                    key={resume.id}
                                    className="p-6 hover:scale-105 transition-transform cursor-pointer"
                                    onClick={() => handleSelectResume(resume.id)}
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center text-2xl">
                                                📄
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg">{resume.fileUrl}</h3>
                                                <p className="text-sm text-gray-400">
                                                    Uploaded {new Date(resume.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs border border-green-500/20">
                                            Indexed ✓
                                        </div>
                                    </div>

                                    {/* Skills Preview */}
                                    {resume.skills && resume.skills.length > 0 && (
                                        <div className="mb-4">
                                            <p className="text-xs text-gray-500 mb-2">Skills Detected:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {resume.skills.slice(0, 6).map((skill: string, i: number) => (
                                                    <span
                                                        key={i}
                                                        className="px-2 py-1 text-xs rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                                                    >
                                                        {skill}
                                                    </span>
                                                ))}
                                                {resume.skills.length > 6 && (
                                                    <span className="px-2 py-1 text-xs text-gray-500">
                                                        +{resume.skills.length - 6} more
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSelectResume(resume.id);
                                        }}
                                        className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-white/10 hover:border-cyan-500/50 transition-all text-sm font-semibold"
                                    >
                                        Start Interview →
                                    </button>
                                </GlassCard>
                            ))}
                        </div>
                    )}

                    {/* Info Card */}
                    <GlassCard className="p-6 bg-cyan-500/5 border-cyan-500/20">
                        <h3 className="font-bold mb-2">💡 Resume Reuse</h3>
                        <p className="text-sm text-gray-400">
                            Your resumes are indexed using RAG (Retrieval-Augmented Generation).
                            This means you can reuse them for multiple interviews without re-uploading.
                            The AI will ask personalized questions based on your skills and experience.
                        </p>
                    </GlassCard>
                </div>
            </main>
        </div>
    );
};
