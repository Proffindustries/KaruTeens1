import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import '../styles/GlobalBackButton.css';

const GlobalBackButton = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // specific paths where we might not want a back button (e.g., initial landing if no history, but usually simple back is fine)
    // If we are on login/register/landing, maybe we don't need it?
    // User said "all the pages".
    // But going back from Login might act weird if it's the start.
    // Let's just put it everywhere except possibly root if we want? 
    // Actually, on root '/', back might leave the app or do nothing.
    if (location.pathname === '/' || location.pathname === '/messages') return null;

    return (
        <button className="global-back-btn" onClick={() => navigate(-1)} aria-label="Go Back">
            <ArrowLeft size={24} />
        </button>
    );
};

export default GlobalBackButton;
