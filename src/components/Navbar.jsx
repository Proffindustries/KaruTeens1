import React, { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
    Menu,
    X,
    BookOpen,
    ShoppingBag,
    Users,
    MessageCircle,
    Moon,
    Sun,
    Bell,
    Activity,
    Settings as SettingsIcon,
} from 'lucide-react';
import Logo from './Logo';
import '../styles/Navbar.css';

import { useAuth, useLogout } from '../hooks/useAuth';
import Avatar from './Avatar.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

const Navbar = React.memo(() => {
    const [isOpen, setIsOpen] = useState(false);
    const { isAuthenticated, user } = useAuth();
    const logout = useLogout();
    const { theme, toggleTheme } = useTheme();

    const toggleMenu = () => setIsOpen(!isOpen);

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isOpen]);

    return (
        <nav className="navbar">
            <div className="container navbar-content">
                <Link to="/" className="navbar-logo" state={{ explicitHome: true }}>
                    <Logo width="140px" height="46px" />
                </Link>

                {/* Desktop Nav */}
                <div className="nav-links desktop-only">
                    <NavLink
                        to="/feed"
                        className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                    >
                        Feed
                    </NavLink>
                    <NavLink
                        to="/explore"
                        className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                    >
                        Explore
                    </NavLink>
                    <NavLink
                        to="/activity"
                        className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                    >
                        Activity
                    </NavLink>
                    <NavLink
                        to="/marketplace"
                        className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                    >
                        Market
                    </NavLink>
                    <NavLink
                        to="/study-rooms"
                        className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                    >
                        Study
                    </NavLink>
                    <NavLink
                        to="/study-playlists"
                        className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                    >
                        Playlists
                    </NavLink>
                    <NavLink
                        to="/live"
                        className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                    >
                        Live
                    </NavLink>
                    <NavLink
                        to="/templates"
                        className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                    >
                        Templates
                    </NavLink>
                    <NavLink
                        to="/leaderboards"
                        className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                    >
                        🏆
                    </NavLink>
                    <NavLink
                        to="/timetable"
                        className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                    >
                        📅
                    </NavLink>
                    <NavLink
                        to="/confessions"
                        className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                    >
                        🔮
                    </NavLink>
                </div>

                <div className="nav-actions desktop-only">
                    <NavLink to="/notifications" className="notification-btn" title="Notifications">
                        <Bell size={20} />
                    </NavLink>
                    <button
                        onClick={toggleTheme}
                        className="theme-toggle btn btn-outline btn-sm"
                        style={{ border: 'none', padding: '0.5rem' }}
                        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                    >
                        {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                    </button>
                    {!isAuthenticated ? (
                        <>
                            <Link to="/login" className="btn btn-outline btn-sm">
                                Login
                            </Link>
                            <Link to="/register" className="btn btn-primary btn-sm">
                                Join Now
                            </Link>
                        </>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Link to="/settings" className="settings-btn" title="Settings">
                                <SettingsIcon size={20} />
                            </Link>
                            <Link to={`/profile/${user.username}`}>
                                <Avatar src={user.avatar_url} name={user.username} size="sm" />
                            </Link>
                            <button
                                onClick={logout}
                                className="btn btn-outline btn-sm"
                                style={{ border: 'none', padding: '0 10px' }}
                            >
                                Logout
                            </button>
                        </div>
                    )}
                </div>

                {/* Mobile Toggle */}
                <button 
                    className="mobile-toggle" 
                    onClick={toggleMenu}
                    aria-label={isOpen ? "Close Menu" : "Open Menu"}
                    aria-expanded={isOpen}
                >
                    {isOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="mobile-menu">
                    <Link to="/feed" className="mobile-link" onClick={toggleMenu}>
                        Feed
                    </Link>
                    <Link to="/explore" className="mobile-link" onClick={toggleMenu}>
                        Explore
                    </Link>
                    <Link to="/marketplace" className="mobile-link" onClick={toggleMenu}>
                        Marketplace
                    </Link>
                    <Link to="/study-rooms" className="mobile-link" onClick={toggleMenu}>
                        Study Rooms
                    </Link>
                    <Link to="/study-playlists" className="mobile-link" onClick={toggleMenu}>
                        Study Playlists
                    </Link>
                    <Link to="/live" className="mobile-link" onClick={toggleMenu}>
                        Live Streams
                    </Link>
                    <Link to="/templates" className="mobile-link" onClick={toggleMenu}>
                        Templates
                    </Link>
                    <Link to="/timetable" className="mobile-link" onClick={toggleMenu}>
                        📅 Timetable
                    </Link>
                    <Link to="/confessions" className="mobile-link" onClick={toggleMenu}>
                        🔮 Confessions
                    </Link>
                    <Link to="/leaderboards" className="mobile-link" onClick={toggleMenu}>
                        🏆 Leaderboards
                    </Link>
                    <button
                        className="mobile-link theme-toggle-mobile"
                        onClick={() => {
                            toggleTheme();
                            toggleMenu();
                        }}
                        style={{
                            textAlign: 'left',
                            width: '100%',
                            border: 'none',
                            background: 'none',
                            cursor: 'pointer',
                        }}
                    >
                        {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
                    </button>
                    {!isAuthenticated ? (
                        <div className="mobile-actions">
                            <Link to="/login" className="btn btn-outline" onClick={toggleMenu}>
                                Login
                            </Link>
                            <Link to="/register" className="btn btn-primary" onClick={toggleMenu}>
                                Sign Up
                            </Link>
                        </div>
                    ) : (
                        <div className="mobile-actions">
                            <div
                                className="mobile-user-info"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    marginBottom: '1rem',
                                    padding: '0 1rem',
                                }}
                            >
                                <Avatar src={user.avatar_url} name={user.username} size="md" />
                                <span style={{ fontWeight: '600', color: 'rgb(var(--text-main))' }}>
                                    {user.username}
                                </span>
                            </div>
                            <button
                                onClick={() => {
                                    logout();
                                    toggleMenu();
                                }}
                                className="btn btn-outline"
                                style={{ width: '100%' }}
                            >
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            )}
        </nav>
    );
});

export default Navbar;
