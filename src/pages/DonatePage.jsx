import React, { useState } from 'react';
import { Heart, CreditCard, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import '../styles/DonatePage.css'; // Creating next

const DonatePage = () => {
    const [amount, setAmount] = useState('');

    // Mock Data
    const goal = 50000;
    const raised = 32500;
    const percentage = (raised / goal) * 100;

    const recentDonors = [
        { name: "Anonymous", amount: 500, time: "2m ago" },
        { name: "John Doe", amount: 1000, time: "1h ago" },
        { name: "Sarah K.", amount: 200, time: "3h ago" },
    ];

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
                        <button onClick={() => setAmount('50')}>50</button>
                        <button onClick={() => setAmount('100')}>100</button>
                        <button onClick={() => setAmount('500')}>500</button>
                        <button onClick={() => setAmount('1000')}>1000</button>
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

                    <button className="btn btn-primary btn-lg btn-full">
                        Donate with M-Pesa <Heart size={20} fill="white" />
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
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 1 }}
                            ></motion.div>
                        </div>
                        <div className="progress-labels">
                            <span>Raised: Ksh {raised.toLocaleString()}</span>
                            <span>Goal: Ksh {goal.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="card recent-donors-card">
                        <h3><TrendingUp size={18} /> Recent Donors</h3>
                        <div className="donors-list">
                            {recentDonors.map((d, i) => (
                                <div key={i} className="donor-row">
                                    <span className="donor-name">{d.name}</span>
                                    <div className="right">
                                        <span className="donor-amount">+{d.amount}</span>
                                        <span className="donor-time">{d.time}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DonatePage;
