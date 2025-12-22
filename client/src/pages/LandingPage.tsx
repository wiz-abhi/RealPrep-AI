import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../components/ui/GlassCard';

export const LandingPage = () => {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center min-h-screen pt-32 px-6">
            {/* Hero Section */}
            <section className="text-center space-y-8 max-w-4xl mx-auto">
                <div className="space-y-4">
                    <p className="text-sm uppercase tracking-[0.3em] text-white/40">
                        AI-Powered Interview Practice
                    </p>
                    <h1 className="text-5xl md:text-7xl font-extralight tracking-tight text-white leading-tight">
                        Master Your
                        <br />
                        <span className="font-normal">Next Interview</span>
                    </h1>
                </div>

                <p className="text-lg text-white/50 max-w-2xl mx-auto leading-relaxed font-light">
                    Practice with AI agents that analyze your voice, expression, and code in real-time.
                    Get detailed feedback and land your dream role.
                </p>

                <div className="flex items-center justify-center gap-4 pt-4">
                    <button
                        onClick={() => navigate('/upload')}
                        className="btn-primary text-sm tracking-wide"
                    >
                        Upload Resume
                    </button>
                    <button
                        onClick={() => navigate('/features')}
                        className="btn-secondary text-sm tracking-wide"
                    >
                        Learn More
                    </button>
                </div>
            </section>

            {/* Feature Cards */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mt-24">
                <GlassCard hover className="space-y-4">
                    <div className="w-10 h-10 rounded border border-white/10 flex items-center justify-center text-lg">
                        🎙️
                    </div>
                    <h3 className="text-lg font-medium text-white/90">Voice Analysis</h3>
                    <p className="text-sm text-white/40 leading-relaxed">
                        Real-time speech-to-text and emotional tone detection for comprehensive feedback.
                    </p>
                </GlassCard>

                <GlassCard hover className="space-y-4">
                    <div className="w-10 h-10 rounded border border-white/10 flex items-center justify-center text-lg">
                        📄
                    </div>
                    <h3 className="text-lg font-medium text-white/90">Resume Analysis</h3>
                    <p className="text-sm text-white/40 leading-relaxed">
                        Intelligent scanning to tailor questions specifically to your experience and skills.
                    </p>
                </GlassCard>

                <GlassCard hover className="space-y-4">
                    <div className="w-10 h-10 rounded border border-white/10 flex items-center justify-center text-lg">
                        🤖
                    </div>
                    <h3 className="text-lg font-medium text-white/90">Multi-Agent System</h3>
                    <p className="text-sm text-white/40 leading-relaxed">
                        Specialized agents for Coding, Behavioral, and System Design interview rounds.
                    </p>
                </GlassCard>
            </section>

            {/* Bottom Spacer */}
            <div className="h-24" />
        </div>
    );
};
