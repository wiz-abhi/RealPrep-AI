import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../components/ui/GlassCard';
import { NeonButton } from '../components/ui/NeonButton';

export const PricingPage = () => {
    const navigate = useNavigate();
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

    const plans = [
        {
            name: 'Free',
            price: { monthly: 0, yearly: 0 },
            description: 'Perfect for trying out the platform',
            features: [
                '3 interviews per month',
                'Basic AI interviewer',
                'Resume analysis',
                'Performance reports',
                'Email support'
            ],
            limitations: [
                'No emotion analysis',
                'Limited question variety',
                'Basic feedback only'
            ],
            cta: 'Get Started',
            popular: false
        },
        {
            name: 'Pro',
            price: { monthly: 19, yearly: 190 },
            description: 'For serious job seekers',
            features: [
                'Unlimited interviews',
                'Advanced AI with RAG',
                'Facial expression analysis',
                'Detailed emotion metrics',
                'Voice interaction',
                'Resume optimization tips',
                'Priority support',
                'Progress tracking',
                'Download reports as PDF'
            ],
            limitations: [],
            cta: 'Start Pro Trial',
            popular: true
        },
        {
            name: 'Enterprise',
            price: { monthly: null, yearly: null },
            description: 'For teams and organizations',
            features: [
                'Everything in Pro',
                'Team management dashboard',
                'Custom interview scenarios',
                'API access',
                'White-label option',
                'Dedicated account manager',
                'Custom integrations',
                'SLA guarantee',
                'Advanced analytics'
            ],
            limitations: [],
            cta: 'Contact Sales',
            popular: false
        }
    ];

    const faqs = [
        {
            question: 'Can I cancel anytime?',
            answer: 'Yes! You can cancel your subscription at any time. Your access will continue until the end of your billing period.'
        },
        {
            question: 'Do you offer refunds?',
            answer: 'We offer a 7-day money-back guarantee for all paid plans. If you\'re not satisfied, contact us for a full refund.'
        },
        {
            question: 'What payment methods do you accept?',
            answer: 'We accept all major credit cards (Visa, Mastercard, American Express) and PayPal.'
        },
        {
            question: 'Can I upgrade or downgrade my plan?',
            answer: 'Yes! You can change your plan at any time. Upgrades take effect immediately, while downgrades apply at the next billing cycle.'
        },
        {
            question: 'Is there a student discount?',
            answer: 'Yes! Students get 50% off Pro plans. Contact support with your student ID to claim your discount.'
        }
    ];

    return (
        <div className="min-h-screen bg-[#050505] text-white py-20 px-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                        Simple, Transparent Pricing
                    </h1>
                    <p className="text-xl text-gray-400 mb-8">
                        Choose the plan that's right for you
                    </p>

                    {/* Billing Toggle */}
                    <div className="inline-flex items-center gap-4 p-2 rounded-xl bg-white/5 border border-white/10">
                        <button
                            onClick={() => setBillingCycle('monthly')}
                            className={`px-6 py-2 rounded-lg transition-all ${billingCycle === 'monthly'
                                    ? 'bg-cyan-500/20 text-cyan-400'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setBillingCycle('yearly')}
                            className={`px-6 py-2 rounded-lg transition-all ${billingCycle === 'yearly'
                                    ? 'bg-cyan-500/20 text-cyan-400'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            Yearly
                            <span className="ml-2 text-xs text-green-400">Save 17%</span>
                        </button>
                    </div>
                </div>

                {/* Pricing Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
                    {plans.map((plan, index) => (
                        <GlassCard
                            key={index}
                            className={`p-8 relative ${plan.popular ? 'border-2 border-cyan-500/50 scale-105' : ''
                                }`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 text-sm font-bold">
                                    Most Popular
                                </div>
                            )}

                            <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                            <p className="text-gray-400 mb-6">{plan.description}</p>

                            <div className="mb-6">
                                {plan.price[billingCycle] !== null ? (
                                    <>
                                        <span className="text-5xl font-bold">
                                            ${plan.price[billingCycle]}
                                        </span>
                                        <span className="text-gray-400">
                                            /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                                        </span>
                                    </>
                                ) : (
                                    <span className="text-3xl font-bold">Custom</span>
                                )}
                            </div>

                            <NeonButton
                                onClick={() => navigate('/register')}
                                className="w-full mb-6"
                            >
                                {plan.cta}
                            </NeonButton>

                            <div className="space-y-3">
                                {plan.features.map((feature, i) => (
                                    <div key={i} className="flex items-start gap-2">
                                        <span className="text-green-400 mt-1">✓</span>
                                        <span className="text-sm text-gray-300">{feature}</span>
                                    </div>
                                ))}
                                {plan.limitations.map((limitation, i) => (
                                    <div key={i} className="flex items-start gap-2">
                                        <span className="text-red-400 mt-1">✗</span>
                                        <span className="text-sm text-gray-500">{limitation}</span>
                                    </div>
                                ))}
                            </div>
                        </GlassCard>
                    ))}
                </div>

                {/* Feature Comparison Table */}
                <div className="mb-20">
                    <h2 className="text-3xl font-bold text-center mb-8">Feature Comparison</h2>
                    <GlassCard className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="text-left p-4">Feature</th>
                                    <th className="text-center p-4">Free</th>
                                    <th className="text-center p-4">Pro</th>
                                    <th className="text-center p-4">Enterprise</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    { name: 'Interviews per month', free: '3', pro: 'Unlimited', enterprise: 'Unlimited' },
                                    { name: 'AI Interviewer', free: 'Basic', pro: 'Advanced', enterprise: 'Custom' },
                                    { name: 'Emotion Analysis', free: '✗', pro: '✓', enterprise: '✓' },
                                    { name: 'Voice Interaction', free: '✗', pro: '✓', enterprise: '✓' },
                                    { name: 'Resume Analysis', free: '✓', pro: '✓', enterprise: '✓' },
                                    { name: 'Progress Tracking', free: '✗', pro: '✓', enterprise: '✓' },
                                    { name: 'Team Management', free: '✗', pro: '✗', enterprise: '✓' },
                                    { name: 'API Access', free: '✗', pro: '✗', enterprise: '✓' },
                                    { name: 'Support', free: 'Email', pro: 'Priority', enterprise: 'Dedicated' }
                                ].map((row, i) => (
                                    <tr key={i} className="border-b border-white/5">
                                        <td className="p-4 text-gray-300">{row.name}</td>
                                        <td className="p-4 text-center text-gray-400">{row.free}</td>
                                        <td className="p-4 text-center text-cyan-400">{row.pro}</td>
                                        <td className="p-4 text-center text-purple-400">{row.enterprise}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </GlassCard>
                </div>

                {/* FAQ */}
                <div>
                    <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
                    <div className="max-w-3xl mx-auto space-y-4">
                        {faqs.map((faq, index) => (
                            <GlassCard key={index} className="p-6">
                                <h3 className="font-bold text-lg mb-2">{faq.question}</h3>
                                <p className="text-gray-400">{faq.answer}</p>
                            </GlassCard>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
