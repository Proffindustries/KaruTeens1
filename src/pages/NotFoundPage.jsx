import React from 'react';
import { Link } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

const NotFoundPage = () => {
    return (
        <div className="container" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            textAlign: 'center',
            padding: '2rem'
        }}>
            <motion.div
                initial={{ rotate: -10, scale: 0.8 }}
                animate={{ rotate: 10, scale: 1 }}
                transition={{
                    repeat: Infinity,
                    repeatType: "reverse",
                    duration: 2
                }}
            >
                <AlertTriangle size={80} color="#ff6b6b" strokeWidth={1.5} />
            </motion.div>

            <h1 style={{ fontSize: '4rem', margin: '1rem 0 0.5rem', color: 'rgb(var(--text-main))' }}>404</h1>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'rgb(var(--text-main))' }}>Oops! Page Not Found</h2>
            <p style={{ color: 'rgb(var(--text-muted))', maxWidth: '400px', marginBottom: '2rem' }}>
                The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
            </p>

            <Link to="/" className="btn btn-primary btn-lg">
                <Home size={20} /> Back to Home
            </Link>
        </div>
    );
};

export default NotFoundPage;
