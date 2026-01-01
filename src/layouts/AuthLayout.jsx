import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import '../styles/Auth.css';

const AuthLayout = ({ children, title, subtitle }) => {
    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <Link to="/" className="auth-logo">
                        <Logo width="160px" height="54px" />
                    </Link>
                    <h2>{title}</h2>
                    {subtitle && <p>{subtitle}</p>}
                </div>
                <div className="auth-body">
                    {children}
                </div>
                <div className="auth-footer">
                    <Link to="/" className="back-link">← Back to Home</Link>
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;
