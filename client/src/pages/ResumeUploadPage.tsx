import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

        // Navigate immediately to analyze page with the file
        navigate('/analyze', {
            state: {
                file: file,
                fileName: file.name,
                fileType: file.type
            }
        });
    };

    return (
        <div className="flex items-center justify-center min-h-[70vh]">
            <GlassCard className="w-full max-w-xl text-center space-y-8">
                <h2 className="text-3xl font-bold">Start Your Session</h2>
                <p className="text-gray-400">Upload your resume to personalize the interview agents.</p>

                <div
                    className={`
            border-2 border-dashed rounded-xl p-12 transition-all duration-300
            flex flex-col items-center justify-center gap-4 cursor-pointer relative
            ${dragActive ? 'border-[#00f3ff] bg-[#00f3ff]/5' : 'border-gray-700 hover:border-[#00f3ff]/50 hover:bg-white/5'}
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

                    <div className="w-16 h-16 rounded-full bg-[#00f3ff]/10 flex items-center justify-center text-3xl">
                        📄
                    </div>
                    <div>
                        <p className="font-bold text-lg">Click or Drag Resume Here</p>
                        <p className="text-sm text-gray-500">PDF, DOCX, TXT, or MD files supported</p>
                    </div>
                </div>
            </GlassCard>
        </div>
    );
};
