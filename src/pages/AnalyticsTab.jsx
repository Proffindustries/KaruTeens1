import React, { useState, useEffect } from 'react';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    AreaChart, Area, BarChart, Bar, Legend 
} from 'recharts';
import { 
    Users, FileText, AlertTriangle, TrendingUp, Calendar, 
    Download, RefreshCw, Filter 
} from 'lucide-react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';

const AnalyticsTab = () => {
    const [data, setData] = useState({ growth: [], content: [], reports: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('30d');
    const { showToast } = useToast();

    useEffect(() => {
        const fetchAnalytics = async () => {
            setIsLoading(true);
            try {
                const { data: analyticsData } = await api.get('/admin/analytics');
                setData(analyticsData);
            } catch (error) {
                showToast('Failed to load analytics data', 'error');
            } finally {
                setIsLoading(false);
            }
        };
        fetchAnalytics();
    }, [showToast]);

    if (isLoading) {
        return (
            <div className="analytics-loading" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', gap: '1rem' }}>
                <RefreshCw className="spin-anim" size={32} />
                <p>Aggregating platform metrics...</p>
            </div>
        );
    }

    return (
        <div className="analytics-tab">
            <div className="tab-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h2>Platform Analytics</h2>
                    <p>Track user growth, content volume, and system performance</p>
                </div>
                <div className="header-actions" style={{ display: 'flex', gap: '1rem' }}>
                    <select 
                        value={timeRange} 
                        onChange={(e) => setTimeRange(e.target.value)}
                        style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--admin-border)', background: 'var(--admin-card-bg)', color: 'var(--admin-text-main)' }}
                    >
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                        <option value="90d">Last 90 Days</option>
                    </select>
                    <button className="btn-secondary">
                        <Download size={18} /> Export Data
                    </button>
                </div>
            </div>

            <div className="analytics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem' }}>
                {/* User Growth Chart */}
                <div className="analytics-card" style={{ background: 'var(--admin-card-bg)', padding: '1.5rem', borderRadius: 'var(--admin-radius)', border: '1px solid var(--admin-border)' }}>
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                        <h3>User Growth</h3>
                        <Users size={20} color="var(--admin-primary)" />
                    </div>
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer>
                            <AreaChart data={data.growth}>
                                <defs>
                                    <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--admin-border)" />
                                <XAxis dataKey="date" stroke="var(--admin-text-muted)" fontSize={12} tickFormatter={(val) => val.split('-').slice(1).join('/')} />
                                <YAxis stroke="var(--admin-text-muted)" fontSize={12} />
                                <Tooltip 
                                    contentStyle={{ background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)', borderRadius: '8px' }}
                                    itemStyle={{ color: 'var(--admin-primary)' }}
                                />
                                <Area type="monotone" dataKey="count" stroke="#4f46e5" fillOpacity={1} fill="url(#colorGrowth)" name="New Users" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Content Volume Chart */}
                <div className="analytics-card" style={{ background: 'var(--admin-card-bg)', padding: '1.5rem', borderRadius: 'var(--admin-radius)', border: '1px solid var(--admin-border)' }}>
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                        <h3>Content Volume</h3>
                        <FileText size={20} color="#f59e0b" />
                    </div>
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer>
                            <BarChart data={data.content}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--admin-border)" />
                                <XAxis dataKey="date" stroke="var(--admin-text-muted)" fontSize={12} tickFormatter={(val) => val.split('-').slice(1).join('/')} />
                                <YAxis stroke="var(--admin-text-muted)" fontSize={12} />
                                <Tooltip 
                                    contentStyle={{ background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)', borderRadius: '8px' }}
                                    cursor={{ fill: 'rgba(var(--primary), 0.05)' }}
                                />
                                <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Posts Created" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Report Trends Chart */}
                <div className="analytics-card" style={{ background: 'var(--admin-card-bg)', padding: '1.5rem', borderRadius: 'var(--admin-radius)', border: '1px solid var(--admin-border)' }}>
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                        <h3>Report Trends</h3>
                        <AlertTriangle size={20} color="#ef4444" />
                    </div>
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer>
                            <LineChart data={data.reports}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--admin-border)" />
                                <XAxis dataKey="date" stroke="var(--admin-text-muted)" fontSize={12} tickFormatter={(val) => val.split('-').slice(1).join('/')} />
                                <YAxis stroke="var(--admin-text-muted)" fontSize={12} />
                                <Tooltip 
                                    contentStyle={{ background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)', borderRadius: '8px' }}
                                />
                                <Legend />
                                <Line type="stepAfter" dataKey="count" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Incident Reports" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Summary Metrics */}
                <div className="analytics-card" style={{ background: 'var(--admin-card-bg)', padding: '1.5rem', borderRadius: 'var(--admin-radius)', border: '1px solid var(--admin-border)' }}>
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                        <h3>Platform Health</h3>
                        <TrendingUp size={20} color="#10b981" />
                    </div>
                    <div className="health-metrics" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="health-stat" style={{ padding: '1rem', background: 'var(--admin-bg)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)', marginBottom: '0.5rem' }}>Avg. Daily Growth</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--admin-text-main)' }}>
                                {data.growth.length > 0 ? (data.growth.reduce((a, b) => a + b.count, 0) / data.growth.length).toFixed(1) : 0}
                            </div>
                        </div>
                        <div className="health-stat" style={{ padding: '1rem', background: 'var(--admin-bg)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)', marginBottom: '0.5rem' }}>Post Momentum</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--admin-text-main)' }}>
                                {data.content.length > 0 ? (data.content.reduce((a, b) => a + b.count, 0) / data.content.length).toFixed(1) : 0}
                            </div>
                        </div>
                        <div className="health-stat" style={{ padding: '1rem', background: 'var(--admin-bg)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)', marginBottom: '0.5rem' }}>Response Rate</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>98.2%</div>
                        </div>
                        <div className="health-stat" style={{ padding: '1rem', background: 'var(--admin-bg)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)', marginBottom: '0.5rem' }}>Server Uptime</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>99.9%</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsTab;
