import React, { useState, useEffect } from 'react';
import { CheckCircle, Shield, Loader, Smartphone } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import '../styles/Auth.css';

const VerificationPage = () => {
    const [step, setStep] = useState('pending'); // pending, processing, complete
    const [phone, setPhone] = useState('');
    const [checkoutId, setCheckoutId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isPaymentEnabled, setIsPaymentEnabled] = useState(true);
    const { showToast } = useToast();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const { data } = await api.get('/config');
                setIsPaymentEnabled(data.is_payment_enabled);
            } catch (err) {
                console.error('Failed to fetch config', err);
            }
        };
        fetchConfig();
    }, []);

    const handleInitiatePayment = async (e) => {
        e.preventDefault();
        if (!phone.match(/^(254|\+254|0)?(7|1)\d{8}$/)) {
            showToast('Please enter a valid M-Pesa phone number', 'error');
            return;
        }

        // Format phone to 254...
        let formattedPhone = phone.replace('+', '');
        if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.slice(1);
        if (formattedPhone.startsWith('7') || formattedPhone.startsWith('1')) formattedPhone = '254' + formattedPhone;

        setLoading(true);
        try {
            const { data } = await api.post('/payments/verify', {
                phone: formattedPhone,
                amount: 20,
                tx_type: 'verification'
            });
            setCheckoutId(data.checkout_request_id);
            setStep('processing');
            showToast('STK Push sent to your phone!', 'success');
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to initiate payment', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleFreeVerify = async () => {
        setLoading(true);
        try {
            const { data } = await api.post('/auth/verify-free');
            setStep('complete');
            showToast(data.message, 'success');

            // Update local storage user object
            const user = JSON.parse(localStorage.getItem('user'));
            if (user) {
                localStorage.setItem('user', JSON.stringify({ ...user, is_verified: true }));
            }
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to verify account', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Polling for status
    useEffect(() => {
        let interval;
        if (step === 'processing' && checkoutId) {
            interval = setInterval(async () => {
                try {
                    const { data } = await api.get(`/payments/status/${checkoutId}`);
                    if (data.status === 'completed') {
                        setStep('complete');
                        clearInterval(interval);
                        // Refresh user data if needed?
                        const user = JSON.parse(localStorage.getItem('user'));
                        if (user) {
                            localStorage.setItem('user', JSON.stringify({ ...user, is_verified: true }));
                        }
                    } else if (data.status === 'failed') {
                        setStep('pending');
                        setCheckoutId(null);
                        showToast(data.error_message || 'Payment failed or cancelled', 'error');
                        clearInterval(interval);
                    }
                } catch (err) {
                    console.error('Polling error', err);
                }
            }, 10000);
        }
        return () => clearInterval(interval);
    }, [step, checkoutId]);

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h1>Verify Your Account</h1>
                    <p>Unlock all features by verifying your student status.</p>
                </div>

                {!isPaymentEnabled && step === 'pending' && (
                    <div className="auth-body" style={{ textAlign: 'center' }}>
                        <div className="verification-info" style={{ marginBottom: '2rem' }}>
                            <div className="promo-badge" style={{
                                background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                                color: '#fff',
                                padding: '0.5rem 1rem',
                                borderRadius: '20px',
                                display: 'inline-block',
                                marginBottom: '1rem',
                                fontWeight: 'bold',
                                boxShadow: '0 4px 15px rgba(255, 165, 0, 0.3)'
                            }}>
                                🎁 LIMITED OFFER
                            </div>
                            <Shield size={64} color="#3742fa" style={{ marginBottom: '1rem', marginLeft: 'auto', marginRight: 'auto' }} />
                            <h3>Verification is Currently FREE!</h3>
                            <p>As part of our marketing campaign, you can verify your account for free today.</p>
                        </div>

                        <button
                            onClick={handleFreeVerify}
                            className="btn btn-primary btn-full pulse-anim"
                            disabled={loading}
                            style={{ padding: '1rem' }}
                        >
                            {loading ? <Loader className="spin-anim" /> : 'Claim Free Verification Now'}
                        </button>
                    </div>
                )}

                {isPaymentEnabled && step === 'pending' && (
                    <form className="auth-body" onSubmit={handleInitiatePayment}>
                        <div className="verification-info" style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <Shield size={64} color="#2ed573" style={{ marginBottom: '1rem', marginLeft: 'auto', marginRight: 'auto' }} />
                            <p>One-time human verification fee of <strong>Ksh 20</strong>.</p>
                            <p className="text-muted" style={{ fontSize: '0.85rem' }}>This helps us maintain a secure environment and prevent bots.</p>
                        </div>

                        <div className="form-group">
                            <label>M-Pesa Phone Number</label>
                            <div style={{ position: 'relative' }}>
                                <Smartphone size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="07XXXXXXXX"
                                    style={{ paddingLeft: '40px' }}
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-full"
                            disabled={loading}
                        >
                            {loading ? 'Sending STK...' : 'Pay Ksh 20 and Verify'}
                        </button>
                    </form>
                )}

                {step === 'processing' && (
                    <div className="auth-body" style={{ textAlign: 'center', padding: '3rem 0' }}>
                        <Loader size={48} className="spin-anim" color="#3742fa" style={{ margin: '0 auto' }} />
                        <h3 style={{ marginTop: '1.5rem' }}>Waiting for Payment...</h3>
                        <p>Please check your phone and enter your M-Pesa PIN.</p>
                        <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '1rem' }}>Processing Checkout ID: <br /><code>{checkoutId}</code></p>
                    </div>
                )}

                {step === 'complete' && (
                    <div className="auth-body" style={{ textAlign: 'center', padding: '2rem 0' }}>
                        <CheckCircle size={64} color="#2ed573" style={{ marginBottom: '1rem', margin: '0 auto' }} />
                        <h3>Account Verified!</h3>
                        <p>Welcome to KaruTeens. You now have full access.</p>
                        <Link to="/feed" className="btn btn-primary btn-full" style={{ marginTop: '2rem', display: 'block' }}>
                            Start Exploring
                        </Link>
                    </div>
                )}

                <div className="auth-footer" style={{ marginTop: '2rem' }}>
                    <p>{isPaymentEnabled ? 'Secure payments powered by Safaricom M-Pesa' : 'KaruTeens Community Verification'}</p>
                </div>
            </div>
        </div>
    );
};

export default VerificationPage;
