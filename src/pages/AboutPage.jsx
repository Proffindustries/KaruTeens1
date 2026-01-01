import React from 'react';
import { Users, Target, Shield, Heart } from 'lucide-react';
import '../styles/AboutPage.css'; // Creating next

const AboutPage = () => {
    return (
        <div className="container about-page">
            <div className="about-hero">
                <h1>About KaruTeens</h1>
                <p>Empowering university students to connect, grow, and thrive.</p>
            </div>

            <div className="about-grid">
                <div className="card about-card">
                    <div className="icon-wrapper"><Target size={32} /></div>
                    <h3>Our Mission</h3>
                    <p>To provide a safe, inclusive, and dynamic digital campus specifically tailored for the needs of university students in Kenya.</p>
                </div>

                <div className="card about-card">
                    <div className="icon-wrapper"><Users size={32} /></div>
                    <h3>Our Community</h3>
                    <p>We are a vibrant community of scholars, innovators, and future leaders. KaruTeens is built by students, for students.</p>
                </div>

                <div className="card about-card">
                    <div className="icon-wrapper"><Shield size={32} /></div>
                    <h3>Safety First</h3>
                    <p>We prioritize user safety and privacy. Our platform mimics real campus interactions with added layers of digital security.</p>
                </div>
            </div>

            <div className="story-section">
                <h2>Our Story</h2>
                <p>
                    Started as a small project in a dorm room, KaruTeens was born out of the need for a better way to find study partners,
                    campust events, and reliable marketplaces. We realized that existing social media platforms were too broad and often distracting.
                    KaruTeens focuses on what matters most to your campus life.
                </p>
                <div className="team-signature">
                    <Heart size={20} fill="red" color="red" />
                    <span>The KaruTeens Team</span>
                </div>
            </div>
        </div>
    );
};

export default AboutPage;
