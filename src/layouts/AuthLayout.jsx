import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import Logo from '../components/Logo';
import '../styles/Auth.css';

const AuthLayout = ({ title, subtitle, children }) => {
    const content = children || <Outlet />;

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <Link
                        to="/"
                        className="back-link"
                        style={{ marginBottom: '1rem', display: 'inline-block' }}
                    >
                        ← Back to Home
                    </Link>
                    <div className="auth-logo">
                        <Logo width="160px" height="54px" />
                    </div>
                    {title && <h2 className="auth-title">{title}</h2>}
                    {subtitle && <p className="auth-subtitle">{subtitle}</p>}
                </div>
                <div className="auth-body">{content}</div>
            </div>
        </div>
    );
};

export default AuthLayout;
