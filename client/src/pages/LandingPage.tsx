import React from 'react';
import { useNavigate } from 'react-router-dom';
import { NeonButton } from '../components/ui/NeonButton';
import { GlassCard } from '../components/ui/GlassCard';

export const LandingPage = () => {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center gap-20">
            {/* Hero Section */}
            <section className="text-center space-y-8 mt-20 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[#00f3ff]/20 blur-[120px] rounded-full pointer-events-none" />

                <h1 className="text-6xl md:text-8xl font-black tracking-tighter relative z-10">
                    MASTER YOUR <br />
                    <span className="bg-gradient-to-r from-[#00f3ff] via-white to-[#bc13fe] bg-clip-text text-transparent animate-gradient-x">
                        NEXT INTERVIEW
                    </span>
                </h1>

                <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
                    Practice with AI agents that analyze your voice, face, and code in real-time.
                    Get detailed feedback and land your dream job.
                </p>

                <div className="flex items-center justify-center gap-6">
                    <NeonButton onClick={() => navigate('/upload')} variant="primary" className="!text-lg !px-8 !py-4">
                        Upload Resume
                    </NeonButton>
                    <NeonButton variant="secondary" glow={false} className="!text-lg !px-8 !py-4">
                        View Demo
                    </NeonButton>
                </div>
            </section>

            {/* Feature Grids */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
                <GlassCard hoverEffect className="space-y-4">
                    <div className="w-12 h-12 rounded-lg bg-[#00f3ff]/10 flex items-center justify-center border border-[#00f3ff]/20 text-[#00f3ff] text-2xl">
                        🎙️
                    </div>
                    <h3 className="text-xl font-bold">Voice & Emotion Analysis</h3>
                    <p className="text-gray-400">Real-time speech-to-text and facial emotion detection using Hume AI.</p>
                </GlassCard>

                <GlassCard hoverEffect className="space-y-4">
                    <div className="w-12 h-12 rounded-lg bg-[#bc13fe]/10 flex items-center justify-center border border-[#bc13fe]/20 text-[#bc13fe] text-2xl">
                        📄
                    </div>
                    <h3 className="text-xl font-bold">Resume Deep Scan</h3>
                    <p className="text-gray-400">Our agents scan your resume to tailor questions specifically to your experience.</p>
                </GlassCard>

                <GlassCard hoverEffect className="space-y-4">
                    <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center border border-white/20 text-white text-2xl">
                        🤖
                    </div>
                    <h3 className="text-xl font-bold">Multi-Agent System</h3>
                    <p className="text-gray-400">Different agents for Coding, Behavioral, and System Design rounds.</p>
                </GlassCard>
            </section>
        </div>
    );
};
