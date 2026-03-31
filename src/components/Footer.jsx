import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Mail } from 'lucide-react';
import Logo from './Logo';
import '../styles/Footer.css';

const Footer = React.memo(() => {
    return (
        <footer className="footer-compact">
            <div className="container footer-compact-content">
                <div className="footer-brand">
                    <Logo width="80px" height="28px" />
                    <span>&copy; {new Date().getFullYear()} KaruTeens</span>
                </div>
                
                <nav className="footer-nav">
                    <Link to="/about">About</Link>
                    <Link to="/contact">Contact</Link>
                    <Link to="/legal">Legal</Link>
                    <Link to="/privacy">Privacy</Link>
                    <Link to="/terms">Terms</Link>
                </nav>

                <div className="footer-social-lite">
                    <a href="#"><Facebook size={16} /></a>
                    <a href="#"><Twitter size={16} /></a>
                    <a href="#"><Instagram size={16} /></a>
                    <a href="mailto:support@karuteens.com"><Mail size={16} /></a>
                </div>
            </div>
        </footer>
    );
});

export default Footer;
