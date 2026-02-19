import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/layout/Sidebar';
import { GlassCard } from '../components/ui/GlassCard';
import { Zap, Sparkles, Crown, ArrowRight } from 'lucide-react';

const CREDITS_PER_RUPEE = 2;

const PLANS = [
    {
        name: 'Starter',
        price: 50,
        credits: 100,
        icon: Zap,
        color: 'from-blue-500 to-cyan-400',
        borderColor: 'border-blue-500/30',
        bgGlow: 'bg-blue-500/5',
        label: 'Great to try',
    },
    {
        name: 'Popular',
        price: 100,
        credits: 200,
        icon: Sparkles,
        color: 'from-violet-500 to-purple-400',
        borderColor: 'border-violet-500/40',
        bgGlow: 'bg-violet-500/5',
        label: 'Best value',
        popular: true,
    },
    {
        name: 'Pro',
        price: 500,
        credits: 1000,
        icon: Crown,
        color: 'from-amber-500 to-orange-400',
        borderColor: 'border-amber-500/30',
        bgGlow: 'bg-amber-500/5',
        label: 'For serious prep',
    },
];

declare global {
    interface Window {
        Razorpay: any;
    }
}

export const RechargePage = () => {
    const navigate = useNavigate();
    const { user, refreshUser } = useAuth();
    const [customAmount, setCustomAmount] = useState('');
    const [loading, setLoading] = useState<string | null>(null);
    const [error, setError] = useState('');

    const customCredits = customAmount ? Math.floor(Number(customAmount) * CREDITS_PER_RUPEE) : 0;

    const loadRazorpayScript = (): Promise<boolean> => {
        return new Promise((resolve) => {
            if (window.Razorpay) {
                resolve(true);
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handlePurchase = async (amount: number, label: string) => {
        setError('');
        setLoading(label);

        try {
            const loaded = await loadRazorpayScript();
            if (!loaded) {
                setError('Failed to load payment gateway. Please try again.');
                setLoading(null);
                return;
            }

            const token = localStorage.getItem('token');
            const orderRes = await fetch(`${API_BASE_URL}/api/payment/create-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ amount }),
            });

            const orderData = await orderRes.json();
            if (!orderData.success) {
                setError(orderData.error || 'Failed to create order');
                setLoading(null);
                return;
            }

            const { orderId, credits } = orderData.data;

            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                amount: amount * 100,
                currency: 'INR',
                name: 'RealPrep AI',
                description: `${credits} Interview Credits`,
                order_id: orderId,
                handler: async (response: any) => {
                    // Verify payment on backend
                    try {
                        const verifyRes = await fetch(`${API_BASE_URL}/api/payment/verify`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                amount,
                            }),
                        });

                        const verifyData = await verifyRes.json();
                        if (verifyData.success) {
                            await refreshUser();
                            localStorage.setItem('rechargeSuccess', JSON.stringify({
                                credits: verifyData.data.creditsAdded,
                                total: verifyData.data.totalCredits,
                            }));
                            navigate('/dashboard');
                        } else {
                            setError('Payment verified but credits not added. Contact support.');
                        }
                    } catch {
                        setError('Payment verification failed. Contact support.');
                    }
                    setLoading(null);
                },
                modal: {
                    ondismiss: () => setLoading(null),
                },
                prefill: {
                    name: user?.name || '',
                    email: user?.email || '',
                },
                theme: {
                    color: '#7c3aed',
                    backdrop_color: 'rgba(0,0,0,0.8)',
                },
            };

            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (err) {
            console.error('Purchase error:', err);
            setError('Something went wrong. Please try again.');
            setLoading(null);
        }
    };

    return (
        <div className="flex min-h-screen bg-black text-white">
            <Sidebar />

            <main className="flex-1 ml-16 lg:ml-56 p-8 pt-24">
                <div className="max-w-4xl mx-auto space-y-10">
                    {/* Header */}
                    <div className="text-center">
                        <h1 className="text-3xl font-light text-white">
                            Recharge <span className="font-semibold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">Credits</span>
                        </h1>
                        <p className="text-white/40 mt-2 text-sm">
                            1 credit = 1 minute of AI interview practice
                        </p>
                        <div className="inline-flex items-center gap-2 mt-3 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/50">
                            Current balance: <span className="text-emerald-400 font-mono font-medium">{user?.credits ?? 0}</span> credits
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm text-center">
                            {error}
                        </div>
                    )}

                    {/* Pricing Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {PLANS.map((plan) => {
                            const Icon = plan.icon;
                            return (
                                <div
                                    key={plan.name}
                                    className={`relative group rounded-2xl border ${plan.borderColor} ${plan.bgGlow} p-6 transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl`}
                                >
                                    {plan.popular && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg">
                                            Most Popular
                                        </div>
                                    )}

                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-4 shadow-lg`}>
                                        <Icon className="w-6 h-6 text-white" />
                                    </div>

                                    <h3 className="text-lg font-medium text-white mb-1">{plan.name}</h3>
                                    <p className="text-xs text-white/30 mb-4">{plan.label}</p>

                                    <div className="flex items-baseline gap-1 mb-1">
                                        <span className="text-3xl font-bold text-white">₹{plan.price}</span>
                                    </div>
                                    <div className="flex items-center gap-2 mb-6">
                                        <span className={`text-sm font-semibold bg-gradient-to-r ${plan.color} bg-clip-text text-transparent`}>
                                            {plan.credits} credits
                                        </span>
                                        <span className="text-[10px] text-white/20">•</span>
                                        <span className="text-[10px] text-white/30">{plan.credits} min of practice</span>
                                    </div>

                                    <button
                                        onClick={() => handlePurchase(plan.price, plan.name)}
                                        disabled={loading !== null}
                                        className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${plan.popular
                                                ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:shadow-lg hover:shadow-violet-500/25'
                                                : 'bg-white/10 text-white/80 hover:bg-white/15 border border-white/10'
                                            } disabled:opacity-40`}
                                    >
                                        {loading === plan.name ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Processing...
                                            </span>
                                        ) : (
                                            `Buy ${plan.credits} Credits`
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Custom Amount */}
                    <GlassCard className="p-6">
                        <h2 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-4">
                            Custom Recharge
                        </h2>
                        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-end">
                            <div className="flex-1">
                                <label className="text-xs text-white/30 mb-1.5 block">Amount (₹)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">₹</span>
                                    <input
                                        type="number"
                                        min="1"
                                        placeholder="Enter amount"
                                        value={customAmount}
                                        onChange={(e) => setCustomAmount(e.target.value)}
                                        className="w-full pl-8 pr-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-white/30 focus:outline-none text-sm text-white placeholder:text-white/20"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/5 border border-white/10 min-w-[140px]">
                                <ArrowRight className="w-4 h-4 text-white/20 hidden sm:block" />
                                <div>
                                    <p className="text-xs text-white/30">You'll get</p>
                                    <p className={`text-lg font-bold ${customCredits > 0 ? 'text-emerald-400' : 'text-white/20'}`}>
                                        {customCredits > 0 ? customCredits : '—'} <span className="text-xs font-normal text-white/30">credits</span>
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    const amt = Number(customAmount);
                                    if (amt >= 1) handlePurchase(amt, 'custom');
                                    else setError('Enter at least ₹1');
                                }}
                                disabled={loading !== null || !customAmount || Number(customAmount) < 1}
                                className="btn-primary px-6 py-3 text-sm disabled:opacity-40 whitespace-nowrap"
                            >
                                {loading === 'custom' ? (
                                    <span className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Processing...
                                    </span>
                                ) : (
                                    'Recharge'
                                )}
                            </button>
                        </div>
                        <p className="text-[10px] text-white/20 mt-3">
                            Rate: 2 credits per ₹1 • Minimum: ₹1 • Powered by Razorpay
                        </p>
                    </GlassCard>

                    {/* Info */}
                    <div className="text-center text-xs text-white/20 pb-8">
                        Payments are secured by Razorpay. Credits never expire.
                    </div>
                </div>
            </main>
        </div>
    );
};
