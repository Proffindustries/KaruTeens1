import React from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, Star, Check } from 'lucide-react';
import '../styles/Auth.css';

const GetAccountPage = () => {
    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h1>Join KaruTeens</h1>
                    <p>Choose your account type to get started.</p>
                </div>

                <div className="auth-body">
                    {/* Student Account */}
                    <Link to="/register" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div
                            className="account-type-card"
                            style={{
                                border: '2px solid #3742fa',
                                borderRadius: '8px',
                                padding: '1.5rem',
                                marginBottom: '1rem',
                                cursor: 'pointer',
                                background: 'rgba(55, 66, 250, 0.03)',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginBottom: '0.5rem',
                                }}
                            >
                                <h3 style={{ color: '#3742fa' }}>Student Account</h3>
                                <div
                                    style={{
                                        background: '#3742fa',
                                        color: 'white',
                                        borderRadius: '50%',
                                        padding: '2px',
                                    }}
                                >
                                    <Check size={14} />
                                </div>
                            </div>
                            <p style={{ fontSize: '0.9rem', color: '#636e72' }}>
                                For current university students. Requires .ac.ke email or student
                                ID.
                            </p>
                            <div style={{ marginTop: '0.5rem', fontWeight: 'bold' }}>
                                Free Forever
                            </div>
                        </div>
                    </Link>

                    {/* Pro Account */}
                    <div
                        className="account-type-card disabled"
                        style={{
                            border: '2px solid #ddd',
                            borderRadius: '8px',
                            padding: '1.5rem',
                            marginBottom: '1rem',
                            opacity: 0.5,
                            cursor: 'not-allowed',
                        }}
                        aria-disabled="true"
                        role="button"
                        tabIndex={-1}
                    >
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: '0.5rem',
                            }}
                        >
                            <h3 style={{ color: '#666' }}>Pro Account</h3>
                            <span
                                className="soon-badge"
                                style={{
                                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                                    color: 'white',
                                    borderRadius: '20px',
                                    padding: '2px 10px',
                                    fontSize: '0.75rem',
                                }}
                            >
                                SOON
                            </span>
                        </div>
                        <p style={{ color: '#666', fontSize: '0.9rem' }}>
                            Advanced features for power users
                        </p>
                    </div>

                    {/* Alumni Account */}
                    <div
                        className="account-type-card disabled"
                        style={{
                            border: '2px solid #ddd',
                            borderRadius: '8px',
                            padding: '1.5rem',
                            marginBottom: '1rem',
                            opacity: 0.5,
                            cursor: 'not-allowed',
                        }}
                        aria-disabled="true"
                        role="button"
                        tabIndex={-1}
                    >
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: '0.5rem',
                            }}
                        >
                            <h3 style={{ color: '#666' }}>Alumni Account</h3>
                            <span
                                className="soon-badge"
                                style={{
                                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                                    color: 'white',
                                    borderRadius: '20px',
                                    padding: '2px 10px',
                                    fontSize: '0.75rem',
                                }}
                            >
                                SOON
                            </span>
                        </div>
                        <p style={{ color: '#666', fontSize: '0.9rem' }}>
                            Stay connected after graduation
                        </p>
                    </div>
                    {/* Alumni / Guest */}
                    <div
                        className="account-type-card disabled"
                        style={{
                            border: '2px solid #ddd',
                            borderRadius: '8px',
                            padding: '1.5rem',
                            marginBottom: '1rem',
                            opacity: 0.5,
                            cursor: 'not-allowed',
                        }}
                        aria-disabled="true"
                        role="button"
                        tabIndex={-1}
                    >
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: '0.5rem',
                            }}
                        >
                            <h3>Alumni / Guest</h3>
                            <Star size={16} color="#ffa502" />
                        </div>
                        <p style={{ fontSize: '0.9rem', color: '#636e72' }}>
                            For alumni and verified guests. Access marketplace and events only.
                        </p>
                        <div style={{ marginTop: '0.5rem', fontWeight: 'bold' }}>Waitlist Only</div>
                    </div>

                    <p style={{ textAlign: 'center', fontSize: '0.85rem', marginTop: '1.5rem' }}>
                        By creating an account, you agree to our{' '}
                        <Link to="/legal">Terms of Service</Link>.
                    </p>
                </div>

                <div className="auth-footer">
                    <p>
                        Already have an account? <Link to="/login">Log in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default GetAccountPage;
