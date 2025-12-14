import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import { GlassCard } from '../components/ui/GlassCard';
import { NeonButton } from '../components/ui/NeonButton';
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

            // Fetch resumes
            const resumesRes = await fetch('http://localhost:3000/api/resume/list', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const resumesData = await resumesRes.json();
            setResumes(resumesData.data || []);

            // Fetch stats
            const statsRes = await fetch('http://localhost:3000/api/user/stats', {
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
        if (!confirm('Are you sure you want to delete this resume?')) return;

        try {
            const token = localStorage.getItem('token');
            await fetch(`http://localhost:3000/api/resume/${resumeId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // Refresh list
            fetchProfileData();
        } catch (error) {
            console.error('Failed to delete resume:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex bg-[#050505] min-h-screen">
                <Sidebar />
                <main className="flex-1 p-6 flex items-center justify-center">
                    <div className="text-white text-xl">Loading profile...</div>
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
                        <h1 className="text-3xl font-bold">Profile</h1>
                        <NeonButton onClick={() => navigate('/settings')}>
                            Settings
                        </NeonButton>
                    </div>

                    {/* User Info */}
                    <GlassCard className="p-6">
                        <div className="flex items-center gap-6">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center text-3xl font-bold">
                                {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">{user?.name || 'User'}</h2>
                                <p className="text-gray-400">{user?.email}</p>
                                <p className="text-sm text-gray-500 mt-2">
                                    Member since {new Date().toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    </GlassCard>

                    {/* Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <GlassCard className="p-6 text-center">
                            <div className="text-4xl font-bold text-cyan-400">
                                {stats?.totalInterviews || 0}
                            </div>
                            <p className="text-gray-400 mt-2">Total Interviews</p>
                        </GlassCard>

                        <GlassCard className="p-6 text-center">
                            <div className="text-4xl font-bold text-purple-400">
                                {stats?.averageScore || 0}
                            </div>
                            <p className="text-gray-400 mt-2">Average Score</p>
                        </GlassCard>

                        <GlassCard className="p-6 text-center">
                            <div className="text-4xl font-bold text-green-400">
                                {resumes.length}
                            </div>
                            <p className="text-gray-400 mt-2">Resumes Uploaded</p>
                        </GlassCard>
                    </div>

                    {/* Resumes */}
                    <GlassCard className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold">My Resumes</h3>
                            <NeonButton onClick={() => navigate('/upload')}>
                                + Upload New
                            </NeonButton>
                        </div>

                        <div className="space-y-4">
                            {resumes.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">
                                    No resumes uploaded yet. Upload one to get started!
                                </p>
                            ) : (
                                resumes.map((resume) => (
                                    <div
                                        key={resume.id}
                                        className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                                    >
                                        <div>
                                            <h4 className="font-semibold">{resume.fileUrl}</h4>
                                            <p className="text-sm text-gray-400">
                                                Uploaded {new Date(resume.createdAt).toLocaleDateString()}
                                            </p>
                                            <div className="flex gap-2 mt-2">
                                                {resume.skills?.slice(0, 3).map((skill: string, i: number) => (
                                                    <span
                                                        key={i}
                                                        className="px-2 py-1 text-xs rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                                                    >
                                                        {skill}
                                                    </span>
                                                ))}
                                                {resume.skills?.length > 3 && (
                                                    <span className="px-2 py-1 text-xs text-gray-500">
                                                        +{resume.skills.length - 3} more
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteResume(resume.id)}
                                            className="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </GlassCard>

                    {/* Most Practiced Skills */}
                    {stats?.topSkills && stats.topSkills.length > 0 && (
                        <GlassCard className="p-6">
                            <h3 className="text-xl font-bold mb-4">Most Practiced Skills</h3>
                            <div className="flex flex-wrap gap-3">
                                {stats.topSkills.map((skill: string, i: number) => (
                                    <span
                                        key={i}
                                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-white/10"
                                    >
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </GlassCard>
                    )}
                </div>
            </main>
        </div>
    );
};
