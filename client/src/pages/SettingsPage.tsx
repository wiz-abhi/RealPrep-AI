import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import { GlassCard } from '../components/ui/GlassCard';
import { useAuth } from '../context/AuthContext';
import { Key, Shield, Eye, EyeOff, Volume2 } from 'lucide-react';

// API Key localStorage keys
const API_KEY_STORAGE = {
    gemini: 'user_gemini_api_key',
    elevenlabs: 'user_elevenlabs_api_key',
    hume: 'user_hume_api_key',
    azure_key: 'user_azure_speech_key',
    azure_region: 'user_azure_speech_region',
    speech_provider: 'speech_provider'
};

export const SettingsPage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [interviewReminders, setInterviewReminders] = useState(true);
    const [message, setMessage] = useState('');

    // API Keys state
    const [geminiKey, setGeminiKey] = useState('');
    const [elevenlabsKey, setElevenlabsKey] = useState('');
    const [humeKey, setHumeKey] = useState('');
    const [azureKey, setAzureKey] = useState('');
    const [azureRegion, setAzureRegion] = useState('');
    const [speechProvider, setSpeechProvider] = useState<'elevenlabs' | 'azure'>('elevenlabs');
    const [showKeys, setShowKeys] = useState({ gemini: false, elevenlabs: false, hume: false, azure: false });

    // Get default speech provider from env
    const defaultProvider = import.meta.env.VITE_DEFAULT_SPEECH_PROVIDER || 'elevenlabs';

    // Load saved keys on mount
    useEffect(() => {
        setGeminiKey(localStorage.getItem(API_KEY_STORAGE.gemini) || '');
        setElevenlabsKey(localStorage.getItem(API_KEY_STORAGE.elevenlabs) || '');
        setHumeKey(localStorage.getItem(API_KEY_STORAGE.hume) || '');
        setAzureKey(localStorage.getItem(API_KEY_STORAGE.azure_key) || '');
        setAzureRegion(localStorage.getItem(API_KEY_STORAGE.azure_region) || '');
        const savedProvider = localStorage.getItem(API_KEY_STORAGE.speech_provider);
        setSpeechProvider((savedProvider as 'elevenlabs' | 'azure') || defaultProvider);
    }, []);

    const handleSaveApiKey = (service: 'gemini' | 'elevenlabs' | 'hume', key: string) => {
        if (key.trim()) {
            localStorage.setItem(API_KEY_STORAGE[service], key.trim());
            setMessage(`${service.charAt(0).toUpperCase() + service.slice(1)} API key saved locally`);
        } else {
            localStorage.removeItem(API_KEY_STORAGE[service]);
            setMessage(`${service.charAt(0).toUpperCase() + service.slice(1)} API key removed`);
        }
    };

    const handleClearApiKey = (service: 'gemini' | 'elevenlabs' | 'hume' | 'azure_key' | 'azure_region') => {
        localStorage.removeItem(API_KEY_STORAGE[service]);
        if (service === 'gemini') setGeminiKey('');
        if (service === 'elevenlabs') setElevenlabsKey('');
        if (service === 'hume') setHumeKey('');
        if (service === 'azure_key') setAzureKey('');
        if (service === 'azure_region') setAzureRegion('');
        setMessage(`API key cleared`);
    };

    const handleSpeechProviderChange = (provider: 'elevenlabs' | 'azure') => {
        setSpeechProvider(provider);
        localStorage.setItem(API_KEY_STORAGE.speech_provider, provider);
        setMessage(`Speech provider set to ${provider === 'azure' ? 'Azure' : 'ElevenLabs'}`);
    };

    const handleSaveAzureSettings = () => {
        if (azureKey.trim()) {
            localStorage.setItem(API_KEY_STORAGE.azure_key, azureKey.trim());
        }
        if (azureRegion.trim()) {
            localStorage.setItem(API_KEY_STORAGE.azure_region, azureRegion.trim());
        }
        setMessage('Azure settings saved locally');
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setMessage('Passwords do not match');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/user/password`, {
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
            await fetch(`${API_BASE_URL}/api/user/settings`, {
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
            await fetch(`${API_BASE_URL}/api/user/account`, {
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

                    {/* API Keys Section */}
                    <GlassCard className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Key size={16} className="text-purple-400" />
                            <h2 className="text-sm font-medium text-white/60 uppercase tracking-wider">API Keys (Optional)</h2>
                        </div>

                        {/* Security Notice */}
                        <div className="flex items-start gap-2 p-3 mb-4 rounded bg-green-500/10 border border-green-500/20">
                            <Shield size={14} className="text-green-400 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-xs text-green-400 font-medium">Your keys are secure</p>
                                <p className="text-xs text-white/40 mt-1">
                                    API keys are stored <strong>only in your browser's local storage</strong>.
                                    They are never sent to or stored on our servers.
                                </p>
                            </div>
                        </div>

                        <p className="text-xs text-white/40 mb-4">
                            Optionally use your own API keys to save platform costs. If not set, we'll use our shared keys.
                        </p>

                        <div className="space-y-4">
                            {/* Gemini API Key */}
                            <div>
                                <label className="block text-xs text-white/30 mb-2">Google Gemini API Key</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            type={showKeys.gemini ? 'text' : 'password'}
                                            value={geminiKey}
                                            onChange={(e) => setGeminiKey(e.target.value)}
                                            placeholder="AIza..."
                                            className="w-full px-4 py-3 pr-10 rounded bg-white/5 border border-white/10 focus:border-white/30 outline-none text-sm"
                                        />
                                        <button
                                            onClick={() => setShowKeys(s => ({ ...s, gemini: !s.gemini }))}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                                        >
                                            {showKeys.gemini ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => handleSaveApiKey('gemini', geminiKey)}
                                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-xs transition-colors"
                                    >
                                        Save
                                    </button>
                                    {localStorage.getItem(API_KEY_STORAGE.gemini) && (
                                        <button
                                            onClick={() => handleClearApiKey('gemini')}
                                            className="px-3 py-2 text-white/30 hover:text-white/60 text-xs"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>
                                {localStorage.getItem(API_KEY_STORAGE.gemini) && (
                                    <p className="text-[10px] text-green-400 mt-1">✓ Custom key saved</p>
                                )}
                            </div>

                            {/* ElevenLabs API Key */}
                            <div>
                                <label className="block text-xs text-white/30 mb-2">ElevenLabs API Key</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            type={showKeys.elevenlabs ? 'text' : 'password'}
                                            value={elevenlabsKey}
                                            onChange={(e) => setElevenlabsKey(e.target.value)}
                                            placeholder="sk_..."
                                            className="w-full px-4 py-3 pr-10 rounded bg-white/5 border border-white/10 focus:border-white/30 outline-none text-sm"
                                        />
                                        <button
                                            onClick={() => setShowKeys(s => ({ ...s, elevenlabs: !s.elevenlabs }))}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                                        >
                                            {showKeys.elevenlabs ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => handleSaveApiKey('elevenlabs', elevenlabsKey)}
                                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-xs transition-colors"
                                    >
                                        Save
                                    </button>
                                    {localStorage.getItem(API_KEY_STORAGE.elevenlabs) && (
                                        <button
                                            onClick={() => handleClearApiKey('elevenlabs')}
                                            className="px-3 py-2 text-white/30 hover:text-white/60 text-xs"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>
                                {localStorage.getItem(API_KEY_STORAGE.elevenlabs) && (
                                    <p className="text-[10px] text-green-400 mt-1">✓ Custom key saved</p>
                                )}
                            </div>

                            {/* Hume API Key */}
                            <div>
                                <label className="block text-xs text-white/30 mb-2">Hume AI API Key</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            type={showKeys.hume ? 'text' : 'password'}
                                            value={humeKey}
                                            onChange={(e) => setHumeKey(e.target.value)}
                                            placeholder="..."
                                            className="w-full px-4 py-3 pr-10 rounded bg-white/5 border border-white/10 focus:border-white/30 outline-none text-sm"
                                        />
                                        <button
                                            onClick={() => setShowKeys(s => ({ ...s, hume: !s.hume }))}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                                        >
                                            {showKeys.hume ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => handleSaveApiKey('hume', humeKey)}
                                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-xs transition-colors"
                                    >
                                        Save
                                    </button>
                                    {localStorage.getItem(API_KEY_STORAGE.hume) && (
                                        <button
                                            onClick={() => handleClearApiKey('hume')}
                                            className="px-3 py-2 text-white/30 hover:text-white/60 text-xs"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>
                                {localStorage.getItem(API_KEY_STORAGE.hume) && (
                                    <p className="text-[10px] text-green-400 mt-1">✓ Custom key saved</p>
                                )}
                            </div>
                        </div>
                    </GlassCard>

                    {/* Speech Provider Section */}
                    <GlassCard className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Volume2 size={16} className="text-blue-400" />
                            <h2 className="text-sm font-medium text-white/60 uppercase tracking-wider">Speech Provider</h2>
                        </div>

                        <p className="text-xs text-white/40 mb-4">
                            Choose between ElevenLabs and Azure for speech recognition and synthesis.
                        </p>

                        {/* Provider Selection */}
                        <div className="mb-4">
                            <label className="block text-xs text-white/30 mb-2">Active Provider</label>
                            <select
                                value={speechProvider}
                                onChange={(e) => handleSpeechProviderChange(e.target.value as 'elevenlabs' | 'azure')}
                                className="w-full px-4 py-3 rounded bg-white/5 border border-white/10 focus:border-white/30 outline-none text-sm text-white"
                            >
                                <option value="elevenlabs" className="bg-zinc-900">ElevenLabs</option>
                                <option value="azure" className="bg-zinc-900">Azure Speech</option>
                            </select>
                            <p className="text-[10px] text-white/30 mt-1">
                                Default from environment: {defaultProvider}
                            </p>
                        </div>

                        {/* Azure Settings (shown when Azure selected) */}
                        {speechProvider === 'azure' && (
                            <div className="space-y-4 p-4 bg-white/5 rounded border border-white/10">
                                <p className="text-xs text-blue-400 font-medium">Azure Speech Configuration</p>

                                {/* Azure Subscription Key */}
                                <div>
                                    <label className="block text-xs text-white/30 mb-2">Subscription Key</label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <input
                                                type={showKeys.azure ? 'text' : 'password'}
                                                value={azureKey}
                                                onChange={(e) => setAzureKey(e.target.value)}
                                                placeholder="Your Azure Speech subscription key"
                                                className="w-full px-4 py-3 pr-10 rounded bg-white/5 border border-white/10 focus:border-white/30 outline-none text-sm"
                                            />
                                            <button
                                                onClick={() => setShowKeys(s => ({ ...s, azure: !s.azure }))}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                                            >
                                                {showKeys.azure ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Azure Region */}
                                <div>
                                    <label className="block text-xs text-white/30 mb-2">Region</label>
                                    <input
                                        type="text"
                                        value={azureRegion}
                                        onChange={(e) => setAzureRegion(e.target.value)}
                                        placeholder="e.g., eastus, westus, southeastasia"
                                        className="w-full px-4 py-3 rounded bg-white/5 border border-white/10 focus:border-white/30 outline-none text-sm"
                                    />
                                    <p className="text-[10px] text-white/30 mt-1">
                                        Find your region in Azure Portal → Speech resource → Overview
                                    </p>
                                </div>

                                <button
                                    onClick={handleSaveAzureSettings}
                                    className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded text-xs text-blue-400 transition-colors"
                                >
                                    Save Azure Settings
                                </button>

                                {localStorage.getItem(API_KEY_STORAGE.azure_key) && (
                                    <p className="text-[10px] text-green-400">✓ Azure settings saved</p>
                                )}
                            </div>
                        )}
                    </GlassCard>

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
