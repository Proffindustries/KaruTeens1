import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useLogin, useVerify2FA } from '../hooks/useAuth.js';

const LoginPage = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [show2fa, setShow2fa] = useState(false);
    const [otp, setOtp] = useState('');
    const [userIdFor2fa, setUserIdFor2fa] = useState(null);

    const { mutate: login, isPending: isLoginPending } = useLogin();
    const { mutate: verify2fa, isPending: isVerifyPending } = useVerify2FA();
    const [errors, setErrors] = useState({});

    const validateEmail = (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    };

    const validateForm = () => {
        const newErrors = {};
        if (!email) {
            newErrors.email = 'Email is required';
        } else if (!validateEmail(email)) {
            newErrors.email = 'Please enter a valid email address';
        }
        if (!password) {
            newErrors.password = 'Password is required';
        } else if (password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (show2fa) {
            verify2fa({ user_id: userIdFor2fa, code: otp });
        } else {
            if (!validateForm()) return;
            login(
                { email, password },
                {
                    onSuccess: (data) => {
                        if (data.two_factor_required) {
                            setShow2fa(true);
                            setUserIdFor2fa(data.user_id);
                        }
                    },
                },
            );
        }
    };

    const isPending = isLoginPending || isVerifyPending;

    return (
        <div style={{ width: '100%' }}>
            <h2
                style={{
                    textAlign: 'center',
                    marginBottom: '1.5rem',
                    color: '#1a202c',
                    fontSize: '1.5rem',
                    fontWeight: '600',
                }}
            >
                {show2fa ? 'Two-Factor Authentication' : 'Welcome Back'}
            </h2>

            <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                {!show2fa ? (
                    <>
                        <div style={{ marginBottom: '1.25rem' }}>
                            <label
                                htmlFor="email"
                                style={{
                                    display: 'block',
                                    marginBottom: '0.5rem',
                                    fontWeight: '500',
                                    fontSize: '0.9rem',
                                    color: '#2d3436',
                                }}
                            >
                                Email
                            </label>
                            <input
                                type="email"
                                id="email"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    border: errors.email
                                        ? '1px solid #ff6b6b'
                                        : '1px solid #e2e8f0',
                                    borderRadius: '0.75rem',
                                    background: '#ffffff',
                                    color: '#1a202c',
                                    fontSize: '1rem',
                                    boxSizing: 'border-box',
                                }}
                                placeholder="student@university.edu"
                                required
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    if (errors.email) setErrors({ ...errors, email: null });
                                }}
                            />
                            {errors.email && (
                                <p
                                    style={{
                                        color: '#ff6b6b',
                                        fontSize: '0.8rem',
                                        marginTop: '0.25rem',
                                    }}
                                >
                                    {errors.email}
                                </p>
                            )}
                        </div>

                        <div style={{ marginBottom: '1.25rem' }}>
                            <label
                                htmlFor="password"
                                style={{
                                    display: 'block',
                                    marginBottom: '0.5rem',
                                    fontWeight: '500',
                                    fontSize: '0.9rem',
                                    color: '#2d3436',
                                }}
                            >
                                Password
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 1rem',
                                        paddingRight: '3rem',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '0.75rem',
                                        background: '#ffffff',
                                        color: '#1a202c',
                                        fontSize: '1rem',
                                        boxSizing: 'border-box',
                                    }}
                                    placeholder="••••••••"
                                    required
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        if (errors.password)
                                            setErrors({ ...errors, password: null });
                                    }}
                                />
                                {errors.password && (
                                    <p
                                        style={{
                                            color: '#ff6b6b',
                                            fontSize: '0.8rem',
                                            marginTop: '0.25rem',
                                        }}
                                    >
                                        {errors.password}
                                    </p>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute',
                                        right: '1rem',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: '#636e72',
                                        padding: '0',
                                        display: 'flex',
                                    }}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                            <Link
                                to="/forgot-password"
                                style={{
                                    display: 'block',
                                    textAlign: 'right',
                                    fontSize: '0.85rem',
                                    color: '#ff6b6b',
                                    textDecoration: 'none',
                                    marginTop: '0.5rem',
                                    fontWeight: '600',
                                }}
                            >
                                Forgot Password?
                            </Link>
                        </div>
                    </>
                ) : (
                    <div style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
                        <ShieldCheck
                            size={48}
                            color="#ff6b6b"
                            style={{ marginBottom: '1rem', marginInline: 'auto' }}
                        />
                        <p
                            style={{
                                fontSize: '0.9rem',
                                color: '#636e72',
                                marginBottom: '1.5rem',
                            }}
                        >
                            Please enter the 6-digit verification code sent to your email.
                        </p>
                        <input
                            type="text"
                            maxLength="6"
                            style={{
                                width: '100%',
                                padding: '1rem',
                                border: '1px solid #e2e8f0',
                                borderRadius: '0.75rem',
                                background: '#ffffff',
                                color: '#1a202c',
                                fontSize: '1.5rem',
                                textAlign: 'center',
                                letterSpacing: '0.5rem',
                                fontWeight: '700',
                                boxSizing: 'border-box',
                            }}
                            placeholder="000000"
                            required
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        />
                        <button
                            type="button"
                            onClick={() => setShow2fa(false)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#636e72',
                                fontSize: '0.85rem',
                                marginTop: '1rem',
                                cursor: 'pointer',
                                textDecoration: 'underline',
                            }}
                        >
                            Back to Login
                        </button>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isPending}
                    style={{
                        width: '100%',
                        padding: '0.75rem 1.5rem',
                        background: '#ff6b6b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.75rem',
                        fontWeight: '600',
                        fontSize: '1rem',
                        cursor: isPending ? 'not-allowed' : 'pointer',
                        opacity: isPending ? 0.7 : 1,
                        marginTop: '1.5rem',
                    }}
                >
                    {isPending ? 'Processing...' : show2fa ? 'Verify & Log In' : 'Log In'}
                </button>

                {!show2fa && (
                    <>
                        <div
                            style={{
                                margin: '1.5rem 0',
                                textAlign: 'center',
                                position: 'relative',
                            }}
                        >
                            <div
                                style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: '50%',
                                    width: '100%',
                                    height: '1px',
                                    background: '#dfe6e9',
                                }}
                            ></div>
                            <span
                                style={{
                                    background: '#ffffff',
                                    padding: '0 1rem',
                                    position: 'relative',
                                    color: '#636e72',
                                    fontSize: '0.9rem',
                                }}
                            >
                                OR
                            </span>
                        </div>

                        <div style={{ textAlign: 'center', fontSize: '0.95rem', color: '#636e72' }}>
                            Don't have an account?{' '}
                            <Link
                                to="/register"
                                style={{
                                    color: '#ff6b6b',
                                    textDecoration: 'none',
                                    fontWeight: '600',
                                }}
                            >
                                Create one
                            </Link>
                        </div>
                    </>
                )}
            </form>
        </div>
    );
};

export default LoginPage;
