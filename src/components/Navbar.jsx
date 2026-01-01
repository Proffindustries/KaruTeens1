import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X, BookOpen, ShoppingBag, Users, MessageCircle } from 'lucide-react';
import Logo from './Logo';
import '../styles/Navbar.css';

import { useAuth, useLogout } from '../hooks/useAuth';
import Avatar from './Avatar.jsx';

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { isAuthenticated, user } = useAuth();
    const logout = useLogout();

    const toggleMenu = () => setIsOpen(!isOpen);

    return (
        <nav className="navbar">
            <div className="container navbar-content">
                <Link to="/" className="navbar-logo" state={{ explicitHome: true }}>
                    <Logo width="140px" height="46px" />
                </Link>

                {/* Desktop Nav */}
                <div className="nav-links desktop-only">
                    <NavLink to="/" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} state={{ explicitHome: true }}>Home</NavLink>
                    <NavLink to="/feed" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Feed</NavLink>
                    <NavLink to="/explore" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Explore</NavLink>
                    <NavLink to="/marketplace" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Market</NavLink>
                    <NavLink to="/study-rooms" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Study</NavLink>
                </div>

                <div className="nav-actions desktop-only">
                    {!isAuthenticated ? (
                        <>
                            <Link to="/login" className="btn btn-outline btn-sm">Login</Link>
                            <Link to="/register" className="btn btn-primary btn-sm">Join Now</Link>
                        </>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Link to={`/profile/${user.username}`}>
                                <Avatar src={user.avatar_url} name={user.username} size="sm" />
                            </Link>
                            <button onClick={logout} className="btn btn-outline btn-sm" style={{ border: 'none', padding: '0 10px' }}>Logout</button>
                        </div>
                    )}
                </div>

                {/* Mobile Toggle */}
                <button className="mobile-toggle" onClick={toggleMenu}>
                    {isOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="mobile-menu">
                    <Link to="/" className="mobile-link" onClick={toggleMenu} state={{ explicitHome: true }}>Home</Link>
                    <Link to="/feed" className="mobile-link" onClick={toggleMenu}>Feed</Link>
                    <Link to="/explore" className="mobile-link" onClick={toggleMenu}>Explore</Link>
                    <Link to="/marketplace" className="mobile-link" onClick={toggleMenu}>Marketplace</Link>
                    <Link to="/study-rooms" className="mobile-link" onClick={toggleMenu}>Study Rooms</Link>
                    {!isAuthenticated ? (
                        <div className="mobile-actions">
                            <Link to="/login" className="btn btn-outline" onClick={toggleMenu}>Login</Link>
                            <Link to="/register" className="btn btn-primary" onClick={toggleMenu}>Sign Up</Link>
                        </div>
                    ) : (
                        <div className="mobile-actions">
                            <div className="mobile-user-info" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', padding: '0 1rem' }}>
                                <Avatar src={user.avatar_url} name={user.username} size="md" />
                                <span style={{ fontWeight: '600', color: 'rgb(var(--text-main))' }}>{user.username}</span>
                            </div>
                            <button onClick={() => { logout(); toggleMenu(); }} className="btn btn-outline" style={{ width: '100%' }}>Logout</button>
                        </div>
                    )}
                </div>
            )}
        </nav>
    );
};

export default Navbar;
