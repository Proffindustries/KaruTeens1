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
                        <div className="account-type-card" style={{
                            border: '2px solid #3742fa',
                            borderRadius: '8px',
                            padding: '1.5rem',
                            marginBottom: '1rem',
                            cursor: 'pointer',
                            background: 'rgba(55, 66, 250, 0.03)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <h3 style={{ color: '#3742fa' }}>Student Account</h3>
                                <div style={{ background: '#3742fa', color: 'white', borderRadius: '50%', padding: '2px' }}><Check size={14} /></div>
                            </div>
                            <p style={{ fontSize: '0.9rem', color: '#636e72' }}>For current university students. Requires .ac.ke email or student ID.</p>
                            <div style={{ marginTop: '0.5rem', fontWeight: 'bold' }}>Free Forever</div>
                        </div>
                    </Link>

                    {/* Pro Account */}
                    <div className="account-type-card disabled" style={{
                        border: '1px solid #dcdde1',
                        borderRadius: '8px',
                        padding: '1.5rem',
                        opacity: 0.7,
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <div style={{ position: 'absolute', top: '10px', right: '-30px', background: '#ffa502', color: 'white', padding: '2px 30px', transform: 'rotate(45deg)', fontSize: '0.7rem' }}>soon</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <h3>Alumni / Guest</h3>
                            <Star size={16} color="#ffa502" />
                        </div>
                        <p style={{ fontSize: '0.9rem', color: '#636e72' }}>For alumni and verified guests. Access marketplace and events only.</p>
                        <div style={{ marginTop: '0.5rem', fontWeight: 'bold' }}>Waitlist Only</div>
                    </div>

                    <p style={{ textAlign: 'center', fontSize: '0.85rem', marginTop: '1.5rem' }}>
                        By creating an account, you agree to our <Link to="/legal">Terms of Service</Link>.
                    </p>
                </div>

                <div className="auth-footer">
                    <p>Already have an account? <Link to="/login">Log in</Link></p>
                </div>
            </div>
        </div>
    );
};

export default GetAccountPage;
