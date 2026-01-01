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
                        <p className="last-updated">Last Updated: October 2023</p>

                        <section>
                            <h3>1. Acceptance of Terms</h3>
                            <p>By accessing and using KaruTeens, you accept and agree to be bound by the terms and provision of this agreement.</p>
                        </section>

                        <section>
                            <h3>2. User Conduct</h3>
                            <p>You agree to use the platform only for lawful purposes. Harassment, hate speech, and fraudulent activities (including academic dishonesty) are strictly prohibited.</p>
                        </section>

                        <section>
                            <h3>3. Account Security</h3>
                            <p>You are responsible for maintaining the confidentiality of your login credentials. Notify us immediately of any unauthorized use.</p>
                        </section>

                        <section>
                            <h3>4. Content</h3>
                            <p>You retain ownership of content you post, but grant KaruTeens a license to display and distribute it on the platform.</p>
                        </section>
                    </div>
                )}

                {activeTab === 'privacy' && (
                    <div className="legal-text">
                        <h1>Privacy Policy</h1>
                        <p className="last-updated">Last Updated: October 2023</p>

                        <section>
                            <h3>1. Information We Collect</h3>
                            <p>We collect information you provide directly (Name, Student ID, Email) and usage data (Log files, Device info).</p>
                        </section>

                        <section>
                            <h3>2. How We Use Information</h3>
                            <p>To provide, maintain, and improve our services, including matching you with relevant study groups and events.</p>
                        </section>

                        <section>
                            <h3>3. Data Sharing</h3>
                            <p>We do not sell your personal data. We may share data with university administration only in cases of severe safety threats or legal requirements.</p>
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LegalPage;
