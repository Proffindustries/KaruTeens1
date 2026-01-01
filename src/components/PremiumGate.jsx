import React from 'react';
import { Crown, Lock, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../styles/PremiumGate.css';

const PremiumGate = ({ feature = "this feature" }) => {
    const navigate = useNavigate();

    return (
        <div className="premium-gate-container">
            <div className="premium-gate-card card">
                <div className="crown-icon-container">
                    <Crown size={64} color="#f1c40f" className="crown-anim" />
                </div>
                <h1>Campus Pro Required</h1>
                <p className="gate-description">
                    Access to <strong>{feature}</strong> is exclusive to Campus Pro members.
                </p>

                <div className="premium-benefits-grid">
                    <div className="benefit-item">
                        <Check size={20} color="#2ed573" />
                        <span>Ad-free experience</span>
                    </div>
                    <div className="benefit-item">
                        <Check size={20} color="#2ed573" />
                        <span>Unlimited file uploads</span>
                    </div>
                    <div className="benefit-item">
                        <Check size={20} color="#2ed573" />
                        <span>Study Rooms access</span>
                    </div>
                    <div className="benefit-item">
                        <Check size={20} color="#2ed573" />
                        <span>Profile visitors</span>
                    </div>
                    <div className="benefit-item">
                        <Check size={20} color="#2ed573" />
                        <span>Verified badge</span>
                    </div>
                    <div className="benefit-item">
                        <Check size={20} color="#2ed573" />
                        <span>Premium support</span>
                    </div>
                </div>

                <div className="pricing-display">
                    <span className="price">Ksh 200</span>
                    <span className="period">/month</span>
                </div>

                <button
                    className="btn btn-primary btn-full btn-lg"
                    onClick={() => navigate('/premium')}
                >
                    <Lock size={18} />
                    Upgrade to Campus Pro
                </button>

                <p className="fine-print">Cancel anytime. No commitments.</p>
            </div>
        </div>
    );
};

export default PremiumGate;
