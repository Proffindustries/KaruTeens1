import React from 'react';
import { Link } from 'react-router-dom';
import {
    LayoutGrid, BookOpen, Heart, ShoppingBag,
    MessageCircle, Users, Calendar, Video,
    Bot, User, Settings, Info, Bell,
    Shield, DollarSign, Crown, Activity
} from 'lucide-react';
import '../styles/ExplorePage.css';
import Avatar from '../components/Avatar.jsx';
import { useAuth } from '../hooks/useAuth.js';

const ExplorePage = () => {
    const { user, isAuthenticated } = useAuth();
    const categories = [
        {
            title: "Social & Community",
            links: [
                { name: "My Feed", path: "/feed", icon: <LayoutGrid size={24} />, color: "#3742fa", desc: "Your personal timeline" },
                { name: "Messages", path: "/messages", icon: <MessageCircle size={24} />, color: "#2ed573", desc: "Chat with friends" },
                { name: "Communities", path: "/groups", icon: <Users size={24} />, color: "#ffa502", desc: "Join student clubs" },
                { name: "Events", path: "/events", icon: <Calendar size={24} />, color: "#ff4757", desc: "Campus activities" },
                { name: "Stories", path: "/status", icon: <Activity size={24} />, color: "#e056fd", desc: "Student updates" },
            ]
        },
        {
            title: "Academic & Tools",
            links: [
                { name: "Study Rooms", path: "/study-rooms", icon: <Video size={24} />, color: "#5352ed", desc: "Virtual collaboration" },
                { name: "Recall", path: "/recall", icon: <BookOpen size={24} />, color: "#ff6348", desc: "Notes & Question papers" },
                { name: "Revision Materials", path: "/revision-materials", icon: <LayoutGrid size={24} />, color: "#1e90ff", desc: "Curated study resources" },
                { name: "AI Assistant", path: "/ai-assistant", icon: <Bot size={24} />, color: "#2f3542", desc: "Advanced study helper" },
            ]
        },
        {
            title: "Lifestyle & Perks",
            links: [
                { name: "Marketplace", path: "/marketplace", icon: <ShoppingBag size={24} />, color: "#20bf6b", desc: "Student marketplace" },
                { name: "Dating / Match", path: "/date", icon: <Heart size={24} />, color: "#fc5c65", desc: "Meet your campus match" },
                { name: "Premium", path: "/premium", icon: <Crown size={24} />, color: "#ffd32a", desc: "Get exclusive features" },
                { name: "Donate", path: "/donate", icon: <DollarSign size={24} />, color: "#05c46b", desc: "Support the platform" },
            ]
        },
        {
            title: "Account & Settings",
            links: [
                { name: "My Profile", path: "/profile", icon: <User size={24} />, color: "#1e90ff", desc: "Manage your presence" },
                { name: "Settings", path: "/settings", icon: <Settings size={24} />, color: "#747d8c", desc: "App preferences" },
                { name: "Notifications", path: "/notifications", icon: <Bell size={24} />, color: "#fa8231", desc: "Stay updated" },
            ]
        },
        {
            title: "Information & Support",
            links: [
                { name: "About KaruTeens", path: "/about", icon: <Info size={24} />, color: "#4b7bec", desc: "Learn about our mission" },
                { name: "Contact Support", path: "/contact", icon: <MessageCircle size={24} />, color: "#eb3b5a", desc: "Get help from our team" },
                { name: "Legal & Privacy", path: "/legal", icon: <Shield size={24} />, color: "#485460", desc: "Terms and conditions" },
            ]
        }
    ];

    return (
        <div className="container explore-page">
            <div className="explore-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                <div className="explore-title-box">
                    <h1>Explore KaruTeens</h1>
                    <p>All your campus needs in one place. Navigate quickly to any section.</p>
                </div>
                {isAuthenticated && (
                    <Link to={`/profile/${user.username}`}>
                        <Avatar src={user.avatar_url} name={user.username} size="3xl" className="explore-profile-avatar shadow-lg" />
                    </Link>
                )}
            </div>

            <div className="explore-grid">
                {categories.map((cat, idx) => (
                    <div key={idx} className="explore-section">
                        <h2>{cat.title}</h2>
                        <div className="links-grid">
                            {cat.links.map((link, lIdx) => (
                                <Link to={link.path} key={lIdx} className="explore-card">
                                    <div className="explore-icon" style={{ background: `${link.color}15`, color: link.color }}>
                                        {link.icon}
                                    </div>
                                    <div className="explore-info">
                                        <h3>{link.name}</h3>
                                        <p>{link.desc}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}

                {/* Admin Link Separate */}
                <div className="explore-section">
                    <h2>Admin Area</h2>
                    <div className="links-grid">
                        <Link to="/admin" className="explore-card admin-card">
                            <div className="explore-icon">
                                <DollarSign size={24} />
                            </div>
                            <div className="explore-info">
                                <h3>Admin Dashboard</h3>
                                <p>Management & Stats</p>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExplorePage;
