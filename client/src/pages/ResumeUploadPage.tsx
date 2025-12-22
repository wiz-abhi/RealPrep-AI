import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import { GlassCard } from '../components/ui/GlassCard';
import { useAuth } from '../context/AuthContext';

export const ResumeUploadPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [dragActive, setDragActive] = useState(false);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleUpload(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleUpload(e.target.files[0]);
        }
    };

    const handleUpload = async (file: File) => {
        if (!user) return;
        navigate('/analyze', {
            state: {
                file: file,
                fileName: file.name,
                fileType: file.type
            }
        });
    };

    return (
        <div className="flex min-h-screen bg-black">
            <Sidebar />

            <main className="flex-1 ml-16 lg:ml-56 flex items-center justify-center p-8 pt-24">
                <GlassCard className="w-full max-w-lg text-center p-8">
                    <div className="mb-6">
                        <h2 className="text-2xl font-light text-white">Upload Resume</h2>
                        <p className="text-sm text-white/40 mt-2">Personalize your interview experience</p>
                    </div>

                    <div
                        className={`
                            border border-dashed rounded p-12 transition-all duration-300
                            flex flex-col items-center justify-center gap-4 cursor-pointer relative
                            ${dragActive ? 'border-white/40 bg-white/5' : 'border-white/10 hover:border-white/20 hover:bg-white/5'}
                        `}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        <input
                            type="file"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={handleChange}
                            accept=".pdf,.txt,.md,.doc,.docx"
                        />

                        <div className="w-14 h-14 rounded border border-white/10 flex items-center justify-center text-2xl opacity-50">
                            📄
                        </div>
                        <div>
                            <p className="text-sm text-white/70">Click or drag file here</p>
                            <p className="text-xs text-white/30 mt-1">PDF, DOCX, TXT, or MD</p>
                        </div>
                    </div>
                </GlassCard>
            </main>
        </div>
    );
};
