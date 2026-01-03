import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import { GlassCard } from '../components/ui/GlassCard';

export const ResumesPage = () => {
    const navigate = useNavigate();
    const [resumes, setResumes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchResumes();
    }, []);

    const fetchResumes = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/resume/list`, {
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

    const handleDeleteResume = async (e: React.MouseEvent, resumeId: string) => {
        e.stopPropagation();
        if (!confirm('Delete this resume?')) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/resume/${resumeId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setResumes(prev => prev.filter(r => r.id !== resumeId));
            }
        } catch (error) {
            console.error('Delete failed:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen bg-black">
                <Sidebar />
                <main className="flex-1 p-8 pt-24 flex items-center justify-center">
                    <div className="text-white/30">Loading...</div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-black">
            <Sidebar />

            <main className="flex-1 ml-16 lg:ml-56 p-8 pt-24">
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-light text-white">Your Resumes</h1>
                            <p className="text-white/40 mt-1 text-sm">Select a resume to start practicing</p>
                        </div>
                        <button
                            onClick={() => navigate('/upload')}
                            className="btn-primary text-sm"
                        >
                            + Upload New
                        </button>
                    </div>

                    {/* Resumes Grid */}
                    {resumes.length === 0 ? (
                        <GlassCard className="p-12 text-center">
                            <div className="text-4xl mb-4 opacity-30">📄</div>
                            <h3 className="text-lg font-light mb-2 text-white/80">No Resumes Yet</h3>
                            <p className="text-white/40 text-sm mb-6">
                                Upload your first resume to get started
                            </p>
                            <button
                                onClick={() => navigate('/upload')}
                                className="btn-primary text-sm"
                            >
                                Upload Resume
                            </button>
                        </GlassCard>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {resumes.map((resume) => (
                                <GlassCard
                                    key={resume.id}
                                    hover
                                    className="p-5 relative group"
                                    onClick={() => handleSelectResume(resume.id)}
                                >
                                    <button
                                        onClick={(e) => handleDeleteResume(e, resume.id)}
                                        className="absolute top-4 right-4 p-2 text-white/20 hover:text-white/60 rounded transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        ✕
                                    </button>

                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="w-10 h-10 rounded border border-white/10 flex items-center justify-center text-sm">
                                            📄
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm font-medium text-white/90 truncate">{resume.fileUrl}</h3>
                                            <p className="text-xs text-white/30">
                                                {new Date(resume.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>

                                    {resume.skills && resume.skills.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-4">
                                            {resume.skills.slice(0, 4).map((skill: string, i: number) => (
                                                <span
                                                    key={i}
                                                    className="px-2 py-0.5 text-[10px] rounded bg-white/5 text-white/50 border border-white/5"
                                                >
                                                    {skill}
                                                </span>
                                            ))}
                                            {resume.skills.length > 4 && (
                                                <span className="px-2 py-0.5 text-[10px] text-white/30">
                                                    +{resume.skills.length - 4}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSelectResume(resume.id);
                                        }}
                                        className="w-full btn-secondary text-xs"
                                    >
                                        Start Interview →
                                    </button>
                                </GlassCard>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};
