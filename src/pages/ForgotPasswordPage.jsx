import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, Key, ArrowLeft, Loader2 } from 'lucide-react';
import AuthLayout from '../layouts/AuthLayout.jsx';
import { useForgotPassword, useResetPassword } from '../hooks/useAuth.js';

const ForgotPasswordPage = () => {
    const [step, setStep] = useState(1); // 1: request code, 2: reset password, 3: success
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');

    const forgotPassword = useForgotPassword();
    const resetPassword = useResetPassword();

    const handleRequestCode = (e) => {
        e.preventDefault();
        forgotPassword.mutate(email, {
            onSuccess: () => setStep(2),
        });
    };

    const handleResetPassword = (e) => {
        e.preventDefault();
        resetPassword.mutate(
            { email, code, new_password: newPassword },
            { onSuccess: () => setStep(3) },
        );
    };

    return (
        <AuthLayout
            title={step === 1 ? 'Forgot Password?' : 'Reset Password'}
            subtitle={
                step === 1
                    ? 'Enter your email to receive a password reset code.'
                    : 'Enter the 6-digit code sent to your email and your new password.'
            }
        >
            <div className="forgot-password-container">
                {step === 3 ? (
                    <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                        <h3>Password Reset Successful</h3>
                        <p>Your password has been updated. You can now log in.</p>
                        <Link
                            to="/login"
                            className="btn btn-primary"
                            style={{ marginTop: '1rem', display: 'inline-block' }}
                        >
                            Back to Login
                        </Link>
                    </div>
                ) : step === 1 ? (
                    <form onSubmit={handleRequestCode}>
                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label htmlFor="email">University Email</label>
                            <div className="password-wrapper" style={{ position: 'relative' }}>
                                <Mail
                                    size={18}
                                    style={{
                                        position: 'absolute',
                                        left: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: 'rgba(var(--text-main), 0.5)',
                                    }}
                                />
                                <input
                                    type="email"
                                    id="email"
                                    className="form-input"
                                    placeholder="student@university.edu"
                                    required
                                    style={{ paddingLeft: '40px' }}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        {forgotPassword.isError && (
                            <p
                                className="error-text"
                                style={{ color: '#ff4757', marginBottom: '1rem' }}
                            >
                                {forgotPassword.error?.response?.data?.error ||
                                    'Failed to send reset code'}
                            </p>
                        )}

                        <button
                            type="submit"
                            className="btn btn-primary auth-submit"
                            style={{ width: '100%' }}
                            disabled={forgotPassword.isPending}
                        >
                            {forgotPassword.isPending ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                'Send Reset Code'
                            )}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleResetPassword}>
                        <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                            <label htmlFor="code">Reset Code</label>
                            <div className="password-wrapper" style={{ position: 'relative' }}>
                                <Key
                                    size={18}
                                    style={{
                                        position: 'absolute',
                                        left: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: 'rgba(var(--text-main), 0.5)',
                                    }}
                                />
                                <input
                                    type="text"
                                    id="code"
                                    className="form-input"
                                    placeholder="Enter 6-digit code"
                                    required
                                    maxLength={6}
                                    style={{ paddingLeft: '40px' }}
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                                />
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label htmlFor="newPassword">New Password</label>
                            <div className="password-wrapper" style={{ position: 'relative' }}>
                                <Lock
                                    size={18}
                                    style={{
                                        position: 'absolute',
                                        left: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: 'rgba(var(--text-main), 0.5)',
                                    }}
                                />
                                <input
                                    type="password"
                                    id="newPassword"
                                    className="form-input"
                                    placeholder="Enter new password"
                                    required
                                    minLength={8}
                                    style={{ paddingLeft: '40px' }}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        {resetPassword.isError && (
                            <p
                                className="error-text"
                                style={{ color: '#ff4757', marginBottom: '1rem' }}
                            >
                                {resetPassword.error?.response?.data?.error ||
                                    'Failed to reset password'}
                            </p>
                        )}

                        <button
                            type="submit"
                            className="btn btn-primary auth-submit"
                            style={{ width: '100%' }}
                            disabled={resetPassword.isPending}
                        >
                            {resetPassword.isPending ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                'Reset Password'
                            )}
                        </button>

                        <button
                            type="button"
                            className="btn btn-outline"
                            style={{ width: '100%', marginTop: '1rem', border: 'none' }}
                            onClick={() => setStep(1)}
                        >
                            Didn't get code? Resend
                        </button>
                    </form>
                )}

                <div
                    className="auth-register-link"
                    style={{ marginTop: '2rem', textAlign: 'center' }}
                >
                    <Link
                        to="/login"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            color: 'rgb(var(--primary))',
                            textDecoration: 'none',
                            fontWeight: '500',
                        }}
                    >
                        <ArrowLeft size={16} /> Back to Login
                    </Link>
                </div>
            </div>
        </AuthLayout>
    );
};

export default ForgotPasswordPage;
