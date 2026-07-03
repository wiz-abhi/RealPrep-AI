import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../components/ui/GlassCard';
import { useAuth } from '../context/AuthContext';

// Honest pricing: the product runs on credits (1 credit = 1 minute of
// interview, ₹1 = 2 credits via Razorpay). No fictional subscription tiers.
export const PricingPage = () => {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();

    const goBuy = () => navigate(isAuthenticated ? '/recharge' : '/register');

    const packs = [
        {
            name: 'Free Starter',
            price: '₹0',
            credits: '50 credits',
            minutes: '50 minutes of interviews',
            description: 'Every new account starts here',
            features: ['50 free credits on signup', 'All interview types', 'AI feedback reports', 'Emotion analysis'],
            cta: 'Create Account',
            popular: false,
        },
        {
            name: 'Practice Pack',
            price: '₹100',
            credits: '200 credits',
            minutes: '~6-13 full interviews',
            description: 'For an active prep week',
            features: ['200 credits (200 minutes)', 'Voice + hands-free mode', 'Code execution & evaluation', 'Improvement plans', 'Unused minutes refunded on early exit'],
            cta: 'Buy Credits',
            popular: true,
        },
        {
            name: 'Placement Season',
            price: '₹500',
            credits: '1000 credits',
            minutes: '~30-60 full interviews',
            description: 'Serious interview preparation',
            features: ['1000 credits (1000 minutes)', 'Everything in Practice Pack', 'Track progress across sessions', 'Best value per minute'],
            cta: 'Buy Credits',
            popular: false,
        },
    ];

    const faqs = [
        { question: 'How do credits work?', answer: '1 credit = 1 minute of interview time. Credits are deducted when an interview starts, and unused whole minutes are refunded if you end early.' },
        { question: 'How much do credits cost?', answer: '₹1 buys 2 credits. You can top up any amount from ₹1 via Razorpay (UPI, cards, netbanking).' },
        { question: 'Do credits expire?', answer: 'No. Your credits stay on your account until you use them.' },
        { question: 'Is there really a free tier?', answer: 'Yes — every new account gets 50 credits (50 minutes) free. No card required.' },
    ];

    return (
        <div className="min-h-screen bg-black text-white pt-32 px-6 pb-20">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <p className="text-sm uppercase tracking-[0.3em] text-white/40 mb-4">Pricing</p>
                    <h1 className="text-4xl font-light mb-4">Pay Only For What You Use</h1>
                    <p className="text-white/50">
                        No subscriptions. 1 credit = 1 minute of interview. ₹1 = 2 credits.
                    </p>
                </div>

                {/* Credit packs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
                    {packs.map((pack, index) => (
                        <GlassCard
                            key={index}
                            className={`p-6 relative flex flex-col ${pack.popular ? 'border-white/20' : ''}`}
                        >
                            {pack.popular && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded text-[10px] bg-white text-black font-medium">
                                    Popular
                                </div>
                            )}
                            <div className="mb-6">
                                <h3 className="text-lg font-light mb-1">{pack.name}</h3>
                                <p className="text-xs text-white/40">{pack.description}</p>
                            </div>
                            <div className="mb-6">
                                <div className="text-4xl font-light">{pack.price}</div>
                                <div className="text-sm text-emerald-400/80 mt-1">{pack.credits}</div>
                                <div className="text-xs text-white/40">{pack.minutes}</div>
                            </div>
                            <ul className="space-y-2.5 mb-8 flex-1">
                                {pack.features.map((f, i) => (
                                    <li key={i} className="text-sm text-white/60 flex items-start gap-2">
                                        <span className="text-white/30 mt-0.5">✓</span>
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={goBuy}
                                className={pack.popular ? 'btn-primary w-full text-sm' : 'btn-secondary w-full text-sm'}
                            >
                                {isAuthenticated && pack.name === 'Free Starter' ? 'Already Yours ✓' : pack.cta}
                            </button>
                        </GlassCard>
                    ))}
                </div>

                {/* FAQ */}
                <div className="max-w-2xl mx-auto">
                    <h2 className="text-xl font-light text-center mb-8">Frequently Asked Questions</h2>
                    <div className="space-y-4">
                        {faqs.map((faq, i) => (
                            <GlassCard key={i} className="p-5">
                                <h3 className="text-sm font-medium text-white/80 mb-2">{faq.question}</h3>
                                <p className="text-sm text-white/50 leading-relaxed">{faq.answer}</p>
                            </GlassCard>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
