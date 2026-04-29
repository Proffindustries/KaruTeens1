import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Smartphone, Loader, CheckCircle, AlertCircle, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import '../styles/MpesaPaymentModal.css';

const MpesaPaymentModal = ({ isOpen, onClose, amount, txType, onWait, onSuccess, extraData = {} }) => {
    const { showToast } = useToast();
    const [step, setStep] = useState('input'); // input, processing, waiting, success, error
    const [phone, setPhone] = useState('');
    const [checkoutId, setCheckoutId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setStep('input');
            setError(null);
            setLoading(false);
        }
    }, [isOpen]);

    const handleInitiate = async () => {
        if (!phone.match(/^(254|\+254|0)?(7|1)\d{8}$/)) {
            showToast('Please enter a valid M-Pesa phone number', 'error');
            return;
        }

        let formattedPhone = phone.replace('+', '');
        if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.slice(1);
        if (formattedPhone.startsWith('7') || formattedPhone.startsWith('1'))
            formattedPhone = '254' + formattedPhone;

        setLoading(true);
        setStep('processing');

        try {
            const { data } = await api.post('/payments/verify', {
                phone: formattedPhone,
                amount: amount,
                tx_type: txType,
                ...extraData
            });
            setCheckoutId(data.checkout_request_id);
            setStep('waiting');
            if (onWait) onWait(data.checkout_request_id);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to initiate payment');
            setStep('error');
            showToast(err.response?.data?.error || 'Failed to initiate payment', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let interval;
        if (step === 'waiting' && checkoutId) {
            interval = setInterval(async () => {
                try {
                    const { data } = await api.get(`/payments/status/${checkoutId}`);
                    if (data.status === 'completed') {
                        setStep('success');
                        clearInterval(interval);
                        if (onSuccess) onSuccess(data);
                    } else if (data.status === 'failed') {
                        setError(data.error_message || 'Payment was cancelled or failed');
                        setStep('error');
                        clearInterval(interval);
                    }
                } catch (err) {
                    console.error('Polling error', err);
                }
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [step, checkoutId, onSuccess]);

    if (!isOpen) return null;

    const variants = {
        hidden: { y: '100%', opacity: 0 },
        visible: { y: 0, opacity: 1 },
        exit: { y: '100%', opacity: 0 }
    };

    return (
        <div className="mpesa-modal-overlay" onClick={onClose}>
            <motion.div 
                className="mpesa-modal-content"
                onClick={e => e.stopPropagation()}
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={variants}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
                <div className="mpesa-modal-handle" onClick={onClose} />
                
                <button className="mpesa-close-btn" onClick={onClose}>
                    <X size={20} />
                </button>

                <div className="mpesa-modal-inner">
                    <AnimatePresence mode="wait">
                        {step === 'input' && (
                            <motion.div 
                                key="input"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="mpesa-step-container"
                            >
                                <div className="mpesa-brand-header">
                                    <div className="mpesa-logo-circle">
                                        <Smartphone className="phone-icon" />
                                    </div>
                                    <h2>M-Pesa Payment</h2>
                                    <p className="amount-badge">Ksh {amount.toLocaleString()}</p>
                                </div>

                                <div className="mpesa-form-area">
                                    <div className="mpesa-input-group">
                                        <label>Enter M-Pesa Number</label>
                                        <div className="input-with-icon">
                                            <Smartphone size={18} />
                                            <input 
                                                type="text" 
                                                placeholder="07XXXXXXXX" 
                                                value={phone}
                                                onChange={e => setPhone(e.target.value)}
                                                autoFocus
                                            />
                                        </div>
                                    </div>

                                    <div className="mpesa-info-box">
                                        <ShieldCheck size={16} />
                                        <span>You will receive an STK push on your phone</span>
                                    </div>

                                    <button 
                                        className="mpesa-primary-btn"
                                        onClick={handleInitiate}
                                        disabled={!phone}
                                    >
                                        Proceed to Pay <ArrowRight size={18} />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 'processing' && (
                            <motion.div 
                                key="processing"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="mpesa-step-container centered"
                            >
                                <div className="mpesa-loader-visual">
                                    <div className="loader-ring" />
                                    <Zap className="zap-icon" />
                                </div>
                                <h3>Initiating Request...</h3>
                                <p>Connecting to M-Pesa Gateway</p>
                            </motion.div>
                        )}

                        {step === 'waiting' && (
                            <motion.div 
                                key="waiting"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="mpesa-step-container centered"
                            >
                                <div className="stk-push-visual">
                                    <div className="phone-mockup">
                                        <div className="phone-screen">
                                            <div className="stk-popup">
                                                <div className="stk-header">M-PESA</div>
                                                <div className="stk-body">
                                                    Pay Ksh {amount} to KaruTeens?
                                                </div>
                                                <div className="stk-pin-dots">
                                                    <span /><span /><span /><span />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pulse-waves">
                                        <div className="wave" />
                                        <div className="wave" />
                                        <div className="wave" />
                                    </div>
                                </div>
                                <h3>Check Your Phone</h3>
                                <p>Enter your M-Pesa PIN to authorize the payment of <strong>Ksh {amount}</strong></p>
                                <div className="timer-line" />
                            </motion.div>
                        )}

                        {step === 'success' && (
                            <motion.div 
                                key="success"
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="mpesa-step-container centered"
                            >
                                <div className="success-visual">
                                    <CheckCircle size={80} color="#2ecc71" />
                                    <div className="confetti-cannon" />
                                </div>
                                <h3>Payment Successful!</h3>
                                <p>Thank you for your transaction. Your account has been updated.</p>
                                <button className="mpesa-finish-btn" onClick={onClose}>
                                    Done
                                </button>
                            </motion.div>
                        )}

                        {step === 'error' && (
                            <motion.div 
                                key="error"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="mpesa-step-container centered"
                            >
                                <div className="error-visual">
                                    <AlertCircle size={80} color="#e74c3c" />
                                </div>
                                <h3>Payment Failed</h3>
                                <p>{error}</p>
                                <button className="mpesa-retry-btn" onClick={() => setStep('input')}>
                                    Try Again
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};

export default MpesaPaymentModal;
