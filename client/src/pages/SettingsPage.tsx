import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import { GlassCard } from '../components/ui/GlassCard';
import { NeonButton } from '../components/ui/NeonButton';
import { useAuth } from '../context/AuthContext';

export const SettingsPage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [interviewReminders, setInterviewReminders] = useState(true);
    const [message, setMessage] = useState('');

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            setMessage('Passwords do not match');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:3000/api/user/password', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ currentPassword, newPassword })
            });

            const data = await res.json();
            if (data.success) {
                setMessage('Password changed successfully');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                setMessage(data.error || 'Failed to change password');
            }
        } catch (error) {
            setMessage('Failed to change password');
        }
    };

    const handleSaveSettings = async () => {
        try {
            const token = localStorage.getItem('token');
            await fetch('http://localhost:3000/api/user/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    emailNotifications,
                    interviewReminders
                })
            });

            setMessage('Settings saved successfully');
        } catch (error) {
            setMessage('Failed to save settings');
        }
    };

    const handleDeleteAccount = async () => {
        if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            return;
        }

        if (!confirm('This will permanently delete all your data, including resumes and interview history. Continue?')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            await fetch('http://localhost:3000/api/user/account', {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            logout();
            navigate('/');
        } catch (error) {
            setMessage('Failed to delete account');
        }
    };

    return (
        <div className="flex bg-[#050505] min-h-screen text-white">
            <Sidebar />

            <main className="flex-1 p-6 overflow-y-auto">
                <div className="max-w-3xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <h1 className="text-3xl font-bold">Settings</h1>
                        <button
                            onClick={() => navigate('/profile')}
                            className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all"
                        >
                            Back to Profile
                        </button>
                    </div>

                    {/* Message */}
                    {message && (
                        <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
                            {message}
                        </div>
                    )}

                    {/* Account Settings */}
                    <GlassCard className="p-6">
                        <h2 className="text-xl font-bold mb-6">Account Settings</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Email</label>
                                <input
                                    type="email"
                                    value={user?.email || ''}
                                    disabled
                                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-gray-500 cursor-not-allowed"
                                />
                                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                            </div>
                        </div>
                    </GlassCard>

                    {/* Change Password */}
                    <GlassCard className="p-6">
                        <h2 className="text-xl font-bold mb-6">Change Password</h2>

                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Current Password</label>
                                <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-cyan-500 focus:outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-2">New Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-cyan-500 focus:outline-none"
                                    required
                                    minLength={6}
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Confirm New Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-cyan-500 focus:outline-none"
                                    required
                                    minLength={6}
                                />
                            </div>

                            <NeonButton type="submit">
                                Change Password
                            </NeonButton>
                        </form>
                    </GlassCard>

                    {/* Notification Preferences */}
                    <GlassCard className="p-6">
                        <h2 className="text-xl font-bold mb-6">Notification Preferences</h2>

                        <div className="space-y-4">
                            <label className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-all">
                                <div>
                                    <div className="font-semibold">Email Notifications</div>
                                    <div className="text-sm text-gray-400">Receive updates about your interviews</div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={emailNotifications}
                                    onChange={(e) => setEmailNotifications(e.target.checked)}
                                    className="w-5 h-5 rounded bg-white/10 border-white/20 text-cyan-500 focus:ring-cyan-500"
                                />
                            </label>

                            <label className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-all">
                                <div>
                                    <div className="font-semibold">Interview Reminders</div>
                                    <div className="text-sm text-gray-400">Get reminded to practice regularly</div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={interviewReminders}
                                    onChange={(e) => setInterviewReminders(e.target.checked)}
                                    className="w-5 h-5 rounded bg-white/10 border-white/20 text-cyan-500 focus:ring-cyan-500"
                                />
                            </label>
                        </div>

                        <div className="mt-6">
                            <NeonButton onClick={handleSaveSettings}>
                                Save Preferences
                            </NeonButton>
                        </div>
                    </GlassCard>

                    {/* Privacy Settings */}
                    <GlassCard className="p-6">
                        <h2 className="text-xl font-bold mb-6">Privacy</h2>

                        <div className="space-y-4">
                            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                <div className="font-semibold mb-2">Data Retention</div>
                                <p className="text-sm text-gray-400">
                                    Your interview data is stored securely and only accessible by you.
                                    We retain your data for as long as your account is active.
                                </p>
                            </div>

                            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                <div className="font-semibold mb-2">Resume Privacy</div>
                                <p className="text-sm text-gray-400">
                                    Your resumes are private and only used to generate personalized interview questions.
                                    They are never shared with third parties.
                                </p>
                            </div>
                        </div>
                    </GlassCard>

                    {/* Danger Zone */}
                    <GlassCard className="p-6 border-red-500/20">
                        <h2 className="text-xl font-bold text-red-400 mb-6">Danger Zone</h2>

                        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                            <div className="font-semibold text-red-400 mb-2">Delete Account</div>
                            <p className="text-sm text-gray-400 mb-4">
                                Once you delete your account, there is no going back. This will permanently delete
                                all your data including resumes, interview history, and reports.
                            </p>
                            <button
                                onClick={handleDeleteAccount}
                                className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30 transition-all"
                            >
                                Delete My Account
                            </button>
                        </div>
                    </GlassCard>
                </div>
            </main>
        </div>
    );
};
