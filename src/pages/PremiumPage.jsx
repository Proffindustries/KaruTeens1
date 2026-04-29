import React, { useState, useEffect } from 'react';
import { Check, Star, Zap, Crown, Loader, Smartphone } from 'lucide-react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import safeLocalStorage from '../utils/storage.js';
import '../styles/DonatePage.css';

import MpesaPaymentModal from '../components/MpesaPaymentModal';

const PremiumPage = () => {
    const { showToast } = useToast();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState('monthly');

    const getAmount = () => {
        return selectedPlan === 'weekly' ? 10 : selectedPlan === 'monthly' ? 40 : 200;
    };

    const handleSuccess = (data) => {
        showToast('Upgrade successful!', 'success');
        const user = JSON.parse(safeLocalStorage.getItem('user'));
        if (user) {
            safeLocalStorage.setItem(
                'user',
                JSON.stringify({ ...user, is_premium: true, role: 'premium' }),
            );
        }
        setTimeout(() => {
            window.location.href = '/feed';
        }, 2000);
    };

    return (
        <div className="container premium-page" style={{ paddingBottom: '4rem' }}>
            <div className="premium-header">
                <Crown
                    size={64}
                    className="crown-anim"
                    color="#f1c40f"
                    style={{ marginBottom: '1rem' }}
                />
                <h1>Upgrade to Premium</h1>
                <p>Unlock exclusive features and supercharge your campus life.</p>
            </div>

            <div className="premium-options-container">
                <div className="pricing-grid">
                    {/* Weekly Plan */}
                    <div
                        className={`card pricing-card ${selectedPlan === 'weekly' ? 'selected' : ''}`}
                        onClick={() => setSelectedPlan('weekly')}
                    >
                        <div className="pricing-header">
                            <h3>Weekly Star</h3>
                            <div className="price">
                                Ksh 10<span>/wk</span>
                            </div>
                            <p>Short term boost.</p>
                        </div>
                        <ul className="features-list">
                            <li>
                                <Check size={16} /> Verified Badge
                            </li>
                            <li>
                                <Check size={16} /> Unlimited Uploads
                            </li>
                            <li>
                                <Check size={16} /> Profile Visitors
                            </li>
                        </ul>
                    </div>

                    {/* Monthly Plan */}
                    <div
                        className={`card pricing-card featured ${selectedPlan === 'monthly' ? 'selected' : ''}`}
                        onClick={() => setSelectedPlan('monthly')}
                    >
                        <div className="best-value">POPULAR</div>
                        <div className="pricing-header">
                            <h3>Campus Pro</h3>
                            <div className="price">
                                Ksh 40<span>/mo</span>
                            </div>
                            <p>Full month of dominance.</p>
                        </div>
                        <ul className="features-list">
                            <li>
                                <Check size={16} /> <strong>Everything in Weekly</strong>
                            </li>
                            <li>
                                <Check size={16} /> Premium Study Rooms
                            </li>
                            <li>
                                <Check size={16} /> Priority Support
                            </li>
                        </ul>
                    </div>

                    {/* Semi-Annual Plan (5mo 1wk) */}
                    <div
                        className={`card pricing-card ${selectedPlan === 'semi-annual' ? 'selected' : ''}`}
                        onClick={() => setSelectedPlan('semi-annual')}
                    >
                        <div className="pricing-header">
                            <h3>Elite Legend</h3>
                            <div className="price">Ksh 200</div>
                            <p>Valid for 5 Months + 1 Week.</p>
                        </div>
                        <ul className="features-list">
                            <li>
                                <Check size={16} /> <strong>Everything in Pro</strong>
                            </li>
                            <li>
                                <Check size={16} /> VIP Status Badge
                            </li>
                            <li>
                                <Check size={16} /> Exclusive Beta Access
                            </li>
                        </ul>
                    </div>
                </div>

                <div
                    className="card upgrade-action-card"
                    style={{ maxWidth: '400px', margin: '2rem auto', textAlign: 'center' }}
                >
                    <button
                        className="btn btn-primary btn-full"
                        onClick={() => setIsModalOpen(true)}
                        style={{ height: '3.5rem', fontSize: '1.1rem' }}
                    >
                        Upgrade Now for Ksh {getAmount()}
                    </button>
                    <p className="text-muted" style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
                        Secure M-Pesa Transaction
                    </p>
                </div>
            </div>

            <MpesaPaymentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                amount={getAmount()}
                txType="premium"
                extraData={{ premium_duration: selectedPlan }}
                onSuccess={handleSuccess}
            />
        </div>
    );
};

export default PremiumPage;
