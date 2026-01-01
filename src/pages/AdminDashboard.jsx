import React from 'react';
import { Users, FileText, DollarSign, Activity, Settings, LogOut, TrendingUp } from 'lucide-react';
import '../styles/AdminDashboard.css'; // Creating next

const AdminDashboard = () => {
    // Mock Stats
    const stats = [
        { label: "Total Users", value: "12,450", icon: <Users size={24} />, change: "+12%" },
        { label: "Total Posts", value: "45,200", icon: <FileText size={24} />, change: "+5%" },
        { label: "Revenue", value: "Ksh 850k", icon: <DollarSign size={24} />, change: "+18%" },
        { label: "Active Now", value: "854", icon: <Activity size={24} />, change: "+2%" },
    ];

    // Mock Users Table
    const users = [
        { id: 1, name: "Alice M.", email: "alice@student.karu.ac.ke", role: "Student", status: "Active" },
        { id: 2, name: "Bob D.", email: "bob@student.karu.ac.ke", role: "Student", status: "Banned" },
        { id: 3, name: "Charlie T.", email: "charlie@karu.ac.ke", role: "Admin", status: "Active" },
        { id: 4, name: "Study Group A", email: "group_a@karuteens.com", role: "Group", status: "Active" },
        { id: 5, name: "Eve P.", email: "eve@student.karu.ac.ke", role: "Premium", status: "Active" },
    ];

    return (
        <div className="admin-container">
            {/* Sidebar */}
            <aside className="admin-sidebar">
                <div className="admin-brand">
                    <h2>Karu Admin</h2>
                </div>
                <nav className="admin-nav">
                    <a href="#" className="active"><Activity size={20} /> Dashboard</a>
                    <a href="#"><Users size={20} /> Users</a>
                    <a href="#"><FileText size={20} /> Content</a>
                    <a href="#"><DollarSign size={20} /> Finance</a>
                    <a href="#"><Settings size={20} /> Settings</a>
                </nav>
                <div className="admin-logout">
                    <button><LogOut size={20} /> Logout</button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="admin-main">
                <header className="admin-header">
                    <h1>Dashboard Overview</h1>
                    <div className="admin-user">Admin User</div>
                </header>

                {/* Stats Grid */}
                <div className="stats-grid">
                    {stats.map((stat, i) => (
                        <div key={i} className="stat-card">
                            <div className="stat-icon">{stat.icon}</div>
                            <div className="stat-info">
                                <span className="stat-label">{stat.label}</span>
                                <h3 className="stat-value">{stat.value}</h3>
                                <span className="stat-change"><TrendingUp size={14} /> {stat.change}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Recent Users Table */}
                <div className="admin-section">
                    <h3>Recent Users</h3>
                    <div className="table-responsive">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id}>
                                        <td>{user.name}</td>
                                        <td>{user.email}</td>
                                        <td><span className={`badge badge-${user.role.toLowerCase()}`}>{user.role}</span></td>
                                        <td><span className={`status-dot ${user.status.toLowerCase()}`}></span> {user.status}</td>
                                        <td><button className="btn-table">Edit</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
