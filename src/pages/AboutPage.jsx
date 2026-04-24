import React from 'react';
import { Users, Target, Shield, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import '../styles/AboutPage.css';
import SEO from '../components/SEO';

const AboutPage = () => {
    return (
        <div className="container about-page">
            <SEO
                title="About Us"
                description="Learn about KaruTeens, our mission to empower university students, and our vision for a better campus digital experience in Kenya."
            />
            <div className="about-hero">
                <h1>About KaruTeens</h1>
                <p>Empowering university students to connect, grow, and thrive.</p>
            </div>

            <div className="about-grid">
                <div className="card about-card">
                    <div className="icon-wrapper">
                        <Target size={32} />
                    </div>
                    <h3>Our Mission</h3>
                    <p>
                        To provide a safe, inclusive, and dynamic digital campus specifically
                        tailored for the needs of university students in Kenya.
                    </p>
                </div>

                <div className="card about-card">
                    <div className="icon-wrapper">
                        <Users size={32} />
                    </div>
                    <h3>Our Community</h3>
                    <p>
                        We are a vibrant community of scholars, innovators, and future leaders.
                        KaruTeens is built by students, for students.
                    </p>
                </div>

                <div className="card about-card">
                    <div className="icon-wrapper">
                        <Shield size={32} />
                    </div>
                    <h3>Safety First</h3>
                    <p>
                        We prioritize user safety and privacy. Our platform mimics real campus
                        interactions with added layers of digital security.
                    </p>
                </div>
            </div>

            <div className="story-section">
                <h2>Our Story & Vision</h2>
                <p>
                    Started as a vision in Karatina University, KaruTeens was born out of the need
                    for a better way for students to find study partners, campus events, and
                    reliable academic resources. We realized that existing social media platforms
                    were too broad, noisy, and often distracting for serious student engagement.
                </p>
                <p>
                    KaruTeens focuses on what matters most to your campus life: collaboration,
                    peer-to-peer support, and safe social interaction. Our goal is to bridge the gap
                    between academic excellence and a vibrant social life, ensuring no student feels
                    isolated in their journey through higher education.
                </p>

                <div className="vision-blocks">
                    <div className="vision-block">
                        <h4>Community Growth</h4>
                        <p>
                            We believe in the power of collective intelligence. By connecting
                            students across departments, we foster a richer learning environment
                            where knowledge flows freely.
                        </p>
                    </div>
                    <div className="vision-block">
                        <h4>Academic Excellence</h4>
                        <p>
                            From curated study playlists to collaborative revision materials, we
                            provide the tools needed to succeed in a demanding university setting.
                            Excellence is our standard.
                        </p>
                    </div>
                </div>

                <div className="values-section">
                    <h2>Our Core Values</h2>
                    <div className="values-grid">
                        <div className="value-item">
                            <strong>Inclusivity</strong>
                            <p>
                                Every student belongs here, regardless of their background or field
                                of study.
                            </p>
                        </div>
                        <div className="value-item">
                            <strong>Integrity</strong>
                            <p>
                                We uphold the highest standards of academic honesty and personal
                                conduct.
                            </p>
                        </div>
                        <div className="value-item">
                            <strong>Innovation</strong>
                            <p>
                                We continuously evolve our platform to meet the changing needs of
                                the modern student.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="guidelines-section">
                    <h2>Community Guidelines</h2>
                    <p>To maintain a high-value environment, we expect all members to:</p>
                    <ul>
                        <li>Respect the opinions and backgrounds of all peers.</li>
                        <li>Provide constructive feedback in study groups.</li>
                        <li>Avoid any form of academic dishonesty or plagiarism.</li>
                        <li>Report any content that violates our safety policies.</li>
                    </ul>
                </div>

                <div className="about-cta">
                    <h3>Have Questions?</h3>
                    <p>We're always here to help you navigate your campus life.</p>
                    <Link to="/contact" className="btn btn-primary">
                        Contact Support
                    </Link>
                </div>

                <div className="team-signature">
                    <Heart size={20} fill="red" color="red" />
                    <span>The KaruTeens Development Team</span>
                </div>
            </div>
        </div>
    );
};

export default AboutPage;
