import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';
import { PageLoader } from '../components/ui/Loader';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import { GlassCard } from '../components/ui/GlassCard';
import { useAuth } from '../context/AuthContext';

export const ProfilePage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [resumes, setResumes] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProfileData();
    }, []);

    const fetchProfileData = async () => {
        try {
            const token = localStorage.getItem('token');
            const resumesRes = await fetch(`${API_BASE_URL}/api/resume/list`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const resumesData = await resumesRes.json();
            setResumes(resumesData.data || []);

            const statsRes = await fetch(`${API_BASE_URL}/api/user/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const statsData = await statsRes.json();
            setStats(statsData.data || {});
        } catch (error) {
            console.error('Failed to fetch profile data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteResume = async (resumeId: string) => {
        if (!confirm('Delete this resume?')) return;
        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_BASE_URL}/api/resume/${resumeId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchProfileData();
        } catch (error) {
            console.error('Failed to delete resume:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen bg-black">
                <Sidebar />
                <main className="flex-1 ml-16 lg:ml-56 p-8 pt-24 flex items-center justify-center">
                    <PageLoader text="Loading profile..." />
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
                        <h1 className="text-2xl font-light">Profile</h1>
                        <button
                            onClick={() => navigate('/settings')}
                            className="btn-secondary text-sm"
                        >
                            Settings
                        </button>
                    </div>

                    {/* User Info */}
                    <GlassCard className="p-6">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-xl font-light">
                                {user?.name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div>
                                <h2 className="text-xl font-light">{user?.name || 'User'}</h2>
                                <p className="text-white/40 text-sm">{user?.email}</p>
                            </div>
                        </div>
                    </GlassCard>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4">
                        <GlassCard hover className="p-5 text-center">
                            <div className="text-2xl font-light text-white/90">
                                {stats?.totalInterviews || 0}
                            </div>
                            <p className="text-[10px] uppercase tracking-widest text-white/30 mt-2">Interviews</p>
                        </GlassCard>
                        <GlassCard hover className="p-5 text-center">
                            <div className="text-2xl font-light text-white/90">
                                {stats?.averageScore || 0}
                            </div>
                            <p className="text-[10px] uppercase tracking-widest text-white/30 mt-2">Avg Score</p>
                        </GlassCard>
                        <GlassCard hover className="p-5 text-center">
                            <div className="text-2xl font-light text-white/90">
                                {resumes.length}
                            </div>
                            <p className="text-[10px] uppercase tracking-widest text-white/30 mt-2">Resumes</p>
                        </GlassCard>
                    </div>

                    {/* Resumes */}
                    <GlassCard className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">My Resumes</h3>
                            <button onClick={() => navigate('/upload')} className="btn-primary text-xs">
                                + Upload
                            </button>
                        </div>

                        <div className="space-y-3">
                            {resumes.length === 0 ? (
                                <p className="text-center text-white/30 py-8">
                                    No resumes uploaded yet.
                                </p>
                            ) : (
                                resumes.map((resume) => (
                                    <div
                                        key={resume.id}
                                        className="flex items-center justify-between p-4 rounded border border-white/5 hover:bg-white/5 transition-colors"
                                    >
                                        <div>
                                            <h4 className="text-sm text-white/80">{resume.fileUrl}</h4>
                                            <p className="text-xs text-white/30">
                                                {new Date(resume.createdAt).toLocaleDateString()}
                                            </p>
                                            <div className="flex gap-1 mt-2">
                                                {resume.skills?.slice(0, 3).map((skill: string, i: number) => (
                                                    <span
                                                        key={i}
                                                        className="px-2 py-0.5 text-[10px] rounded bg-white/5 text-white/40 border border-white/5"
                                                    >
                                                        {skill}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteResume(resume.id)}
                                            className="text-xs text-white/30 hover:text-white/60 transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </GlassCard>
                </div>
            </main>
        </div>
    );
};
