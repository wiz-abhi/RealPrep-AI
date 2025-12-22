import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import { GlassCard } from '../components/ui/GlassCard';
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
        } catch {
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
                body: JSON.stringify({ emailNotifications, interviewReminders })
            });
            setMessage('Settings saved');
        } catch {
            setMessage('Failed to save settings');
        }
    };

    const handleDeleteAccount = async () => {
        if (!confirm('Delete your account? This cannot be undone.')) return;
        if (!confirm('All data will be permanently deleted. Continue?')) return;

        try {
            const token = localStorage.getItem('token');
            await fetch('http://localhost:3000/api/user/account', {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            logout();
            navigate('/');
        } catch {
            setMessage('Failed to delete account');
        }
    };

    return (
        <div className="flex min-h-screen bg-black text-white">
            <Sidebar />

            <main className="flex-1 ml-16 lg:ml-56 p-8 pt-24">
                <div className="max-w-2xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-light">Settings</h1>
                        <button onClick={() => navigate('/profile')} className="btn-secondary text-sm">
                            Back to Profile
                        </button>
                    </div>

                    {message && (
                        <div className="p-3 rounded bg-white/5 border border-white/10 text-sm text-white/70">
                            {message}
                        </div>
                    )}

                    {/* Account */}
                    <GlassCard className="p-6">
                        <h2 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-4">Account</h2>
                        <div>
                            <label className="block text-xs text-white/30 mb-2">Email</label>
                            <input
                                type="email"
                                value={user?.email || ''}
                                disabled
                                className="w-full px-4 py-3 rounded bg-white/5 border border-white/5 text-white/40 cursor-not-allowed text-sm"
                            />
                        </div>
                    </GlassCard>

                    {/* Password */}
                    <GlassCard className="p-6">
                        <h2 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-4">Change Password</h2>
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="block text-xs text-white/30 mb-2">Current Password</label>
                                <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full px-4 py-3 rounded bg-white/5 border border-white/10 focus:border-white/30 outline-none text-sm"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-white/30 mb-2">New Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-4 py-3 rounded bg-white/5 border border-white/10 focus:border-white/30 outline-none text-sm"
                                    required
                                    minLength={6}
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-white/30 mb-2">Confirm Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-3 rounded bg-white/5 border border-white/10 focus:border-white/30 outline-none text-sm"
                                    required
                                    minLength={6}
                                />
                            </div>
                            <button type="submit" className="btn-primary text-sm">
                                Change Password
                            </button>
                        </form>
                    </GlassCard>

                    {/* Notifications */}
                    <GlassCard className="p-6">
                        <h2 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-4">Notifications</h2>
                        <div className="space-y-3">
                            <label className="flex items-center justify-between p-4 rounded border border-white/5 cursor-pointer hover:bg-white/5 transition-colors">
                                <div>
                                    <div className="text-sm text-white/80">Email Notifications</div>
                                    <div className="text-xs text-white/30">Receive updates about interviews</div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={emailNotifications}
                                    onChange={(e) => setEmailNotifications(e.target.checked)}
                                    className="w-4 h-4"
                                />
                            </label>
                            <label className="flex items-center justify-between p-4 rounded border border-white/5 cursor-pointer hover:bg-white/5 transition-colors">
                                <div>
                                    <div className="text-sm text-white/80">Interview Reminders</div>
                                    <div className="text-xs text-white/30">Get reminded to practice</div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={interviewReminders}
                                    onChange={(e) => setInterviewReminders(e.target.checked)}
                                    className="w-4 h-4"
                                />
                            </label>
                        </div>
                        <button onClick={handleSaveSettings} className="btn-primary text-sm mt-4">
                            Save Preferences
                        </button>
                    </GlassCard>

                    {/* Danger Zone */}
                    <GlassCard className="p-6 border-white/5">
                        <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-4">Danger Zone</h2>
                        <div className="p-4 rounded border border-white/5 bg-white/5">
                            <div className="text-sm text-white/60 mb-2">Delete Account</div>
                            <p className="text-xs text-white/30 mb-4">
                                This will permanently delete all your data.
                            </p>
                            <button
                                onClick={handleDeleteAccount}
                                className="px-4 py-2 rounded text-xs bg-white/5 text-white/40 border border-white/10 hover:bg-white/10 transition-colors"
                            >
                                Delete Account
                            </button>
                        </div>
                    </GlassCard>
                </div>
            </main>
        </div>
    );
};
