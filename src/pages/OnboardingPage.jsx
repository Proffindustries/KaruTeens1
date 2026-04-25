import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import safeLocalStorage from '../utils/storage.js';
import {
    User,
    Users,
    Bell,
    Camera,
    Palette,
    ArrowRight,
    ArrowLeft,
    Check,
    Sparkles,
    UserCircle,
    MapPin,
    Calendar,
    Trophy,
    Music,
    Heart,
    MessageCircle,
    Gamepad,
    Film,
    Cpu,
    Dumbbell,
    Plane,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth, useUpdateProfile } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Avatar from '../components/Avatar.jsx';
import '../styles/OnboardingPage.css';

const steps = [
    {
        id: 1,
        title: 'Welcome to KaruTeens!',
        description: "Let's get you set up in just a few steps.",
        icon: Sparkles,
        color: '#2ed573',
    },
    {
        id: 2,
        title: 'Your Profile',
        description: 'Tell us a bit about yourself.',
        icon: UserCircle,
        color: '#3742fa',
    },
    {
        id: 3,
        title: 'Profile Picture',
        description: 'Add a face to your account.',
        icon: Camera,
        color: '#20bf6b',
    },
    {
        id: 4,
        title: 'Academic Info',
        description: 'Share your school and year of study.',
        icon: Users,
        color: '#ffa502',
    },
    {
        id: 5,
        title: 'Interests',
        description: "What do you like? We'll show you relevant content.",
        icon: Heart,
        color: '#ff4757',
    },
    {
        id: 6,
        title: 'Notifications',
        description: 'Stay updated on what matters to you.',
        icon: Bell,
        color: '#9b59b6',
    },
    {
        id: 7,
        title: 'Customize Your Experience',
        description: 'Make KaruTeens feel like home.',
        icon: Palette,
        color: '#e84393',
    },
];

const interests = [
    { id: 'music', label: 'Music', icon: Music },
    { id: 'sports', label: 'Sports', icon: Trophy },
    { id: 'gaming', label: 'Gaming', icon: Gamepad },
    { id: 'art', label: 'Art', icon: Palette },
    { id: 'movies', label: 'Movies', icon: Film },
    { id: 'tech', label: 'Tech', icon: Cpu },
    { id: 'fitness', label: 'Fitness', icon: Dumbbell },
    { id: 'travel', label: 'Travel', icon: Plane },
];

const OnboardingPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { theme, setTheme } = useTheme();
    const updateProfile = useUpdateProfile();
    const { showToast } = useToast();

    const [currentStep, setCurrentStep] = useState(0);
    const [profileData, setProfileData] = useState({
        full_name: '',
        bio: '',
        school: '',
        year_of_study: 1,
        reg: '',
        age: 18,
        gender: '',
        avatar_url: '',
    });
    const [selectedInterests, setSelectedInterests] = useState([]);
    const [notifications, setNotifications] = useState({
        messages: true,
        likes: true,
        comments: true,
        follows: true,
    });
    const [loading, setLoading] = useState(false);

    const isLastStep = currentStep === steps.length - 1;
    const isFirstStep = currentStep === 0;

    const completeOnboarding = useCallback(async () => {
        setLoading(true);
        try {
            await updateProfile.mutateAsync({
                ...profileData,
                onboarded: true,
                interests: selectedInterests,
                notification_settings: notifications,
            });
            const storedUser = JSON.parse(safeLocalStorage.getItem('user') || '{}');
            storedUser.onboarded = true;
            safeLocalStorage.setItem('user', JSON.stringify(storedUser));
            showToast('Welcome to KaruTeens! 🎉', 'success');
            navigate('/feed', { replace: true });
            window.location.reload();
        } catch (err) {
            console.error('Onboarding failed:', err);
            showToast('Please complete all required fields', 'error');
            setLoading(false);
        }
    }, [profileData, selectedInterests, notifications, updateProfile, showToast, navigate]);

    const handleNext = useCallback(async () => {
        if (isLastStep) {
            await completeOnboarding();
        } else {
            setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
        }
    }, [isLastStep, completeOnboarding]);

    const handleBack = useCallback(() => {
        setCurrentStep((prev) => Math.max(prev - 1, 0));
    }, []);

    const toggleInterest = useCallback((interestId) => {
        setSelectedInterests((prev) =>
            prev.includes(interestId)
                ? prev.filter((id) => id !== interestId)
                : [...prev, interestId],
        );
    }, []);

    const handleNotificationToggle = useCallback((key) => {
        setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
    }, []);

    const handleSkip = async () => {
        try {
            await updateProfile.mutateAsync({ onboarded: true });
            const storedUser = JSON.parse(safeLocalStorage.getItem('user') || '{}');
            storedUser.onboarded = true;
            safeLocalStorage.setItem('user', JSON.stringify(storedUser));
        } catch (err) {
            console.error('Skip onboarding failed:', err);
            return;
        }
        navigate('/feed', { replace: true });
        window.location.reload();
    };

    const renderStep = () => {
        const step = steps[currentStep];

        switch (currentStep) {
            case 0:
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="welcome-content"
                    >
                        <div className="welcome-icon">
                            <Sparkles size={64} color="#2ed573" />
                        </div>
                        <h1 className="welcome-title">{step.title}</h1>
                        <p className="welcome-description">{step.description}</p>
                        <div className="features-preview">
                            <div className="feature-item">
                                <Users size={20} />
                                <span>Connect with classmates</span>
                            </div>
                            <div className="feature-item">
                                <Bell size={20} />
                                <span>Stay updated with notifications</span>
                            </div>
                            <div className="feature-item">
                                <Camera size={20} />
                                <span>Share photos and stories</span>
                            </div>
                            <div className="feature-item">
                                <MessageCircle size={20} />
                                <span>Join conversations</span>
                            </div>
                        </div>
                    </motion.div>
                );

            case 1:
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="profile-form"
                    >
                        <h3>Tell us about yourself</h3>
                        <div className="form-group">
                            <label>Full Name</label>
                            <input
                                type="text"
                                placeholder="Your full name"
                                value={profileData.full_name}
                                onChange={(e) =>
                                    setProfileData({ ...profileData, full_name: e.target.value })
                                }
                            />
                        </div>
                        <div className="form-group">
                            <label>Bio (Optional)</label>
                            <textarea
                                rows="3"
                                placeholder="Tell us about yourself..."
                                value={profileData.bio}
                                onChange={(e) =>
                                    setProfileData({ ...profileData, bio: e.target.value })
                                }
                            />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Age</label>
                                <input
                                    type="number"
                                    value={profileData.age}
                                    onChange={(e) =>
                                        setProfileData({
                                            ...profileData,
                                            age: parseInt(e.target.value),
                                        })
                                    }
                                />
                            </div>
                            <div className="form-group">
                                <label>Gender</label>
                                <select
                                    value={profileData.gender}
                                    onChange={(e) =>
                                        setProfileData({ ...profileData, gender: e.target.value })
                                    }
                                >
                                    <option value="">Select</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                    <option value="prefer_not_to_say">Prefer not to say</option>
                                </select>
                            </div>
                        </div>
                    </motion.div>
                );

            case 2:
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="profile-pic-form"
                    >
                        <h3>Set Your Avatar</h3>
                        <p className="form-desc">
                            Choose a profile picture so others can recognize you.
                        </p>

                        <div className="avatar-upload-container">
                            <div className="avatar-preview-wrapper">
                                <Avatar
                                    src={profileData.avatar_url}
                                    size="2xl"
                                    name={profileData.full_name || user?.username}
                                />
                                <label className="avatar-edit-overlay">
                                    <Camera size={24} />
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden-input"
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                // Normally we'd upload to Cloudinary here
                                                // For now, let's simulate with a temporary preview URL
                                                const previewUrl = URL.createObjectURL(file);
                                                setProfileData({
                                                    ...profileData,
                                                    avatar_url: previewUrl,
                                                });
                                            }
                                        }}
                                    />
                                </label>
                            </div>
                            <p className="avatar-tip">Click the icon to upload</p>
                        </div>
                    </motion.div>
                );

            case 3:
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="academic-form"
                    >
                        <h3>Academic Information</h3>
                        <div className="form-group">
                            <label>School / Faculty</label>
                            <input
                                type="text"
                                placeholder="e.g. Science & Information Technology"
                                value={profileData.school}
                                onChange={(e) =>
                                    setProfileData({ ...profileData, school: e.target.value })
                                }
                            />
                        </div>
                        <div className="form-group">
                            <label>Reg No. (e.g. e101)</label>
                            <input
                                type="text"
                                maxLength={4}
                                placeholder="e.g. e101"
                                value={profileData.reg}
                                onChange={(e) => {
                                    const val = e.target.value.toLowerCase();
                                    if (val.length <= 4) {
                                        setProfileData({ ...profileData, reg: val });
                                    }
                                }}
                            />
                            <small style={{ fontSize: '0.7rem', color: 'rgb(var(--text-muted))' }}>
                                1 letter + 3 digits (e.g., e101)
                            </small>
                        </div>
                        <div className="form-group">
                            <label>Year of Study</label>
                            <div className="year-options">
                                {[1, 2, 3, 4, 5, 6].map((year) => (
                                    <button
                                        key={year}
                                        className={`year-btn ${profileData.year_of_study === year ? 'active' : ''}`}
                                        onClick={() =>
                                            setProfileData({ ...profileData, year_of_study: year })
                                        }
                                    >
                                        Year {year}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                );

            case 4:
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="interests-form"
                    >
                        <h3>What are you interested in?</h3>
                        <p className="form-desc">
                            Select at least 3 interests to personalize your feed.
                        </p>
                        <div className="interests-grid">
                            {interests.map((interest) => {
                                const Icon = interest.icon;
                                const isSelected = selectedInterests.includes(interest.id);
                                return (
                                    <button
                                        key={interest.id}
                                        className={`interest-btn ${isSelected ? 'selected' : ''}`}
                                        onClick={() => toggleInterest(interest.id)}
                                    >
                                        <Icon size={20} />
                                        <span>{interest.label}</span>
                                        {isSelected && <Check size={16} className="check-icon" />}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                );

            case 5:
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="notifications-form"
                    >
                        <h3>Notification Preferences</h3>
                        <p className="form-desc">Choose what you'd like to be notified about.</p>
                        <div className="notifications-list">
                            {[
                                {
                                    key: 'messages',
                                    label: 'Messages',
                                    desc: 'When someone sends you a message',
                                },
                                {
                                    key: 'likes',
                                    label: 'Likes',
                                    desc: 'When someone likes your post',
                                },
                                {
                                    key: 'comments',
                                    label: 'Comments',
                                    desc: 'When someone comments on your post',
                                },
                                {
                                    key: 'follows',
                                    label: 'Follows',
                                    desc: 'When someone follows you',
                                },
                            ].map((item) => (
                                <div key={item.key} className="notification-item">
                                    <div className="notification-info">
                                        <strong>{item.label}</strong>
                                        <p>{item.desc}</p>
                                    </div>
                                    <label className="switch">
                                        <input
                                            type="checkbox"
                                            checked={notifications[item.key]}
                                            onChange={() => handleNotificationToggle(item.key)}
                                        />
                                        <span className="slider"></span>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                );

            case 6:
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="appearance-form"
                    >
                        <h3>Choose Your Theme</h3>
                        <p className="form-desc">Select how KaruTeens looks on your device.</p>
                        <div className="theme-options">
                            <div
                                className={`theme-card ${theme === 'dark' ? 'active' : ''}`}
                                onClick={() => setTheme('dark')}
                            >
                                <div className="theme-preview dark-preview"></div>
                                <h4>Dark Mode</h4>
                                <p>Easy on the eyes</p>
                            </div>
                            <div
                                className={`theme-card ${theme === 'light' ? 'active' : ''}`}
                                onClick={() => setTheme('light')}
                            >
                                <div className="theme-preview light-preview"></div>
                                <h4>Light Mode</h4>
                                <p>Classic appearance</p>
                            </div>
                        </div>
                    </motion.div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="onboarding-page">
            <div className="onboarding-container">
                {/* Progress Bar */}
                <div className="progress-container">
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                        />
                    </div>
                    <div className="progress-dots">
                        {steps.map((step, index) => (
                            <div
                                key={step.id}
                                className={`progress-dot ${index <= currentStep ? 'active' : ''}`}
                            />
                        ))}
                    </div>
                </div>

                {/* Step Content */}
                <div className="step-content">
                    <AnimatePresence mode="wait">{renderStep()}</AnimatePresence>
                </div>

                {/* Navigation */}
                <div className="step-navigation">
                    <div className="navigation-buttons">
                        {!isFirstStep && (
                            <button className="btn btn-outline" onClick={handleBack}>
                                <ArrowLeft size={18} />
                                Back
                            </button>
                        )}

                        {isFirstStep && (
                            <button className="btn btn-outline" onClick={handleSkip}>
                                Skip for now
                            </button>
                        )}

                        <button className="btn btn-primary" onClick={handleNext} disabled={loading}>
                            {isLastStep ? (
                                <>
                                    {loading ? 'Saving...' : 'Get Started'}
                                    <Check size={18} />
                                </>
                            ) : (
                                <>
                                    Continue
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </div>

                    <div className="step-indicator">
                        {currentStep + 1} / {steps.length}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OnboardingPage;
>
    );
};

export default OnboardingPage;
