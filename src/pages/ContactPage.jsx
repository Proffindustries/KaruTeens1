import React, { useState } from 'react';
import { Mail, Phone, Send } from 'lucide-react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import '../styles/ContactPage.css';

const ContactPage = () => {
    const [status, setStatus] = useState('');
    const [sending, setSending] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [subject, setSubject] = useState('General Inquiry');
    const [message, setMessage] = useState('');
    const { showToast } = useToast();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSending(true);
        try {
            await api.post('/contact', { name, email, subject, message });
            setStatus('sent');
            showToast('Message sent successfully!', 'success');
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to send message', 'error');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="container contact-page">
            <div className="contact-header">
                <h1>Contact Us</h1>
                <p>Have questions, suggestions, or need support? Reach out to us.</p>
            </div>
            <div className="contact-layout">
                {/* Contact Info */}
                <div className="contact-info card">
                    <h3>Get in Touch</h3>
                    <div className="contact-item">
                        <Mail size={20} className="contact-icon" />
                        <div>
                            <strong>Global Support</strong>
                            <p>
                                <a href="mailto:support@karuteens.site">support@karuteens.site</a>
                            </p>
                        </div>
                    </div>
                    <div className="contact-item">
                        <Mail size={20} className="contact-icon" />
                        <div>
                            <strong>Admin / Business</strong>
                            <p>
                                <a href="mailto:admin@karuteens.site">admin@karuteens.site</a>
                            </p>
                        </div>
                    </div>
                    <div className="contact-item">
                        <Phone size={20} className="contact-icon" />
                        <div>
                            <strong>WhatsApp / Call</strong>
                            <p>
                                <a href="tel:+254113729279">+254 113729279</a>
                            </p>
                        </div>
                    </div>

                    <div className="admin-contacts">
                        <h4>Lead Developer</h4>
                        <ul>
                            <li>
                                Harrison: <a href="tel:0113729279">0113 729 279</a>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Contact Form */}
                <div className="contact-form-container card">
                    {status === 'sent' ? (
                        <div className="success-message">
                            <div className="check-circle">
                                <Send size={24} />
                            </div>
                            <h3>Message Sent!</h3>
                            <p>We'll get back to you shortly.</p>
                            <button
                                className="btn btn-outline"
                                onClick={() => {
                                    setStatus('');
                                    setName('');
                                    setEmail('');
                                    setSubject('General Inquiry');
                                    setMessage('');
                                }}
                            >
                                Send Another
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    required
                                    placeholder="Your Name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    disabled={sending}
                                />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    className="form-input"
                                    required
                                    placeholder="your.email@student.karu.ac.ke"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={sending}
                                />
                            </div>
                            <div className="form-group">
                                <label>Subject</label>
                                <select
                                    className="form-input"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    disabled={sending}
                                >
                                    <option>General Inquiry</option>
                                    <option>Technical Support</option>
                                    <option>Report Content/User</option>
                                    <option>Feedback</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Message</label>
                                <textarea
                                    className="form-input"
                                    rows="5"
                                    required
                                    placeholder="How can we help?"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    disabled={sending}
                                ></textarea>
                            </div>
                            <button
                                type="submit"
                                className="btn btn-primary btn-full"
                                disabled={sending}
                            >
                                {sending ? 'Sending...' : 'Send Message'}
                            </button>
                        </form>
                    )}
                </div>
            </div>

            {/* FAQ Section */}
            <div className="faq-section card shadow-sm" style={{ marginTop: '3rem' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    Frequently Asked Questions
                </h2>
                <div
                    className="faq-grid"
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                        gap: '2rem',
                    }}
                >
                    <div className="faq-item">
                        <h4 style={{ color: 'rgb(var(--primary))', marginBottom: '0.5rem' }}>
                            How do I verify my account?
                        </h4>
                        <p style={{ fontSize: '0.9rem', color: 'rgb(var(--text-muted))' }}>
                            Visit the Verification page under your profile settings. You'll need to
                            upload a photo of your student ID for our moderators to review.
                        </p>
                    </div>
                    <div className="faq-item">
                        <h4 style={{ color: 'rgb(var(--primary))', marginBottom: '0.5rem' }}>
                            Is KaruTeens free to use?
                        </h4>
                        <p style={{ fontSize: '0.9rem', color: 'rgb(var(--text-muted))' }}>
                            Yes! The core features of KaruTeens are free for all university
                            students. We offer a Premium plan for those who want extra features like
                            profile badges and advanced AI assistance.
                        </p>
                    </div>
                    <div className="faq-item">
                        <h4 style={{ color: 'rgb(var(--primary))', marginBottom: '0.5rem' }}>
                            How can I report inappropriate content?
                        </h4>
                        <p style={{ fontSize: '0.9rem', color: 'rgb(var(--text-muted))' }}>
                            Click on the three dots icon on any post or profile and select "Report".
                            Our moderation team reviews all reports within 24 hours.
                        </p>
                    </div>
                    <div className="faq-item">
                        <h4 style={{ color: 'rgb(var(--primary))', marginBottom: '0.5rem' }}>
                            Can I sell items on the marketplace?
                        </h4>
                        <p style={{ fontSize: '0.9rem', color: 'rgb(var(--text-muted))' }}>
                            Absolutely! Any verified student can list items for sale. Ensure your
                            listings follow our community guidelines for student-to-student trade.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContactPage;
