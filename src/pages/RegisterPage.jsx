import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Camera, ChevronRight, ChevronLeft } from 'lucide-react';
import AuthLayout from '../layouts/AuthLayout.jsx';
import { useRegister } from '../hooks/useAuth.js';

const RegisterPage = () => {
    const location = useLocation();
    const [step, setStep] = useState(1);
    const totalSteps = 3;

    const [formData, setFormData] = useState({
        fullName: '', email: '', username: '', password: '', confirmPassword: '',
        legalName: '', age: '', gender: '', bio: '', school: '', yearOfStudy: '',
        profilePic: null
    });

    const { mutate: register, isPending, error } = useRegister();

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'username') {
            const sanitizedValue = value.replace(/[^a-zA-Z0-9]/g, '');
            setFormData(prev => ({ ...prev, [name]: sanitizedValue }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleNext = (e) => {
        e.preventDefault();
        if (step < totalSteps) setStep(step + 1);
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        register({
            email: formData.email,
            password: formData.password,
            username: formData.username,
            full_name: formData.fullName,
            bio: formData.bio,
            school: formData.school,
            year_of_study: formData.yearOfStudy ? parseInt(formData.yearOfStudy) : null,
            age: formData.age ? parseInt(formData.age) : null,
            gender: formData.gender,
            avatar_url: null // Handle this later with real upload
        });
    };

    return (
        <AuthLayout
            title="Join KaruTeens"
            subtitle={`Step ${step} of ${totalSteps}: ${step === 1 ? 'Basic Info' : step === 2 ? 'Student Details' : 'Profile Setup'}`}
        >
            <form onSubmit={step === totalSteps ? handleSubmit : handleNext}>


                {/* Step 1: Basic Info */}
                {step === 1 && (
                    <div className="step-content">
                        <div className="form-group">
                            <label htmlFor="fullName">Full Name</label>
                            <input type="text" id="fullName" name="fullName" className="form-input" required value={formData.fullName} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="email">Email Address</label>
                            <input type="email" id="email" name="email" className="form-input" required value={formData.email} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="username">Username</label>
                            <input type="text" id="username" name="username" className="form-input" required value={formData.username} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <input type="password" id="password" name="password" className="form-input" required value={formData.password} onChange={handleChange} />
                        </div>
                    </div>
                )}

                {/* Step 2: Student Details */}
                {step === 2 && (
                    <div className="step-content">
                        <div className="form-group">
                            <label htmlFor="legalName">Legal Name (Private)</label>
                            <input type="text" id="legalName" name="legalName" className="form-input" required value={formData.legalName} onChange={handleChange} />
                        </div>
                        <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label htmlFor="age">Age</label>
                                <input type="number" id="age" name="age" className="form-input" required value={formData.age} onChange={handleChange} />
                            </div>
                            <div>
                                <label htmlFor="gender">Gender</label>
                                <select id="gender" name="gender" className="form-input" required value={formData.gender} onChange={handleChange}>
                                    <option value="">Select</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label htmlFor="school">School of...</label>
                            <select id="school" name="school" className="form-input" required value={formData.school} onChange={handleChange}>
                                <option value="">Select School</option>
                                <option value="business">School of Business</option>
                                <option value="education">School of Education</option>
                                <option value="science">School of Science</option>
                                <option value="arts">School of Arts</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="yearOfStudy">Year of Study</label>
                            <select id="yearOfStudy" name="yearOfStudy" className="form-input" required value={formData.yearOfStudy} onChange={handleChange}>
                                <option value="">Select Year</option>
                                <option value="1">Year 1</option>
                                <option value="2">Year 2</option>
                                <option value="3">Year 3</option>
                                <option value="4">Year 4</option>
                            </select>
                        </div>
                    </div>
                )}

                {/* Step 3: Profile & Bio */}
                {step === 3 && (
                    <div className="step-content">
                        <div className="form-group" style={{ textAlign: 'center' }}>
                            <label>Profile Picture</label>
                            <div style={{
                                width: '120px', height: '120px', background: 'var(--background)',
                                borderRadius: '50%', margin: '0 auto 1rem', display: 'flex',
                                alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--border)'
                            }}>
                                <Camera size={32} color="var(--text-muted)" />
                            </div>
                            <input type="file" className="form-input" style={{ padding: '0.25rem' }} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="bio">Bio</label>
                            <textarea id="bio" name="bio" className="form-input" rows="4" placeholder="Tell us about yourself..." value={formData.bio} onChange={handleChange}></textarea>
                        </div>
                    </div>
                )}

                <div className="form-actions" style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                    {step > 1 && (
                        <button type="button" className="btn btn-outline" onClick={handleBack} disabled={isPending}>
                            <ChevronLeft size={16} /> Back
                        </button>
                    )}
                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={isPending}>
                        {step === totalSteps ? (isPending ? 'Creating Account...' : 'Complete Registration') : <><span style={{ marginRight: '0.5rem' }}>Next</span> <ChevronRight size={16} /></>}
                    </button>
                </div>

                {step === 1 && (
                    <div className="auth-register-link" style={{ marginTop: '1.5rem' }}>
                        Already have an account? <Link to="/login" state={location.state} className="text-primary hover:underline">Login here</Link>
                    </div>
                )}
            </form>
        </AuthLayout>
    );
};

export default RegisterPage;
