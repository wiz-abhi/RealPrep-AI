import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../components/ui/GlassCard';
import { NeonButton } from '../components/ui/NeonButton';

export const FeaturesPage = () => {
    const navigate = useNavigate();

    const features = [
        {
            icon: '🤖',
            title: 'AI-Powered Interviewer',
            description: 'Practice with an intelligent AI that asks relevant questions based on your resume and experience.',
            details: [
                'Context-aware questions using RAG',
                'Adaptive difficulty based on your responses',
                'Industry-specific interview scenarios'
            ]
        },
        {
            icon: '😊',
            title: 'Facial Expression Analysis',
            description: 'Real-time emotion tracking to help you improve your non-verbal communication during interviews.',
            details: [
                'Live emotion detection via webcam',
                'Stress level monitoring',
                'Confidence metrics and feedback'
            ]
        },
        {
            icon: '🎯',
            title: 'Personalized Feedback',
            description: 'Get detailed insights on your performance with actionable recommendations for improvement.',
            details: [
                'Strengths and weaknesses analysis',
                'Specific areas for improvement',
                'Progress tracking over time'
            ]
        },
        {
            icon: '📊',
            title: 'Detailed Reports',
            description: 'Comprehensive post-interview reports with scores, transcripts, and emotion analysis.',
            details: [
                'Overall performance score',
                'Full conversation transcript',
                'Emotion timeline charts'
            ]
        },
        {
            icon: '🎤',
            title: 'Voice Interaction',
            description: 'Natural voice-based interviews using advanced speech-to-text and text-to-speech technology.',
            details: [
                'High-quality voice synthesis',
                'Accurate speech recognition',
                'Natural conversation flow'
            ]
        },
        {
            icon: '📝',
            title: 'Resume Analysis',
            description: 'Upload your resume and get intelligent questions tailored to your skills and experience.',
            details: [
                'Automatic skill extraction',
                'Experience-based questioning',
                'PDF and document support'
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-[#050505] text-white">
            {/* Hero Section */}
            <section className="relative py-20 px-6 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 to-transparent" />
                <div className="max-w-6xl mx-auto text-center relative z-10">
                    <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                        AI-Powered Mock Interviews
                    </h1>
                    <p className="text-xl text-gray-400 mb-8 max-w-3xl mx-auto">
                        Practice interviews with cutting-edge AI technology. Get real-time feedback,
                        emotion analysis, and personalized coaching to ace your next interview.
                    </p>
                    <div className="flex gap-4 justify-center">
                        <NeonButton onClick={() => navigate('/register')}>
                            Get Started Free
                        </NeonButton>
                        <button
                            onClick={() => navigate('/pricing')}
                            className="px-8 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all"
                        >
                            View Pricing
                        </button>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-20 px-6">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-3xl font-bold text-center mb-12">
                        Everything You Need to Succeed
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((feature, index) => (
                            <GlassCard
                                key={index}
                                className="p-6 hover:scale-105 transition-transform duration-300"
                            >
                                <div className="text-5xl mb-4">{feature.icon}</div>
                                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                                <p className="text-gray-400 mb-4">{feature.description}</p>
                                <ul className="space-y-2">
                                    {feature.details.map((detail, i) => (
                                        <li key={i} className="text-sm text-gray-500 flex items-start gap-2">
                                            <span className="text-cyan-400 mt-1">✓</span>
                                            {detail}
                                        </li>
                                    ))}
                                </ul>
                            </GlassCard>
                        ))}
                    </div>
                </div>
            </section>

            {/* Benefits Section */}
            <section className="py-20 px-6 bg-gradient-to-b from-transparent to-purple-500/5">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-3xl font-bold text-center mb-12">
                        Why Choose Our Platform?
                    </h2>

                    <div className="space-y-6">
                        <GlassCard className="p-6">
                            <h3 className="text-xl font-bold text-cyan-400 mb-3">🚀 Practice Anytime, Anywhere</h3>
                            <p className="text-gray-400">
                                No need to schedule with a human interviewer. Practice at your own pace,
                                whenever you want, from the comfort of your home.
                            </p>
                        </GlassCard>

                        <GlassCard className="p-6">
                            <h3 className="text-xl font-bold text-purple-400 mb-3">💰 Cost-Effective</h3>
                            <p className="text-gray-400">
                                Get unlimited practice sessions at a fraction of the cost of traditional
                                interview coaching services.
                            </p>
                        </GlassCard>

                        <GlassCard className="p-6">
                            <h3 className="text-xl font-bold text-green-400 mb-3">📈 Track Your Progress</h3>
                            <p className="text-gray-400">
                                Monitor your improvement over time with detailed analytics and performance metrics.
                                See exactly where you're getting better.
                            </p>
                        </GlassCard>

                        <GlassCard className="p-6">
                            <h3 className="text-xl font-bold text-yellow-400 mb-3">🔒 Private & Secure</h3>
                            <p className="text-gray-400">
                                Your data is encrypted and never shared. Practice in a safe, judgment-free
                                environment where you can make mistakes and learn.
                            </p>
                        </GlassCard>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <GlassCard className="p-12">
                        <h2 className="text-4xl font-bold mb-6">
                            Ready to Ace Your Next Interview?
                        </h2>
                        <p className="text-xl text-gray-400 mb-8">
                            Join thousands of job seekers who have improved their interview skills with our platform.
                        </p>
                        <NeonButton onClick={() => navigate('/register')}>
                            Start Your First Interview
                        </NeonButton>
                    </GlassCard>
                </div>
            </section>
        </div>
    );
};
