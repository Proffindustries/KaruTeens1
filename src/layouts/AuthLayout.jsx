import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import Logo from '../components/Logo';
import '../styles/Auth.css';

const AuthLayout = () => {
    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <Link to="/" className="auth-logo">
                        <Logo width="160px" height="54px" />
                    </Link>
                </div>
                <div className="auth-body">
                    <Outlet />
                </div>
                <div className="auth-footer">
                    <Link to="/" className="back-link">
                        ← Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;
