import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../components/ui/GlassCard';

export const FeaturesPage = () => {
    const navigate = useNavigate();

    const features = [
        {
            icon: '🤖',
            title: 'AI-Powered Interviewer',
            description: 'Practice with an intelligent AI that asks relevant questions based on your resume.',
            details: [
                'Context-aware questions using RAG',
                'Adaptive difficulty',
                'Industry-specific scenarios'
            ]
        },
        {
            icon: '😊',
            title: 'Facial Expression Analysis',
            description: 'Real-time emotion tracking to improve your non-verbal communication.',
            details: [
                'Live emotion detection',
                'Stress level monitoring',
                'Confidence metrics'
            ]
        },
        {
            icon: '🎯',
            title: 'Personalized Feedback',
            description: 'Detailed insights with actionable recommendations for improvement.',
            details: [
                'Strengths & weaknesses analysis',
                'Areas for improvement',
                'Progress tracking'
            ]
        },
        {
            icon: '📊',
            title: 'Detailed Reports',
            description: 'Comprehensive post-interview reports with scores and transcripts.',
            details: [
                'Performance scoring',
                'Full transcripts',
                'Emotion timeline'
            ]
        },
        {
            icon: '🎤',
            title: 'Voice Interaction',
            description: 'Natural voice-based interviews with speech recognition.',
            details: [
                'High-quality synthesis',
                'Accurate recognition',
                'Natural flow'
            ]
        },
        {
            icon: '📝',
            title: 'Resume Analysis',
            description: 'Get questions tailored to your skills and experience.',
            details: [
                'Automatic skill extraction',
                'Experience-based questioning',
                'Document support'
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-black text-white pt-32 px-6">
            {/* Hero */}
            <section className="max-w-5xl mx-auto text-center mb-20">
                <p className="text-sm uppercase tracking-[0.3em] text-white/40 mb-4">
                    Platform Features
                </p>
                <h1 className="text-4xl md:text-5xl font-light mb-6">
                    AI-Powered Mock Interviews
                </h1>
                <p className="text-lg text-white/50 max-w-2xl mx-auto mb-8">
                    Practice with cutting-edge AI technology. Get real-time feedback,
                    emotion analysis, and personalized coaching.
                </p>
                <div className="flex gap-4 justify-center">
                    <button
                        onClick={() => navigate('/register')}
                        className="btn-primary text-sm"
                    >
                        Get Started Free
                    </button>
                    <button
                        onClick={() => navigate('/pricing')}
                        className="btn-secondary text-sm"
                    >
                        View Pricing
                    </button>
                </div>
            </section>

            {/* Features Grid */}
            <section className="max-w-5xl mx-auto mb-20">
                <h2 className="text-xl font-light text-center mb-12 text-white/70">
                    Everything You Need to Succeed
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {features.map((feature, index) => (
                        <GlassCard
                            key={index}
                            hover
                            className="p-5"
                        >
                            <div className="text-3xl mb-3 opacity-70">{feature.icon}</div>
                            <h3 className="text-base font-medium mb-2 text-white/90">{feature.title}</h3>
                            <p className="text-sm text-white/40 mb-4">{feature.description}</p>
                            <ul className="space-y-1.5">
                                {feature.details.map((detail, i) => (
                                    <li key={i} className="text-xs text-white/30 flex items-start gap-2">
                                        <span className="text-white/50 mt-0.5">•</span>
                                        {detail}
                                    </li>
                                ))}
                            </ul>
                        </GlassCard>
                    ))}
                </div>
            </section>

            {/* Benefits */}
            <section className="max-w-3xl mx-auto mb-20">
                <h2 className="text-xl font-light text-center mb-12 text-white/70">
                    Why Choose Us?
                </h2>

                <div className="space-y-4">
                    <GlassCard className="p-5">
                        <h3 className="text-sm font-medium text-white/80 mb-2">🚀 Practice Anytime</h3>
                        <p className="text-sm text-white/40">
                            No scheduling needed. Practice at your own pace, whenever you want.
                        </p>
                    </GlassCard>

                    <GlassCard className="p-5">
                        <h3 className="text-sm font-medium text-white/80 mb-2">💰 Cost-Effective</h3>
                        <p className="text-sm text-white/40">
                            Unlimited practice at a fraction of traditional coaching costs.
                        </p>
                    </GlassCard>

                    <GlassCard className="p-5">
                        <h3 className="text-sm font-medium text-white/80 mb-2">📈 Track Progress</h3>
                        <p className="text-sm text-white/40">
                            Monitor improvement with detailed analytics and metrics.
                        </p>
                    </GlassCard>

                    <GlassCard className="p-5">
                        <h3 className="text-sm font-medium text-white/80 mb-2">🔒 Private & Secure</h3>
                        <p className="text-sm text-white/40">
                            Your data is encrypted. Practice in a judgment-free environment.
                        </p>
                    </GlassCard>
                </div>
            </section>

            {/* CTA */}
            <section className="max-w-3xl mx-auto text-center pb-20">
                <GlassCard className="p-10">
                    <h2 className="text-2xl font-light mb-4">
                        Ready to Ace Your Next Interview?
                    </h2>
                    <p className="text-white/40 mb-6">
                        Join thousands who have improved their interview skills.
                    </p>
                    <button
                        onClick={() => navigate('/register')}
                        className="btn-primary text-sm"
                    >
                        Start Your First Interview
                    </button>
                </GlassCard>
            </section>
        </div>
    );
};
