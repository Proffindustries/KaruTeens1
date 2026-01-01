import React from 'react';
import { User, Lock, Bell, Moon, LogOut, ChevronRight } from 'lucide-react';
import '../styles/SettingsPage.css'; // Creating next

const SettingsPage = () => {
    const sections = [
        { icon: <User size={20} />, label: "Account Information", desc: "Change email, username, phone" },
        { icon: <Lock size={20} />, label: "Privacy & Security", desc: "Password, blocked users, visibility" },
        { icon: <Bell size={20} />, label: "Notifications", desc: "Push, email, sms preferences" },
        { icon: <Moon size={20} />, label: "Appearance", desc: "Dark mode, theme colors" },
    ];

    return (
        <div className="container settings-page">
            <div className="settings-header">
                <h1>Settings</h1>
            </div>

            <div className="settings-list card">
                {sections.map((section, idx) => (
                    <div key={idx} className="settings-item">
                        <div className="settings-icon">
                            {section.icon}
                        </div>
                        <div className="settings-info">
                            <h3>{section.label}</h3>
                            <p>{section.desc}</p>
                        </div>
                        <ChevronRight size={20} className="settings-arrow" />
                    </div>
                ))}

                <div className="settings-item logout">
                    <div className="settings-icon danger">
                        <LogOut size={20} />
                    </div>
                    <div className="settings-info">
                        <h3 className="danger-text">Log Out</h3>
                    </div>
                </div>
            </div>

            <div className="settings-footer">
                <p>KaruTeens v1.0.0</p>
                <div className="legal-links">
                    <a href="#">Privacy Policy</a> • <a href="#">Terms of Service</a>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
