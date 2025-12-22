import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../components/ui/GlassCard';

export const PricingPage = () => {
    const navigate = useNavigate();
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

    const plans = [
        {
            name: 'Free',
            price: { monthly: 0, yearly: 0 },
            description: 'Try out the platform',
            features: ['3 interviews/month', 'Basic AI interviewer', 'Resume analysis', 'Performance reports'],
            cta: 'Get Started',
            popular: false
        },
        {
            name: 'Pro',
            price: { monthly: 19, yearly: 190 },
            description: 'For serious job seekers',
            features: ['Unlimited interviews', 'Advanced AI with RAG', 'Emotion analysis', 'Voice interaction', 'Progress tracking', 'Priority support'],
            cta: 'Start Pro Trial',
            popular: true
        },
        {
            name: 'Enterprise',
            price: { monthly: null, yearly: null },
            description: 'For teams',
            features: ['Everything in Pro', 'Team management', 'Custom scenarios', 'API access', 'Dedicated support'],
            cta: 'Contact Sales',
            popular: false
        }
    ];

    const faqs = [
        { question: 'Can I cancel anytime?', answer: 'Yes, cancel anytime. Access continues until billing period ends.' },
        { question: 'Do you offer refunds?', answer: '7-day money-back guarantee for all paid plans.' },
        { question: 'Is there a student discount?', answer: 'Yes, students get 50% off Pro plans with valid ID.' }
    ];

    return (
        <div className="min-h-screen bg-black text-white pt-32 px-6 pb-20">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <p className="text-sm uppercase tracking-[0.3em] text-white/40 mb-4">Pricing</p>
                    <h1 className="text-4xl font-light mb-4">Simple, Transparent Pricing</h1>
                    <p className="text-white/50 mb-8">Choose the plan that's right for you</p>

                    {/* Toggle */}
                    <div className="inline-flex items-center gap-1 p-1 rounded bg-white/5 border border-white/5">
                        <button
                            onClick={() => setBillingCycle('monthly')}
                            className={`px-4 py-2 rounded text-sm transition-all ${billingCycle === 'monthly' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
                                }`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setBillingCycle('yearly')}
                            className={`px-4 py-2 rounded text-sm transition-all ${billingCycle === 'yearly' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
                                }`}
                        >
                            Yearly <span className="text-[10px] text-white/30">save 17%</span>
                        </button>
                    </div>
                </div>

                {/* Plans */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
                    {plans.map((plan, index) => (
                        <GlassCard
                            key={index}
                            className={`p-6 relative ${plan.popular ? 'border-white/20' : ''}`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded text-[10px] bg-white text-black font-medium">
                                    Popular
                                </div>
                            )}

                            <h3 className="text-lg font-medium mb-1">{plan.name}</h3>
                            <p className="text-sm text-white/40 mb-4">{plan.description}</p>

                            <div className="mb-6">
                                {plan.price[billingCycle] !== null ? (
                                    <>
                                        <span className="text-3xl font-light">${plan.price[billingCycle]}</span>
                                        <span className="text-white/30 text-sm">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                                    </>
                                ) : (
                                    <span className="text-xl font-light">Custom</span>
                                )}
                            </div>

                            <button
                                onClick={() => navigate('/register')}
                                className={`w-full mb-6 text-sm ${plan.popular ? 'btn-primary' : 'btn-secondary'}`}
                            >
                                {plan.cta}
                            </button>

                            <div className="space-y-2">
                                {plan.features.map((feature, i) => (
                                    <div key={i} className="flex items-start gap-2 text-xs text-white/50">
                                        <span className="text-white/30 mt-0.5">•</span>
                                        {feature}
                                    </div>
                                ))}
                            </div>
                        </GlassCard>
                    ))}
                </div>

                {/* FAQ */}
                <div className="max-w-2xl mx-auto">
                    <h2 className="text-xl font-light text-center mb-8 text-white/70">FAQ</h2>
                    <div className="space-y-3">
                        {faqs.map((faq, index) => (
                            <GlassCard key={index} className="p-5">
                                <h3 className="text-sm font-medium text-white/80 mb-2">{faq.question}</h3>
                                <p className="text-sm text-white/40">{faq.answer}</p>
                            </GlassCard>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
