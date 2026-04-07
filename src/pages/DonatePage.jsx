import React, { useState, useEffect } from 'react';
import { Heart, CreditCard, TrendingUp, Smartphone, Loader, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import '../styles/DonatePage.css';

const DonatePage = () => {
    const { showToast } = useToast();
    const [amount, setAmount] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState('pending'); // pending, processing, complete
    const [checkoutId, setCheckoutId] = useState(null);
    const [stats, setStats] = useState({ raised: 0, goal: 50000 });
    const [recentDonors, setRecentDonors] = useState([]);

    useEffect(() => {
        const fetchDonationData = async () => {
            try {
                const [statsRes, donorsRes] = await Promise.all([
                    api.get('/payments/donations/stats'),
                    api.get('/payments/donations/recent')
                ]);
                setStats(statsRes.data);
                setRecentDonors(donorsRes.data);
            } catch (err) {
                console.error('Failed to fetch donation data', err);
            }
        };

        fetchDonationData();
    }, []);

    const percentage = (stats.raised / stats.goal) * 100;

    const handleDonate = async (e) => {
        if (e) e.preventDefault();

        if (!phone.match(/^(254|\+254|0)?(7|1)\d{8}$/)) {
            showToast('Please enter a valid M-Pesa phone number', 'error');
            return;
        }

        if (!amount || parseFloat(amount) <= 0) {
            showToast('Please enter a valid donation amount', 'error');
            return;
        }

        let formattedPhone = phone.replace('+', '');
        if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.slice(1);
        if (formattedPhone.startsWith('7') || formattedPhone.startsWith('1'))
            formattedPhone = '254' + formattedPhone;

        setLoading(true);

        try {
            const { data } = await api.post('/payments/verify', {
                phone: formattedPhone,
                amount: parseFloat(amount),
                tx_type: 'donation',
            });
            setCheckoutId(data.checkout_request_id);
            setStep('processing');
            showToast('STK Push sent! Thank you for your support.', 'success');
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to initiate donation', 'error');
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
                        // Refresh data
                        api.get('/payments/donations/stats').then(res => setStats(res.data));
                        api.get('/payments/donations/recent').then(res => setRecentDonors(res.data));
                    } else if (data.status === 'failed') {
                        setStep('pending');
                        setCheckoutId(null);
                        showToast(data.error_message || 'Donation payment failed', 'error');
                        clearInterval(interval);
                    }
                } catch (err) {
                    console.error('Polling error', err);
                }
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [step, checkoutId, showToast]);

    const formatTime = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = Math.floor((now - date) / 1000);
        
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    return (
        <div className="container donate-page">
            <div className="donate-hero">
                <h1>Support KaruTeens</h1>
                <p>Help us keep the servers running and build new features.</p>
            </div>

            <div className="donate-grid">
                {/* Main Donation Card */}
                <div className="card donate-card">
                    {step === 'pending' && (
                        <>
                            <h2>Make a Donation</h2>
                            <div className="preset-amounts">
                                {[50, 100, 500, 1000].map((amt) => (
                                    <button 
                                        key={amt} 
                                        onClick={() => setAmount(amt.toString())}
                                        className={amount === amt.toString() ? 'selected' : ''}
                                    >
                                        {amt}
                                    </button>
                                ))}
                            </div>

                            <div className="custom-amount">
                                <span>Ksh</span>
                                <input
                                    type="number"
                                    placeholder="Enter amount"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label style={{ fontSize: '0.85rem', opacity: 0.8, fontWeight: '500' }}>
                                    M-Pesa Phone Number
                                </label>
                                <div style={{ position: 'relative', marginTop: '0.5rem' }}>
                                    <Smartphone
                                        size={18}
                                        style={{
                                            position: 'absolute',
                                            left: '12px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            opacity: 0.5,
                                        }}
                                    />
                                    <input
                                        type="text"
                                        placeholder="07XXXXXXXX"
                                        className="form-input"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        style={{ paddingLeft: '40px', width: '100%' }}
                                    />
                                </div>
                            </div>

                            <button 
                                className="btn btn-primary btn-lg btn-full" 
                                onClick={handleDonate}
                                disabled={loading}
                            >
                                {loading ? 'Processing...' : (
                                    <>Donate with M-Pesa <Heart size={20} fill="white" style={{ marginLeft: '8px' }} /></>
                                )}
                            </button>
                            <p className="donate-secure">
                                <CreditCard size={14} /> Secure M-Pesa Transaction
                            </p>
                        </>
                    )}

                    {step === 'processing' && (
                        <div className="payment-waiting" style={{ textAlign: 'center', padding: '2rem 0' }}>
                            <Loader size={48} className="spin-anim" color="#3742fa" style={{ margin: '0 auto' }} />
                            <h3 style={{ marginTop: '1.5rem' }}>Waiting for PIN...</h3>
                            <p>Please check your phone and enter your M-Pesa PIN to complete the donation.</p>
                            <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '1rem' }}>
                                Reference: {checkoutId}
                            </p>
                            <button className="btn btn-ghost" onClick={() => setStep('pending')} style={{ marginTop: '1rem' }}>
                                Cancel
                            </button>
                        </div>
                    )}

                    {step === 'complete' && (
                        <div className="success-message" style={{ textAlign: 'center', padding: '2rem 0' }}>
                            <div style={{ 
                                background: '#2ed573', 
                                width: '80px', 
                                height: '80px', 
                                borderRadius: '50%', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                margin: '0 auto 1.5rem' 
                            }}>
                                <Check size={48} color="white" />
                            </div>
                            <h2>Thank You!</h2>
                            <p>Your donation of Ksh {amount} has been received. We truly appreciate your support!</p>
                            <button className="btn btn-primary btn-full" onClick={() => {
                                setStep('pending');
                                setAmount('');
                            }} style={{ marginTop: '2rem' }}>
                                Make Another Donation
                            </button>
                        </div>
                    )}
                </div>

                {/* Progress & Stats */}
                <div className="donate-stats">
                    <div className="card progress-card">
                        <h3>Fundraising Goal</h3>
                        <div className="progress-bar-container">
                            <motion.div
                                className="progress-fill"
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(percentage, 100)}%` }}
                                transition={{ duration: 1 }}
                            ></motion.div>
                        </div>
                        <div className="progress-labels">
                            <span>Raised: Ksh {stats.raised.toLocaleString()}</span>
                            <span>Goal: Ksh {stats.goal.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="card recent-donors-card">
                        <h3>
                            <TrendingUp size={18} /> Recent Donors
                        </h3>
                        <div className="donors-list">
                            {recentDonors.length > 0 ? (
                                recentDonors.map((d, i) => (
                                    <div key={i} className="donor-row">
                                        <span className="donor-name">{d.name}</span>
                                        <div className="right">
                                            <span className="donor-amount">+{d.amount}</span>
                                            <span className="donor-time">{formatTime(d.created_at)}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-muted" style={{ textAlign: 'center', padding: '1rem' }}>No donations yet. Be the first!</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DonatePage;
