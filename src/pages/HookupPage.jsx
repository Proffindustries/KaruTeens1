import React, { useState, useEffect } from 'react';
import { Heart, X, MessageCircle, AlertTriangle, Lock, Loader, Shield, Check, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/HookupPage.css';
import { useMyAlias, useCreateAlias, useDiscovery, useInteract } from '../hooks/useHookup.js';
import { useToast } from '../context/ToastContext';
import api from '../api/client';

const HookupPage = () => {
    const { data: myAlias, isLoading: aliasLoading, error: aliasError } = useMyAlias();
    const { data: discovery, isLoading: discoveryLoading } = useDiscovery();
    const { mutate: createAlias, isPending: isCreatingAlias } = useCreateAlias();
    const { mutate: interact } = useInteract();
    const { showToast } = useToast();

    const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [phone, setPhone] = useState('');
    const [checkoutId, setCheckoutId] = useState(null);
    const [paymentStep, setPaymentStep] = useState('pending');
    const [aliasForm, setAliasForm] = useState({
        alias_username: '',
        gender: 'Male',
        age: '',
        bio: ''
    });

    const hasAlias = myAlias && !aliasError;
    const isAliasVerified = myAlias?.is_verified;

    const handleCreateAlias = async (e) => {
        e.preventDefault();

        if (!aliasForm.alias_username || !aliasForm.age || !aliasForm.bio) {
            showToast('Please fill all fields', 'error');
            return;
        }

        createAlias({
            alias_username: aliasForm.alias_username,
            gender: aliasForm.gender,
            age: parseInt(aliasForm.age),
            bio: aliasForm.bio
        }, {
            onSuccess: () => {
                showToast('Alias created! Now verify to activate.', 'success');
                setShowPaymentModal(true);
            }
        });
    };

    const handlePayment = async (e) => {
        if (e) e.preventDefault();

        if (!phone.match(/^(254|\+254|0)?(7|1)\d{8}$/)) {
            showToast('Please enter a valid M-Pesa phone number', 'error');
            return;
        }

        let formattedPhone = phone.replace('+', '');
        if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.slice(1);
        if (formattedPhone.startsWith('7') || formattedPhone.startsWith('1')) formattedPhone = '254' + formattedPhone;

        try {
            const { data } = await api.post('/payments/verify', {
                phone: formattedPhone,
                amount: 20,
                tx_type: 'hookup'
            });
            setCheckoutId(data.checkout_request_id);
            setPaymentStep('processing');
            showToast('STK Push sent! Enter your PIN.', 'success');
        } catch (err) {
            showToast(err.response?.data?.error || 'Payment failed', 'error');
        }
    };

    useEffect(() => {
        let interval;
        if (paymentStep === 'processing' && checkoutId) {
            interval = setInterval(async () => {
                try {
                    const { data } = await api.get(`/payments/status/${checkoutId}`);
                    if (data.status === 'completed') {
                        setPaymentStep('complete');
                        clearInterval(interval);
                        showToast('Alias activated! Start discovering.', 'success');
                        setShowPaymentModal(false);
                        window.location.reload();
                    } else if (data.status === 'failed') {
                        setPaymentStep('pending');
                        setCheckoutId(null);
                        showToast('Payment failed', 'error');
                        clearInterval(interval);
                    }
                } catch (err) {
                    console.error('Polling error', err);
                }
            }, 10000);
        }
        return () => clearInterval(interval);
    }, [paymentStep, checkoutId]);

    const handleSwipe = (direction, targetId) => {
        const type = direction === 'right' ? 'like' : 'pass';

        interact({ id: targetId, type }, {
            onSuccess: (data) => {
                if (data.match) {
                    showToast('🎉 It\'s a mutual match!', 'success');
                }
                if (currentMatchIndex < discovery.length - 1) {
                    setCurrentMatchIndex(prev => prev + 1);
                } else {
                    showToast('No more matches nearby!', 'info');
                }
            }
        });
    };

    if (aliasLoading || discoveryLoading) {
        return (
            <div className="container hookup-landing" style={{ textAlign: 'center', paddingTop: '4rem' }}>
                <Loader size={48} className="spin-anim" color="#ff4757" />
                <p style={{ marginTop: '1rem' }}>Loading...</p>
            </div>
        );
    }

    if (!hasAlias || !isAliasVerified) {
        return (
            <div className="container hookup-landing">
                <div className="card hookup-intro-card">
                    <div className="hookup-icon-bg"><Heart size={48} /></div>
                    <h1>KaruTeens Dating</h1>
                    <p>Meet students discreetly. Create an anonymous alias to get started.</p>

                    <div className="warning-box">
                        <AlertTriangle size={20} />
                        <span>Strict 18+ Only. Respectful behavior required.</span>
                    </div>

                    {!hasAlias ? (
                        <form className="alias-form" onSubmit={handleCreateAlias}>
                            <input
                                type="text"
                                placeholder="Alias Username (e.g. Mystery_Tiger)"
                                className="form-input"
                                value={aliasForm.alias_username}
                                onChange={(e) => setAliasForm({ ...aliasForm, alias_username: e.target.value })}
                            />
                            <div className="row-inputs">
                                <select
                                    className="form-input"
                                    value={aliasForm.gender}
                                    onChange={(e) => setAliasForm({ ...aliasForm, gender: e.target.value })}
                                >
                                    <option>Male</option>
                                    <option>Female</option>
                                    <option>Other</option>
                                </select>
                                <input
                                    type="number"
                                    placeholder="Age"
                                    className="form-input"
                                    value={aliasForm.age}
                                    onChange={(e) => setAliasForm({ ...aliasForm, age: e.target.value })}
                                />
                            </div>
                            <textarea
                                placeholder="Describe yourself & what you're looking for..."
                                className="form-input"
                                rows="3"
                                value={aliasForm.bio}
                                onChange={(e) => setAliasForm({ ...aliasForm, bio: e.target.value })}
                            />

                            <button className="btn btn-primary btn-full" type="submit" disabled={isCreatingAlias}>
                                {isCreatingAlias ? 'Creating...' : 'Create Alias'}
                            </button>
                        </form>
                    ) : (
                        <div className="verification-notice" style={{ textAlign: 'center', padding: '2rem' }}>
                            <Shield size={48} color="#2ed573" style={{ marginBottom: '1rem' }} />
                            <h3>Alias Created!</h3>
                            <p>Pay Ksh 20 to verify and start discovering matches.</p>
                            <button
                                className="btn btn-primary btn-full"
                                onClick={() => setShowPaymentModal(true)}
                            >
                                Verify Alias (Ksh 20) <Lock size={16} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Payment Modal */}
                {showPaymentModal && (
                    <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                            <div className="modal-header">
                                <h3>Activate Hookup Alias</h3>
                                <button className="close-btn" onClick={() => setShowPaymentModal(false)}>×</button>
                            </div>
                            {paymentStep === 'pending' && (
                                <div className="modal-body">
                                    <p style={{ marginBottom: '1.5rem' }}>One-time verification fee ensures a safe, human-only dating environment.</p>
                                    <div className="form-group">
                                        <label>M-Pesa Phone Number</label>
                                        <div style={{ position: 'relative' }}>
                                            <Smartphone size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                                            <input
                                                type="text"
                                                placeholder="07XXXXXXXX"
                                                className="form-input"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                style={{ paddingLeft: '35px' }}
                                            />
                                        </div>
                                    </div>
                                    <button className="btn btn-primary btn-full" onClick={handlePayment}>
                                        Pay Ksh 20 & Activate
                                    </button>
                                </div>
                            )}
                            {paymentStep === 'processing' && (
                                <div className="modal-body" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                                    <Loader size={48} className="spin-anim" color="#3742fa" style={{ margin: '0 auto' }} />
                                    <h3 style={{ marginTop: '1.5rem' }}>Confirming Payment...</h3>
                                    <p>Enter your M-Pesa PIN to complete.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (!discovery || discovery.length === 0) {
        return (
            <div className="container hookup-landing" style={{ textAlign: 'center', paddingTop: '4rem' }}>
                <Heart size={64} color="#ccc" style={{ marginBottom: '1rem' }} />
                <h2>No more matches available</h2>
                <p>Check back later for new profiles!</p>
            </div>
        );
    }

    const currentProfile = discovery[currentMatchIndex];

    return (
        <div className="container hookup-page">
            <div className="match-container">
                <AnimatePresence mode='wait'>
                    <motion.div
                        key={currentProfile.id}
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ x: 200, opacity: 0 }}
                        className="card match-card"
                    >
                        <div className="match-image-placeholder">
                            <span>HIDDEN PHOTO</span>
                            <Lock size={32} />
                        </div>
                        <div className="match-content">
                            <div className="match-header">
                                <h2>{currentProfile.alias_username}, {currentProfile.age}</h2>
                            </div>
                            <p className="match-bio">{currentProfile.bio}</p>

                            <div className="match-stats">
                                <span>{currentProfile.gender}</span>
                            </div>
                        </div>

                        <div className="match-actions">
                            <button className="action-circle pass" onClick={() => handleSwipe('left', currentProfile.id)}>
                                <X size={32} />
                            </button>
                            <button className="action-circle like" onClick={() => handleSwipe('right', currentProfile.id)}>
                                <Heart size={32} />
                            </button>
                        </div>
                    </motion.div>
                </AnimatePresence>

                <div className="match-tips">
                    <h3>How it works</h3>
                    <p>If you both match, you can reveal your real profiles and move to the main chat.</p>
                </div>
            </div>
        </div>
    );
};

export default HookupPage;
