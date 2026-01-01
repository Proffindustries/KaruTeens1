import React, { useState, useEffect } from 'react';
import { Check, Star, Zap, Crown, Loader, Smartphone } from 'lucide-react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import '../styles/DonatePage.css';

const PremiumPage = () => {
    const [step, setStep] = useState('pending'); // pending, processing, complete
    const [phone, setPhone] = useState('');
    const [checkoutId, setCheckoutId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState('monthly');
    const { showToast } = useToast();

    const handleUpgrade = async (e) => {
        if (e) e.preventDefault();

        if (!phone.match(/^(254|\+254|0)?(7|1)\d{8}$/)) {
            showToast('Please enter a valid M-Pesa phone number', 'error');
            return;
        }

        let formattedPhone = phone.replace('+', '');
        if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.slice(1);
        if (formattedPhone.startsWith('7') || formattedPhone.startsWith('1')) formattedPhone = '254' + formattedPhone;

        setLoading(true);
        const amount = selectedPlan === 'weekly' ? 10 : selectedPlan === 'monthly' ? 40 : 200;

        try {
            const { data } = await api.post('/payments/verify', {
                phone: formattedPhone,
                amount: amount,
                tx_type: 'premium',
                premium_duration: selectedPlan
            });
            setCheckoutId(data.checkout_request_id);
            setStep('processing');
            showToast('STK Push sent! Upgrade will be active once paid.', 'success');
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to initiate upgrade', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let interval;
        if (step === 'processing' && checkoutId) {
            interval = setInterval(async () => {
                try {
                    const { data } = await api.get(`/payments/status/${checkoutId}`);
                    if (data.status === 'completed') {
                        setStep('complete');
                        clearInterval(interval);
                        // Update local user state
                        const user = JSON.parse(localStorage.getItem('user'));
                        if (user) {
                            localStorage.setItem('user', JSON.stringify({ ...user, is_premium: true, role: 'premium' }));
                        }
                    } else if (data.status === 'failed') {
                        setStep('pending');
                        setCheckoutId(null);
                        showToast(data.error_message || 'Upgrade payment failed', 'error');
                        clearInterval(interval);
                    }
                } catch (err) {
                    console.error('Polling error', err);
                }
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [step, checkoutId]);

    return (
        <div className="container premium-page" style={{ paddingBottom: '4rem' }}>
            <div className="premium-header">
                <Crown size={64} className="crown-anim" color="#f1c40f" style={{ marginBottom: '1rem' }} />
                <h1>Upgrade to Premium</h1>
                <p>Unlock exclusive features and supercharge your campus life.</p>
            </div>

            {step === 'pending' && (
                <div className="premium-options-container">
                    <div className="pricing-grid">
                        {/* Weekly Plan */}
                        <div className={`card pricing-card ${selectedPlan === 'weekly' ? 'selected' : ''}`} onClick={() => setSelectedPlan('weekly')}>
                            <div className="pricing-header">
                                <h3>Weekly Star</h3>
                                <div className="price">Ksh 10<span>/wk</span></div>
                                <p>Short term boost.</p>
                            </div>
                            <ul className="features-list">
                                <li><Check size={16} /> Verified Badge</li>
                                <li><Check size={16} /> Unlimited Uploads</li>
                                <li><Check size={16} /> Profile Visitors</li>
                            </ul>
                        </div>

                        {/* Monthly Plan */}
                        <div className={`card pricing-card featured ${selectedPlan === 'monthly' ? 'selected' : ''}`} onClick={() => setSelectedPlan('monthly')}>
                            <div className="best-value">POPULAR</div>
                            <div className="pricing-header">
                                <h3>Campus Pro</h3>
                                <div className="price">Ksh 40<span>/mo</span></div>
                                <p>Full month of dominance.</p>
                            </div>
                            <ul className="features-list">
                                <li><Check size={16} /> <strong>Everything in Weekly</strong></li>
                                <li><Check size={16} /> Premium Study Rooms</li>
                                <li><Check size={16} /> Priority Support</li>
                            </ul>
                        </div>

                        {/* Semi-Annual Plan (5mo 1wk) */}
                        <div className={`card pricing-card ${selectedPlan === 'semi-annual' ? 'selected' : ''}`} onClick={() => setSelectedPlan('semi-annual')}>
                            <div className="pricing-header">
                                <h3>Elite Legend</h3>
                                <div className="price">Ksh 200</div>
                                <p>Valid for 5 Months + 1 Week.</p>
                            </div>
                            <ul className="features-list">
                                <li><Check size={16} /> <strong>Everything in Pro</strong></li>
                                <li><Check size={16} /> VIP Status Badge</li>
                                <li><Check size={16} /> Exclusive Beta Access</li>
                            </ul>
                        </div>
                    </div>

                    <div className="card upgrade-action-card" style={{ maxWidth: '400px', margin: '2rem auto' }}>
                        <div className="premium-pay-form">
                            <h3 style={{ marginBottom: '1rem', textAlign: 'center' }}>
                                Confirm {selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} Upgrade
                            </h3>
                            <div className="form-group" style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
                                <label style={{ fontSize: '0.85rem', opacity: 0.8, fontWeight: '500' }}>M-Pesa Phone Number</label>
                                <div style={{ position: 'relative', marginTop: '0.5rem' }}>
                                    <Smartphone size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                                    <input
                                        type="text"
                                        placeholder="07XXXXXXXX"
                                        className="form-input"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        style={{ paddingLeft: '40px', fontSize: '1rem' }}
                                    />
                                </div>
                            </div>
                            <button className="btn btn-primary btn-full" onClick={handleUpgrade} disabled={loading} style={{ height: '3.5rem', fontSize: '1.1rem' }}>
                                {loading ? 'Processing...' : `Pay Ksh ${selectedPlan === 'weekly' ? 10 : selectedPlan === 'monthly' ? 40 : 200}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {step === 'processing' && (
                <div className="card payment-waiting-card" style={{ maxWidth: '400px', margin: '2rem auto', textAlign: 'center', padding: '3rem 2rem' }}>
                    <Loader size={48} className="spin-anim" color="#3742fa" style={{ margin: '0 auto' }} />
                    <h3 style={{ marginTop: '1.5rem' }}>Confirming Payment...</h3>
                    <p>We've sent an STK Push to your phone. Enter your PIN to complete the upgrade.</p>
                    <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '1rem' }}>Request ID: {checkoutId}</p>
                </div>
            )}

            {step === 'complete' && (
                <div className="card success-card" style={{ maxWidth: '500px', margin: '2rem auto', textAlign: 'center', padding: '3rem 2rem' }}>
                    <div style={{ background: '#2ed573', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                        <Check size={48} color="white" />
                    </div>
                    <h2>Welcome to Campus Pro!</h2>
                    <p>Your premium features are now active. Shine bright, student!</p>
                    <button className="btn btn-primary btn-full" style={{ marginTop: '2rem' }} onClick={() => window.location.href = '/feed'}>
                        Go to Feed
                    </button>
                </div>
            )}
        </div>
    );
};

export default PremiumPage;
