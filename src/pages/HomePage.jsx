import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Book, Users, Shield, ArrowRight, Instagram, Twitter, Mail } from 'lucide-react';
import '../styles/HomePage.css';
import { useAuth } from '../hooks/useAuth';
import SEO from '../components/SEO';

const HomePage = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // If logged in and NOT explicitly asking for Home, redirect to Feed
        if (isAuthenticated && !location.state?.explicitHome) {
            navigate('/feed', { replace: true });
        }
    }, [isAuthenticated, location, navigate]);

    return (
        <div className="homepage">
            <SEO 
                title="Home" 
                description="KaruTeens is the number one campus social hub for university students. Join study groups, access revision materials, and connect with peers safely."
                keywords="university social network, campus life, student resources, Karatina University, Kenya students"
            />
            {/* Hero Section */}
            <section className="hero-section">
                <div className="container hero-content">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="hero-text"
                    >
                        <span className="hero-badge">🎓 For University Students</span>
                        <h1>
                            Elevate Your <span className="highlight-text">Campus Life</span>
                        </h1>
                        <p className="hero-subtitle">
                            Connect, share, and grow with KaruTeens. The ultimate platform for
                            university students to engage, learn, and have fun safely.
                        </p>
                        <div className="hero-cta">
                            <Link to="/register" className="btn btn-primary btn-lg">
                                Join the Community <ArrowRight size={20} />
                            </Link>
                            <Link to="/explore" className="btn btn-outline btn-lg">
                                Explore Features
                            </Link>
                        </div>
                        <div className="hero-stats">
                            <div className="stat-item">
                                <strong>Active</strong> <span>Community</span>
                            </div>
                            <div className="separator"></div>
                            <div className="stat-item">
                                <strong>Verified</strong> <span>Students</span>
                            </div>
                            <div className="separator"></div>
                            <div className="stat-item">
                                <strong>24/7</strong> <span>Support</span>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="hero-image"
                    >
                        {/* Visual Placeholder for "Happy Students" */}
                        <div className="mock-image-container">
                            <div className="blob blob-1"></div>
                            <div className="blob blob-2"></div>
                            <img
                                src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=800"
                                alt="Happy University Students"
                                className="main-img"
                            />
                            <div className="floating-card card-1">
                                <div className="icon-box">💬</div>
                                <div className="text-box">
                                    <strong>Study Group</strong>
                                    <span>active now</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Features Section */}
            <section className="features-section">
                <div className="container">
                    <div className="section-header">
                        <h2>Why Students Love KaruTeens</h2>
                        <p>Everything you need to thrive in university, all in one place.</p>
                    </div>

                    <div className="features-grid">
                        <motion.div whileHover={{ y: -5 }} className="feature-card card">
                            <div className="feature-icon icon-users">
                                <Users size={32} />
                            </div>
                            <h3>Community First</h3>
                            <p>
                                Join groups, attend events, and meet like-minded students from your
                                school and beyond.
                            </p>
                        </motion.div>

                        <motion.div whileHover={{ y: -5 }} className="feature-card card">
                            <div className="feature-icon icon-book">
                                <Book size={32} />
                            </div>
                            <h3>Academic Growth</h3>
                            <p>
                                Access revision materials, find study buddies, and use our AI helper
                                to ace your exams.
                            </p>
                        </motion.div>

                        <motion.div whileHover={{ y: -5 }} className="feature-card card">
                            <div className="feature-icon icon-shield">
                                <Shield size={32} />
                            </div>
                            <h3>Safe & Secure</h3>
                            <p>
                                A verified platform ensuring a safe environment for everyone. Real
                                people, real connections.
                            </p>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="faq-section">
                <div className="container">
                    <div className="section-header">
                        <h2>Frequently Asked Questions</h2>
                        <p>Got questions? We've got answers to help you get started.</p>
                    </div>
                    <div className="faq-grid">
                        <div className="faq-item card">
                            <h3>Is KaruTeens free to use?</h3>
                            <p>Yes! KaruTeens is free for all university students. We offer premium features for advanced study tools, but the core community features will always be free.</p>
                        </div>
                        <div className="faq-item card">
                            <h3>How do I verify my account?</h3>
                            <p>Once you register with your student email, you'll receive a verification link. Verified students get a badge and access to official school groups.</p>
                        </div>
                        <div className="faq-item card">
                            <h3>Is my data safe?</h3>
                            <p>Absolutely. We use industry-standard encryption and never sell your personal data. Our platform is built with student privacy as a top priority.</p>
                        </div>
                        <div className="faq-item card">
                            <h3>Can I sell items on the marketplace?</h3>
                            <p>Yes! Any verified student can list items or services on the marketplace. It's a great way to handle campus side-hustles securely.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta-section">
                <div className="container">
                    <div className="cta-box">
                        <h2>Ready to get started?</h2>
                        <p>
                            Join thousands of students making the most of their university journey
                            today.
                        </p>
                        {!isAuthenticated && (
                            <Link to="/register" className="btn btn-white btn-lg">
                                Create Your Account
                            </Link>
                        )}
                    </div>
                </div>
            </section>

            {/* Footer Section */}
            <footer className="homepage-footer">
                <div className="container footer-content">
                    <div className="footer-links">
                        <Link to="/about">About Us</Link>
                        <Link to="/blog">Campus Hub</Link>
                        <Link to="/contact">Contact</Link>
                        <Link to="/legal">Privacy & Terms</Link>
                        <Link to="/help">Help Center</Link>
                    </div>
                    <div className="footer-social">
                        <a href="#" className="social-icon">
                            <Twitter size={20} />
                        </a>
                        <a href="#" className="social-icon">
                            <Instagram size={20} />
                        </a>
                        <a href="mailto:support@karuteens.com" className="social-icon">
                            <Mail size={20} />
                        </a>
                    </div>
                    <p className="copyright">© 2026 KaruTeens. Built for Students.</p>
                </div>
            </footer>
        </div>
    );
};

export default HomePage;
