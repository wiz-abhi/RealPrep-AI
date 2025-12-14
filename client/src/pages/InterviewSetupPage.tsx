import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import { GlassCard } from '../components/ui/GlassCard';
import { NeonButton } from '../components/ui/NeonButton';
import { useAuth } from '../context/AuthContext';

export const InterviewSetupPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { resumeId } = location.state || {};

    const [instructionPrompt, setInstructionPrompt] = useState('');
    const [referenceFile, setReferenceFile] = useState<File | null>(null);
    const [referenceType, setReferenceType] = useState<'SamplePaper' | 'JobDescription'>('JobDescription');
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

            // Upload reference document if provided
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

            // Start interview session
            const res = await fetch('http://localhost:3000/api/interview/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: user?.id,
                    resumeId,
                    instructionPrompt: instructionPrompt || 'Conduct a comprehensive technical interview focusing on my skills and experience.'
                })
            });

            const data = await res.json();

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
            console.error('Start interview error:', err);
            setError('Failed to start interview. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const promptSuggestions = [
        "Focus on my system design and architecture skills",
        "Ask behavioral questions about teamwork and leadership",
        "Test my knowledge of data structures and algorithms",
        "Conduct a frontend development interview",
        "Focus on my AI/ML project experience",
        "Ask about my experience with cloud technologies"
    ];

    return (
        <div className="flex bg-[#050505] min-h-screen text-white">
            <Sidebar />

            <main className="flex-1 p-6 overflow-y-auto">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Header */}
                    <div>
                        <h1 className="text-3xl font-bold">Interview Setup</h1>
                        <p className="text-gray-400 mt-2">
                            Customize your interview experience with specific instructions and reference materials
                        </p>
                    </div>

                    {error && (
                        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300">
                            {error}
                        </div>
                    )}

                    {/* Interview Instructions */}
                    <GlassCard className="p-6">
                        <h2 className="text-xl font-bold mb-4">Interview Instructions</h2>
                        <p className="text-sm text-gray-400 mb-4">
                            Tell the AI interviewer what you want to focus on. Be specific about topics,
                            skills, or types of questions you'd like to practice.
                        </p>

                        <textarea
                            value={instructionPrompt}
                            onChange={(e) => setInstructionPrompt(e.target.value)}
                            placeholder="Example: Focus on my backend development experience, especially with Node.js and databases. Ask about scalability challenges I've faced and how I solved them."
                            className="w-full h-32 px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-cyan-500 focus:outline-none resize-none"
                        />

                        {/* Suggestions */}
                        <div className="mt-4">
                            <p className="text-xs text-gray-500 mb-2">Quick suggestions:</p>
                            <div className="flex flex-wrap gap-2">
                                {promptSuggestions.map((suggestion, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setInstructionPrompt(suggestion)}
                                        className="px-3 py-1 text-xs rounded-lg bg-white/5 border border-white/10 hover:border-cyan-500/50 hover:bg-white/10 transition-all"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </GlassCard>

                    {/* Reference Documents (Optional) */}
                    <GlassCard className="p-6">
                        <h2 className="text-xl font-bold mb-4">Reference Documents (Optional)</h2>
                        <p className="text-sm text-gray-400 mb-4">
                            Upload a job description or sample interview questions to help the AI tailor
                            the interview to specific requirements.
                        </p>

                        <div className="space-y-4">
                            {/* Document Type */}
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Document Type</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            value="JobDescription"
                                            checked={referenceType === 'JobDescription'}
                                            onChange={(e) => setReferenceType(e.target.value as any)}
                                            className="w-4 h-4"
                                        />
                                        <span>Job Description</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            value="SamplePaper"
                                            checked={referenceType === 'SamplePaper'}
                                            onChange={(e) => setReferenceType(e.target.value as any)}
                                            className="w-4 h-4"
                                        />
                                        <span>Sample Questions</span>
                                    </label>
                                </div>
                            </div>

                            {/* File Upload */}
                            <div className="border-2 border-dashed border-white/10 rounded-lg p-6 text-center hover:border-cyan-500/50 transition-all">
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
                                            <div className="text-4xl mb-2">📄</div>
                                            <p className="font-semibold">{referenceFile.name}</p>
                                            <p className="text-sm text-gray-400 mt-1">Click to change</p>
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="text-4xl mb-2">📎</div>
                                            <p className="font-semibold">Click to upload reference document</p>
                                            <p className="text-sm text-gray-400 mt-1">TXT, MD, or PDF files</p>
                                        </div>
                                    )}
                                </label>
                            </div>
                        </div>
                    </GlassCard>

                    {/* Action Buttons */}
                    <div className="flex gap-4">
                        <button
                            onClick={() => navigate('/resumes')}
                            className="px-6 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all"
                        >
                            ← Back to Resumes
                        </button>
                        <NeonButton
                            onClick={handleStartInterview}
                            disabled={uploading}
                            className="flex-1"
                        >
                            {uploading ? 'Starting Interview...' : 'Start Interview →'}
                        </NeonButton>
                    </div>

                    {/* Info */}
                    <GlassCard className="p-4 bg-purple-500/5 border-purple-500/20">
                        <p className="text-sm text-gray-400">
                            💡 <strong>Tip:</strong> The more specific your instructions, the better the AI can
                            tailor the interview to your needs. Reference documents help the AI understand
                            the context and ask relevant questions.
                        </p>
                    </GlassCard>
                </div>
            </main>
        </div>
    );
};
