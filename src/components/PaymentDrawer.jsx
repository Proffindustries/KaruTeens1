import React, { useState, useEffect } from 'react';
import { 
    X, 
    Smartphone, 
    ShieldCheck, 
    CreditCard, 
    ArrowRight, 
    Loader2, 
    CheckCircle2,
    Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/PaymentDrawer.css';

const PaymentDrawer = ({ 
    isOpen, 
    onClose, 
    amount, 
    title, 
    description, 
    onPaymentInitiated,
    onSuccess,
    checkoutId: externalCheckoutId,
    status: externalStatus
}) => {
    const [phone, setPhone] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [localStatus, setLocalStatus] = useState('idle'); // idle, processing, success, error

    useEffect(() => {
        if (externalStatus) {
            setLocalStatus(externalStatus);
        }
    }, [externalStatus]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!phone.match(/^(254|\+254|0)?(7|1)\d{8}$/)) {
            return;
        }

        let formattedPhone = phone.replace('+', '');
        if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.slice(1);
        if (formattedPhone.startsWith('7') || formattedPhone.startsWith('1'))
            formattedPhone = '254' + formattedPhone;

        setIsLoading(true);
        try {
            await onPaymentInitiated(formattedPhone);
            setLocalStatus('processing');
        } catch (err) {
            setLocalStatus('error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div 
                        className="payment-drawer-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.div 
                        className="payment-drawer"
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    >
                        <div className="payment-drawer-header">
                            <div className="drawer-handle" onClick={onClose} />
                            <button className="close-drawer-btn" onClick={onClose}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="payment-drawer-content">
                            {localStatus === 'idle' && (
                                <div className="payment-form-view">
                                    <div className="payment-icon-wrapper">
                                        <div className="mpesa-logo">M-PESA</div>
                                    </div>
                                    <h2>{title || 'Make Payment'}</h2>
                                    <p className="payment-desc">{description || 'Enter your M-Pesa number to proceed'}</p>
                                    
                                    <div className="payment-summary">
                                        <div className="summary-item">
                                            <span>Amount Due</span>
                                            <span className="amount">KSH {amount}</span>
                                        </div>
                                    </div>

                                    <form onSubmit={handleSubmit} className="mpesa-form">
                                        <div className="input-group-animated">
                                            <Smartphone size={18} className="input-icon" />
                                            <input 
                                                type="text" 
                                                placeholder="07XXXXXXXX"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                required
                                                autoFocus
                                            />
                                            <label>Phone Number</label>
                                        </div>

                                        <button 
                                            type="submit" 
                                            className="pay-now-btn"
                                            disabled={isLoading || !phone}
                                        >
                                            {isLoading ? (
                                                <Loader2 className="animate-spin" />
                                            ) : (
                                                <>
                                                    Confirm & Pay
                                                    <ArrowRight size={18} />
                                                </>
                                            )}
                                        </button>
                                    </form>

                                    <div className="payment-footer-info">
                                        <Lock size={12} />
                                        <span>Secure 128-bit SSL Encrypted Payment</span>
                                    </div>
                                </div>
                            )}

                            {localStatus === 'processing' && (
                                <div className="payment-processing-view">
                                    <div className="pulse-container">
                                        <div className="pulse-ring"></div>
                                        <div className="pulse-ring delay-1"></div>
                                        <Smartphone size={40} className="pulse-phone" />
                                    </div>
                                    <h3>Awaiting Confirmation</h3>
                                    <p>Please enter your M-Pesa PIN on the prompt sent to your phone <b>{phone}</b></p>
                                    
                                    <div className="processing-steps">
                                        <div className="step active">1. Request Sent</div>
                                        <div className="step active">2. Enter PIN</div>
                                        <div className="step">3. Verification</div>
                                    </div>

                                    <div className="checkout-badge">
                                        Ref: {externalCheckoutId?.slice(-8).toUpperCase()}
                                    </div>
                                </div>
                            )}

                            {localStatus === 'success' && (
                                <div className="payment-success-view">
                                    <motion.div 
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', bounce: 0.5 }}
                                    >
                                        <CheckCircle2 size={80} color="#10b981" />
                                    </motion.div>
                                    <h3>Payment Successful!</h3>
                                    <p>Your transaction has been verified and processed.</p>
                                    <button className="finish-btn" onClick={onSuccess}>
                                        Continue
                                    </button>
                                </div>
                            )}

                            {localStatus === 'error' && (
                                <div className="payment-error-view">
                                    <div className="error-icon-wrapper">
                                        <X size={40} color="#ef4444" />
                                    </div>
                                    <h3>Payment Failed</h3>
                                    <p>The transaction could not be completed. Please try again.</p>
                                    <button className="retry-btn" onClick={() => setLocalStatus('idle')}>
                                        Try Again
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default PaymentDrawer;
