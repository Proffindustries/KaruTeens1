import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useLogin } from '../hooks/useAuth.js';

const LoginPage = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const { mutate: login, isPending, error } = useLogin();

    const handleSubmit = (e) => {
        e.preventDefault();
        login({ email, password });
    };

    return (
        <div style={{ width: '100%' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#1a202c', fontSize: '1.5rem', fontWeight: '600' }}>
                Welcome Back
            </h2>
            
            <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                <div style={{ marginBottom: '1.25rem' }}>
                    <label 
                        htmlFor="email" 
                        style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem', color: '#2d3436' }}
                    >
                        Email
                    </label>
                    <input
                        type="email"
                        id="email"
                        style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            border: '1px solid #e2e8f0',
                            borderRadius: '0.75rem',
                            background: '#ffffff',
                            color: '#1a202c',
                            fontSize: '1rem',
                            boxSizing: 'border-box'
                        }}
                        placeholder="student@university.edu"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                    <label 
                        htmlFor="password" 
                        style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem', color: '#2d3436' }}
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
                                boxSizing: 'border-box'
                            }}
                            placeholder="••••••••"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
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
                                display: 'flex'
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
                            fontWeight: '600'
                        }}
                    >
                        Forgot Password?
                    </Link>
                </div>

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
                        marginTop: '1.5rem'
                    }}
                >
                    {isPending ? 'Logging in...' : 'Log In'}
                </button>

                <div style={{ margin: '1.5rem 0', textAlign: 'center', position: 'relative' }}>
                    <div style={{ 
                        position: 'absolute', 
                        left: 0, 
                        top: '50%', 
                        width: '100%', 
                        height: '1px', 
                        background: '#dfe6e9' 
                    }}></div>
                    <span style={{ 
                        background: '#ffffff', 
                        padding: '0 1rem', 
                        position: 'relative', 
                        color: '#636e72', 
                        fontSize: '0.9rem' 
                    }}>
                        OR
                    </span>
                </div>

                <div style={{ textAlign: 'center', fontSize: '0.95rem', color: '#636e72' }}>
                    Don't have an account?{' '}
                    <Link to="/register" style={{ color: '#ff6b6b', textDecoration: 'none', fontWeight: '600' }}>
                        Create one
                    </Link>
                </div>
            </form>
        </div>
    );
};

export default LoginPage;
