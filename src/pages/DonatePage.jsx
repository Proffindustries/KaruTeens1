import React, { useState, useEffect } from 'react';
import { Heart, CreditCard, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import '../styles/DonatePage.css';

import MpesaPaymentModal from '../components/MpesaPaymentModal.jsx';

const DonatePage = () => {
    const { showToast } = useToast();
    const [amount, setAmount] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [stats, setStats] = useState({ raised: 0, goal: 50000 });
    const [recentDonors, setRecentDonors] = useState([]);

    useEffect(() => {
        const fetchDonationData = async () => {
            try {
                const [statsRes, donorsRes] = await Promise.all([
                    api.get('/payments/donations/stats'),
                    api.get('/payments/donations/recent'),
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

    const handleSuccess = (data) => {
        showToast('Donation received! Thank you for your support.', 'success');
        // Refresh data
        api.get('/payments/donations/stats').then((res) => setStats(res.data));
        api.get('/payments/donations/recent').then((res) => setRecentDonors(res.data));
        setAmount('');
    };

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

                    <button
                        className="btn btn-primary btn-lg btn-full"
                        onClick={() => {
                            if (!amount || parseFloat(amount) <= 0) {
                                showToast('Please enter a valid donation amount', 'error');
                                return;
                            }
                            setIsModalOpen(true);
                        }}
                    >
                        Donate with M-Pesa{' '}
                        <Heart size={20} fill="white" style={{ marginLeft: '8px' }} />
                    </button>
                    <p className="donate-secure">
                        <CreditCard size={14} /> Secure M-Pesa Transaction
                    </p>
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
                                            <span className="donor-time">
                                                {formatTime(d.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p
                                    className="text-muted"
                                    style={{ textAlign: 'center', padding: '1rem' }}
                                >
                                    No donations yet. Be the first!
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <MpesaPaymentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                amount={parseFloat(amount)}
                txType="donation"
                onSuccess={handleSuccess}
            />
        </div>
    );
};

export default DonatePage;
