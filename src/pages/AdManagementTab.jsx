import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import {
    Download,
    Upload,
    RefreshCw,
    Search,
    Filter,
    Plus,
    Edit,
    Trash2,
    BarChart2,
    DollarSign,
    MoreVertical,
    X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/AdManagementTab.css';

const AdManagementTab = () => {
    const [campaigns, setCampaigns] = useState([]);
    const [adGroups, setAdGroups] = useState([]);
    const [adCreatives, setAdCreatives] = useState([]);
    const [editingCampaign, setEditingCampaign] = useState(null);
    const [editingGroup, setEditingGroup] = useState(null);
    const [editingCreative, setEditingCreative] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [currentTab, setCurrentTab] = useState('campaigns');
    const [performanceData, setPerformanceData] = useState(null);
    const [reports, setReports] = useState([]);
    const { showToast } = useToast();

    const loadInitialData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [campaignsRes, groupsRes, creativesRes, perfRes, reportsRes] = await Promise.all([
                api.get('/ad-campaigns'),
                api.get('/ad-groups'),
                api.get('/ad-creatives'),
                api.get('/ad-performance'),
                api.get('/ad-reports'),
            ]);
            setCampaigns(campaignsRes.data);
            setAdGroups(groupsRes.data);
            setAdCreatives(creativesRes.data);
            setPerformanceData(perfRes.data);
            setReports(reportsRes.data);
        } catch (error) {
            console.error('Failed to load initial data:', error);
            showToast('Failed to refresh data', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        loadInitialData();
    }, [loadInitialData]);

    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filters, setFilters] = useState({ search: '' });

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(filters.search || '');
        }, 300);
        return () => clearTimeout(handler);
    }, [filters.search]);

    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    return (
        <div className="ad-management-tab">
            <div className="tab-header">
                <h2>Ad Management</h2>
                <div className="tab-actions">
                    <button className="btn-outline" onClick={loadInitialData}>
                        <RefreshCw size={18} /> Refresh
                    </button>
                    <button
                        className="btn-primary"
                        onClick={() => {
                            /* Handle Create Ad */
                        }}
                    >
                        <Plus size={18} /> New Campaign
                    </button>
                </div>
            </div>

            <div className="tab-content">
                {/* Simplified view for illustration - expanded in full component */}
                <div className="ad-stats-overview">
                    <h3>Campaign Performance</h3>
                    {performanceData ? (
                        <pre>{JSON.stringify(performanceData, null, 2)}</pre>
                    ) : (
                        <p>No performance data yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdManagementTab;
