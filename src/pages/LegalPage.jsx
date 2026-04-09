import React, { useState } from 'react';
import '../styles/LegalPage.css'; // Creating next

const LegalPage = () => {
    const [activeTab, setActiveTab] = useState('terms');

    return (
        <div className="container legal-page">
            <div className="legal-tabs">
                <button
                    className={`legal-tab ${activeTab === 'terms' ? 'active' : ''}`}
                    onClick={() => setActiveTab('terms')}
                >
                    Terms of Service
                </button>
                <button
                    className={`legal-tab ${activeTab === 'privacy' ? 'active' : ''}`}
                    onClick={() => setActiveTab('privacy')}
                >
                    Privacy Policy
                </button>
            </div>

            <div className="card legal-content">
                {activeTab === 'terms' && (
                    <div className="legal-text">
                        <h1>Terms of Service</h1>
                        <p className="last-updated">Last Updated: April 2026</p>

                        <section>
                            <h3>1. Acceptance of Terms</h3>
                            <p>
                                By accessing and using KaruTeens ("the Platform"), you accept and agree to be bound
                                by these Terms of Service. If you do not agree to these terms, please do not use our services.
                            </p>
                        </section>

                        <section>
                            <h3>2. User Eligibility</h3>
                            <p>
                                Use of the Platform is intended for university students and faculty. By registering,
                                you represent that you are at least 18 years of age or have legal parental/guardian consent.
                            </p>
                        </section>

                        <section>
                            <h3>3. User Conduct & Responsibilities</h3>
                            <p>
                                You agree to use the Platform only for lawful purposes. Prohibited activities include:
                                <ul>
                                    <li>Harassment, bullying, or hate speech.</li>
                                    <li>Posting sexually explicit or violent content.</li>
                                    <li>Engaging in academic dishonesty or fraudulent schemes.</li>
                                    <li>Attempting to gain unauthorized access to our systems.</li>
                                </ul>
                            </p>
                        </section>

                        <section>
                            <h3>4. Intellectual Property</h3>
                            <p>
                                You retain ownership of content you post. However, by posting content, you grant KaruTeens
                                a non-exclusive, royalty-free license to host, display, and distribute said content.
                            </p>
                        </section>

                        <section>
                            <h3>5. Limitation of Liability</h3>
                            <p>
                                KaruTeens is provided "as is". We are not responsible for user-generated content or
                                any damages resulting from the use of our services.
                            </p>
                        </section>
                    </div>
                )}

                {activeTab === 'privacy' && (
                    <div className="legal-text">
                        <h1>Privacy Policy</h1>
                        <p className="last-updated">Last Updated: April 2026</p>

                        <section>
                            <h3>1. Information Collection</h3>
                            <p>
                                We collect information you provide directly (Name, Student ID, Email) 
                                and usage data collected automatically via log files and cookies.
                            </p>
                        </section>

                        <section>
                            <h3>2. Use of Information</h3>
                            <p>
                                We use your data to provide, maintain, and improve our services, 
                                process transactions, and communicate with you about updates or security.
                            </p>
                        </section>

                        <section>
                            <h3>3. Cookies and Tracking Technologies</h3>
                            <p>
                                We use cookies and similar tracking technologies to track activity on our service.
                                <strong> Important for AdSense:</strong> Third-party vendors, including Google, 
                                use cookies to serve ads based on a user's prior visits to your website or other websites.
                            </p>
                            <p>
                                Google's use of advertising cookies enables it and its partners to serve ads to 
                                our users based on their visit to our site and/or other sites on the Internet.
                                Users may opt out of personalized advertising by visiting 
                                <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer"> Ads Settings</a>.
                            </p>
                        </section>

                        <section>
                            <h3>4. Data Sharing</h3>
                            <p>
                                We do not sell your personal data. We may share data with university administration 
                                only in cases of severe safety threats or legal requirements.
                            </p>
                        </section>

                        <section>
                            <h3>5. Your Data Rights</h3>
                            <p>
                                You have the right to access, update, or delete your personal information 
                                at any time through your account settings.
                            </p>
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LegalPage;
