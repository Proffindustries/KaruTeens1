import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Camera, ChevronRight, ChevronLeft } from 'lucide-react';
import AuthLayout from '../layouts/AuthLayout.jsx';
import { useRegister } from '../hooks/useAuth.js';
import { useToast } from '../context/ToastContext.jsx';

const RegisterPage = () => {
    const location = useLocation();
    const [step, setStep] = useState(1);
    const totalSteps = 3;
    const { showToast } = useToast();

    const [formData, setFormData] = useState({
        email: '',
        username: '',
        password: '',
        confirmPassword: '',
    });

    const { mutate: register, isPending } = useRegister();

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'username') {
            const sanitizedValue = value.replace(/[^a-zA-Z0-9]/g, '');
            setFormData((prev) => ({ ...prev, [name]: sanitizedValue }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            showToast('Passwords do not match', 'error');
            return;
        }
        register({
            email: formData.email,
            password: formData.password,
            username: formData.username,
        });
    };

    return (
        <AuthLayout title="Join KaruTeens" subtitle="Create your account to get started">
            <form onSubmit={handleSubmit}>
                <div className="step-content">
                    <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            className="form-input"
                            required
                            placeholder="student@university.edu"
                            value={formData.email}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            type="text"
                            id="username"
                            name="username"
                            className="form-input"
                            required
                            placeholder="choose_a_username"
                            value={formData.username}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            className="form-input"
                            required
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            name="confirmPassword"
                            className="form-input"
                            required
                            placeholder="••••••••"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                <div className="form-actions" style={{ marginTop: '1.5rem' }}>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                        disabled={isPending}
                    >
                        {isPending ? 'Creating Account...' : 'Create Account'}
                    </button>
                </div>

                <div
                    className="auth-register-link"
                    style={{ marginTop: '1.5rem', textAlign: 'center' }}
                >
                    Already have an account?{' '}
                    <Link
                        to="/login"
                        state={location.state}
                        className="text-primary hover:underline"
                    >
                        Login here
                    </Link>
                </div>
            </form>
        </AuthLayout>
    );
};

export default RegisterPage;
