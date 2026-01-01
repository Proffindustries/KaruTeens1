import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import '../styles/ContactPage.css'; // Creating next

const ContactPage = () => {
    const [status, setStatus] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setStatus('sent');
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
                            <strong>Email</strong>
                            <p>support@karuteens.com</p>
                        </div>
                    </div>
                    <div className="contact-item">
                        <Phone size={20} className="contact-icon" />
                        <div>
                            <strong>Phone / WhatsApp</strong>
                            <p>+254 700 123 456</p>
                        </div>
                    </div>
                    <div className="contact-item">
                        <MapPin size={20} className="contact-icon" />
                        <div>
                            <strong>Office</strong>
                            <p>Student Center, 2nd Floor, Room 204</p>
                        </div>
                    </div>

                    <div className="admin-contacts">
                        <h4>Admin Contacts (Emergency)</h4>
                        <ul>
                            <li>Admin Mark: 0711 000 000</li>
                            <li>Admin Sarah: 0722 000 000</li>
                        </ul>
                    </div>
                </div>

                {/* Contact Form */}
                <div className="contact-form-container card">
                    {status === 'sent' ? (
                        <div className="success-message">
                            <div className="check-circle"><Send size={24} /></div>
                            <h3>Message Sent!</h3>
                            <p>We'll get back to you shortly.</p>
                            <button className="btn btn-outline" onClick={() => setStatus('')}>Send Another</button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Name</label>
                                <input type="text" className="form-input" required placeholder="Your Name" />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input type="email" className="form-input" required placeholder="your.email@student.karu.ac.ke" />
                            </div>
                            <div className="form-group">
                                <label>Subject</label>
                                <select className="form-input">
                                    <option>General Inquiry</option>
                                    <option>Technical Support</option>
                                    <option>Report Content/User</option>
                                    <option>Feedback</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Message</label>
                                <textarea className="form-input" rows="5" required placeholder="How can we help?"></textarea>
                            </div>
                            <button type="submit" className="btn btn-primary btn-full">Send Message</button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ContactPage;
