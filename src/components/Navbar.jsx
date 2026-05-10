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
    Settings as SettingsIcon,
    Sparkles,
    LayoutDashboard,
    ChevronDown,
    ChevronRight,
} from 'lucide-react';
import Logo from './Logo';
import '../styles/Navbar.css';

import { useAuth, useLogout } from '../hooks/useAuth';
import Avatar from './Avatar.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

const NAV_GROUPS = [
    {
        label: 'Social',
        items: [
            { to: '/feed', label: 'Feed' },
            { to: '/explore', label: 'Explore' },
            { to: '/activity', label: 'Activity' },
        ],
    },
    {
        label: 'Learn',
        items: [
            { to: '/study-rooms', label: 'Study Rooms', icon: BookOpen },
            { to: '/study-playlists', label: 'Playlists', icon: BookOpen },
            { to: '/timetable', label: 'Timetable' },
            { to: '/templates', label: 'Templates', icon: LayoutDashboard },
        ],
    },
    {
        label: 'Connect',
        items: [
            { to: '/messages', label: 'Messages', icon: MessageCircle },
            { to: '/live', label: 'Live' },
            { to: '/confessions', label: 'Confessions' },
            { to: '/groups', label: 'Groups', icon: Users },
        ],
    },
    {
        label: 'Discover',
        items: [
            { to: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
            { to: '/leaderboards', label: 'Leaderboards' },
            { to: '/revision-materials', label: 'Revision', icon: BookOpen },
        ],
    },
];

const NavDropdown = ({ label, items }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div
            className="nav-dropdown"
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
        >
            <button className={`nav-dropdown-trigger ${isOpen ? 'active' : ''}`}>
                {label}
                <ChevronDown size={14} className={`chevron ${isOpen ? 'rotate' : ''}`} />
            </button>
            <div className={`nav-dropdown-menu ${isOpen ? 'show' : ''}`}>
                <div className="dropdown-grid">
                    {items.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                isActive ? 'dropdown-link active' : 'dropdown-link'
                            }
                        >
                            <div className="dropdown-link-content">
                                <span className="dropdown-link-label">{item.label}</span>
                            </div>
                        </NavLink>
                    ))}
                </div>
            </div>
        </div>
    );
};

const MobileGroup = ({ group, toggleMenu }) => {
    const [expanded, setExpanded] = useState(true);
    return (
        <div className="mobile-nav-group">
            <button
                className="mobile-nav-group-header"
                onClick={() => setExpanded(!expanded)}
                aria-expanded={expanded}
            >
                <span>{group.label}</span>
                {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {expanded && (
                <div className="mobile-nav-group-items">
                    {group.items.map((item) => (
                        <Link
                            key={item.to}
                            to={item.to}
                            className="mobile-link"
                            onClick={toggleMenu}
                        >
                            {item.label}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};

const Navbar = React.memo(() => {
    const [isOpen, setIsOpen] = useState(false);
    const { isAuthenticated, user } = useAuth();
    const logout = useLogout();
    const { theme, toggleTheme } = useTheme();

    const toggleMenu = () => setIsOpen(!isOpen);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        };
    }, [isOpen]);

    return (
        <>
            <nav className={`navbar ${isOpen ? 'menu-open' : ''}`}>
                <div className="container navbar-content">
                    <Link to="/" className="navbar-logo" state={{ explicitHome: true }}>
                        <Logo width="120px" height="40px" />
                    </Link>

                    <div className="nav-links desktop-only">
                        {NAV_GROUPS.map((group) => (
                            <NavDropdown
                                key={group.label}
                                label={group.label}
                                items={group.items}
                            />
                        ))}
                    </div>

                    <div className="nav-actions desktop-only">
                        <NavLink
                            to="/notifications"
                            className="notification-btn"
                            title="Notifications"
                            aria-label="Notifications"
                        >
                            <Bell size={20} />
                        </NavLink>
                        <button
                            onClick={toggleTheme}
                            className="theme-toggle-btn"
                            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                        >
                            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                        </button>

                        {!isAuthenticated ? (
                            <div className="auth-btns">
                                <Link to="/login" className="btn btn-outline btn-sm">
                                    Login
                                </Link>
                                <Link to="/register" className="btn btn-primary btn-sm">
                                    Join Now
                                </Link>
                            </div>
                        ) : (
                            <div className="user-nav-actions">
                                <Link
                                    to="/settings"
                                    className="settings-btn"
                                    title="Settings"
                                    aria-label="Settings"
                                >
                                    <SettingsIcon size={20} />
                                </Link>
                                <Link to={`/profile/${user?.username}`} className="profile-link">
                                    <Avatar
                                        src={user?.avatar_url}
                                        name={user?.username}
                                        size="sm"
                                    />
                                </Link>
                                <button
                                    onClick={logout}
                                    className="logout-btn-nav"
                                    aria-label="Logout"
                                >
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        className="mobile-toggle"
                        onClick={toggleMenu}
                        aria-label={isOpen ? 'Close Menu' : 'Open Menu'}
                        aria-expanded={isOpen}
                    >
                        {isOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </nav>

            {isOpen && (
                <div className="mobile-menu">
                    {NAV_GROUPS.map((group) => (
                        <MobileGroup key={group.label} group={group} toggleMenu={toggleMenu} />
                    ))}
                    <hr className="mobile-menu-divider" />
                    <button
                        className="mobile-link theme-toggle-mobile"
                        onClick={() => {
                            toggleTheme();
                            toggleMenu();
                        }}
                    >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                        </span>
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
                            <div className="mobile-user-info">
                                <Avatar src={user?.avatar_url} name={user?.username} size="md" />
                                <span className="mobile-username">{user?.username}</span>
                            </div>
                            <button
                                onClick={() => {
                                    logout();
                                    setIsOpen(false);
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
        </>
    );
});

export default Navbar;
