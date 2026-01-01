import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import AuthLayout from '../layouts/AuthLayout.jsx';
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
        <AuthLayout
            title="Welcome Back"
            subtitle="Login to continue your journey."
        >
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                        type="email"
                        id="email"
                        className="form-input"
                        placeholder="student@university.edu"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <div className="password-wrapper">
                        <input
                            type={showPassword ? "text" : "password"}
                            id="password"
                            className="form-input"
                            placeholder="••••••••"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <button
                            type="button"
                            className="password-toggle"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                    <Link to="/forgot-password" className="forgot-link">Forgot Password?</Link>
                </div>


                <button type="submit" className="btn btn-primary auth-submit" disabled={isPending}>
                    {isPending ? 'Logging in...' : 'Log In'}
                </button>

                <div className="auth-separator">
                    <span>OR</span>
                </div>

                <div className="auth-register-link">
                    Don't have an account? <Link to="/register">Create one</Link>
                </div>
            </form>
        </AuthLayout>
    );
};

export default LoginPage;
