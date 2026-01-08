import React, { useState, useEffect } from 'react';
import {
    DollarSign, TrendingUp, BarChart3, Users, Calendar, Clock, Eye, EyeOff,
    Video, Image, Edit, Trash2, Plus, Search, Filter, RefreshCw, Download, Upload,
    Shield, AlertTriangle, Globe, Target, Settings, Play, Pause, StopCircle,
    AlertCircle, ShoppingBag, Smartphone, MessageCircle, Network, Zap as ZapIcon, Music
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

const AdManagementTab = () => {
    const [campaigns, setCampaigns] = useState([]);
    const [adGroups, setAdGroups] = useState([]);
    const [adCreatives, setAdCreatives] = useState([]);
    const [filters, setFilters] = useState({
        status: 'all',
        campaign_type: 'all',
        objective: 'all',
        optimization_goal: 'all',
        start_date: '',
        end_date: '',
        min_budget: '',
        max_budget: '',
        min_spend: '',
        max_spend: '',
        min_roas: '',
        max_roas: '',
        min_ctr: '',
        max_ctr: '',
        sort_by: 'created_at',
        sort_order: 'desc'
    });

    const [selectedCampaigns, setSelectedCampaigns] = useState([]);
    const [selectedAdGroups, setSelectedAdGroups] = useState([]);
    const [selectedCreatives, setSelectedCreatives] = useState([]);
    const [bulkAction, setBulkAction] = useState('');
    const [showCampaignModal, setShowCampaignModal] = useState(false);
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [showCreativeModal, setShowCreativeModal] = useState(false);
    const [showPerformanceModal, setShowPerformanceModal] = useState(false);
    const [showReportsModal, setShowReportsModal] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState(null);
    const [editingGroup, setEditingGroup] = useState(null);
    const [editingCreative, setEditingCreative] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [currentTab, setCurrentTab] = useState('campaigns');

    const { showToast } = useToast();

    // Mock data for campaigns
    const mockCampaigns = [
        {
            id: 'campaign_001',
            name: 'Summer Sale Campaign',
            description: 'Promote summer sale products with targeted ads',
            status: 'active',
            start_date: '2024-06-01T00:00:00Z',
            end_date: '2024-08-31T23:59:59Z',
            budget: {
                daily_budget: 500.0,
                lifetime_budget: 15000.0,
                budget_type: 'lifetime',
                budget_delivery: 'standard',
                currency: 'USD',
                spent_today: 450.0,
                spent_lifetime: 8500.0,
                remaining_daily: 50.0,
                remaining_lifetime: 6500.0,
                budget_utilization: 0.57
            },
            optimization_goal: 'conversions',
            bidding_strategy: 'automatic_cpc',
            daily_budget: 500.0,
            lifetime_budget: 15000.0,
            target_roas: 3.5,
            target_cpa: 25.0,
            campaign_type: 'shopping',
            objective: 'conversions',
            tracking_pixel_id: 'pixel_001',
            conversion_actions: ['purchase', 'add_to_cart'],
            attribution_model: 'last_click',
            frequency_capping: {
                impressions: 3,
                time_period: 'day',
                user_type: 'all'
            },
            exclusion_rules: [
                { rule_type: 'content', rule_value: 'adult_content', rule_operator: 'exclude' }
            ],
            created_at: '2024-05-25T10:00:00Z',
            updated_at: '2024-06-01T10:00:00Z',
            created_by: 'admin_user',
            updated_by: null,
            groups_count: 5,
            creatives_count: 15,
            total_spend: 8500.0,
            total_impressions: 250000,
            total_clicks: 12500,
            total_conversions: 500,
            ctr: 0.05,
            cpm: 34.0,
            cpc: 0.68,
            roas: 3.2,
            conversion_rate: 0.04,
            quality_score: 8.5,
            ad_rank: 1.2,
            performance_score: 85.0,
            last_updated: '2024-06-15T14:30:00Z'
        },
        {
            id: 'campaign_002',
            name: 'Brand Awareness Campaign',
            description: 'Increase brand visibility and awareness',
            status: 'paused',
            start_date: '2024-05-01T00:00:00Z',
            end_date: '2024-12-31T23:59:59Z',
            budget: {
                daily_budget: 200.0,
                lifetime_budget: null,
                budget_type: 'daily',
                budget_delivery: 'accelerated',
                currency: 'USD',
                spent_today: 180.0,
                spent_lifetime: 12000.0,
                remaining_daily: 20.0,
                remaining_lifetime: null,
                budget_utilization: 0.90
            },
            optimization_goal: 'impressions',
            bidding_strategy: 'cpm',
            daily_budget: 200.0,
            lifetime_budget: null,
            target_roas: null,
            target_cpa: null,
            campaign_type: 'display',
            objective: 'brand_awareness',
            tracking_pixel_id: 'pixel_002',
            conversion_actions: ['view_content'],
            attribution_model: 'first_click',
            frequency_capping: {
                impressions: 5,
                time_period: 'week',
                user_type: 'new'
            },
            exclusion_rules: [
                { rule_type: 'audience', rule_value: 'existing_customers', rule_operator: 'exclude' }
            ],
            created_at: '2024-04-20T10:00:00Z',
            updated_at: '2024-05-01T10:00:00Z',
            created_by: 'marketing_user',
            updated_by: 'admin_user',
            groups_count: 3,
            creatives_count: 8,
            total_spend: 12000.0,
            total_impressions: 1500000,
            total_clicks: 8000,
            total_conversions: 200,
            ctr: 0.0053,
            cpm: 8.0,
            cpc: 1.50,
            roas: 1.8,
            conversion_rate: 0.025,
            quality_score: 7.2,
            ad_rank: 0.8,
            performance_score: 72.0,
            last_updated: '2024-06-10T09:15:00Z'
        },
        {
            id: 'campaign_003',
            name: 'Lead Generation Campaign',
            description: 'Generate qualified leads for B2B services',
            status: 'active',
            start_date: '2024-06-10T00:00:00Z',
            end_date: '2024-09-30T23:59:59Z',
            budget: {
                daily_budget: 300.0,
                lifetime_budget: 25000.0,
                budget_type: 'lifetime',
                budget_delivery: 'standard',
                currency: 'USD',
                spent_today: 280.0,
                spent_lifetime: 6500.0,
                remaining_daily: 20.0,
                remaining_lifetime: 18500.0,
                budget_utilization: 0.26
            },
            optimization_goal: 'leads',
            bidding_strategy: 'cpa',
            daily_budget: 300.0,
            lifetime_budget: 25000.0,
            target_roas: null,
            target_cpa: 45.0,
            campaign_type: 'search',
            objective: 'leads',
            tracking_pixel_id: 'pixel_003',
            conversion_actions: ['form_submission', 'phone_call'],
            attribution_model: 'linear',
            frequency_capping: {
                impressions: 2,
                time_period: 'day',
                user_type: 'all'
            },
            exclusion_rules: [],
            created_at: '2024-06-05T10:00:00Z',
            updated_at: '2024-06-10T10:00:00Z',
            created_by: 'sales_user',
            updated_by: null,
            groups_count: 4,
            creatives_count: 12,
            total_spend: 6500.0,
            total_impressions: 85000,
            total_clicks: 1700,
            total_conversions: 36,
            ctr: 0.02,
            cpm: 76.47,
            cpc: 3.82,
            roas: 2.1,
            conversion_rate: 0.021,
            quality_score: 9.1,
            ad_rank: 1.5,
            performance_score: 91.0,
            last_updated: '2024-06-18T16:45:00Z'
        }
    ];

    // Mock data for ad groups
    const mockAdGroups = [
        {
            id: 'group_001',
            campaign_id: 'campaign_001',
            name: 'Summer Sale - Electronics',
            status: 'active',
            targeting: {
                locations: ['US', 'CA', 'UK'],
                demographics: {
                    age_ranges: ['25-44', '45-54'],
                    genders: ['male', 'female'],
                    income_levels: ['middle', 'high'],
                    education_levels: ['college', 'graduate'],
                    relationship_statuses: ['single', 'married'],
                    parental_statuses: ['has_children', 'no_children']
                },
                interests: ['technology', 'gadgets', 'shopping'],
                keywords: ['summer sale', 'electronics', 'discount'],
                devices: ['mobile', 'desktop', 'tablet'],
                operating_systems: ['iOS', 'Android', 'Windows', 'macOS'],
                time_of_day: {
                    start_hour: 9,
                    end_hour: 21,
                    days_of_week: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
                },
                custom_audiences: ['electronics_shoppers', 'tech_enthusiasts'],
                lookalike_audiences: ['similar_to_electronics'],
                exclusion_audiences: ['existing_customers']
            },
            bid_strategy: {
                bid_type: 'cpc',
                bid_amount: 1.25,
                bid_strategy: 'manual',
                bid_ceiling: 3.0,
                bid_floor: 0.5
            },
            ad_rotation: 'optimized',
            ad_serving_optimization: 'optimize_for_conversions',
            start_date: '2024-06-01T00:00:00Z',
            end_date: '2024-08-31T23:59:59Z',
            created_at: '2024-05-25T10:00:00Z',
            updated_at: '2024-06-01T10:00:00Z',
            creatives_count: 3,
            total_spend: 2100.0,
            total_impressions: 60000,
            total_clicks: 3000,
            ctr: 0.05,
            cpm: 35.0,
            cpc: 0.70
        },
        {
            id: 'group_002',
            campaign_id: 'campaign_001',
            name: 'Summer Sale - Fashion',
            status: 'active',
            targeting: {
                locations: ['US', 'CA'],
                demographics: {
                    age_ranges: ['18-34'],
                    genders: ['female'],
                    income_levels: ['middle'],
                    education_levels: ['high_school', 'college'],
                    relationship_statuses: ['single'],
                    parental_statuses: ['no_children']
                },
                interests: ['fashion', 'beauty', 'lifestyle'],
                keywords: ['summer fashion', 'clothing sale', 'beauty products'],
                devices: ['mobile'],
                operating_systems: ['iOS', 'Android'],
                time_of_day: {
                    start_hour: 12,
                    end_hour: 20,
                    days_of_week: ['monday', 'wednesday', 'friday', 'sunday']
                },
                custom_audiences: ['fashion_shoppers', 'beauty_enthusiasts'],
                lookalike_audiences: ['similar_to_fashion'],
                exclusion_audiences: []
            },
            bid_strategy: {
                bid_type: 'cpc',
                bid_amount: 0.95,
                bid_strategy: 'automatic',
                bid_ceiling: 2.5,
                bid_floor: 0.3
            },
            ad_rotation: 'rotate_forever',
            ad_serving_optimization: 'balanced',
            start_date: '2024-06-01T00:00:00Z',
            end_date: '2024-08-31T23:59:59Z',
            created_at: '2024-05-25T10:00:00Z',
            updated_at: '2024-06-01T10:00:00Z',
            creatives_count: 4,
            total_spend: 1800.0,
            total_impressions: 50000,
            total_clicks: 2250,
            ctr: 0.045,
            cpm: 36.0,
            cpc: 0.80
        }
    ];

    // Mock data for ad creatives
    const mockAdCreatives = [
        {
            id: 'creative_001',
            ad_group_id: 'group_001',
            name: 'Summer Sale - Electronics Banner',
            creative_type: 'image',
            status: 'active',
            assets: [
                {
                    asset_type: 'image',
                    asset_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e',
                    asset_text: null,
                    asset_dimensions: { width: 1200, height: 628, aspect_ratio: '1.91:1' },
                    asset_format: 'jpg',
                    asset_size: 150000,
                    alt_text: 'Summer sale electronics banner',
                    creative_id: 'creative_001'
                }
            ],
            variants: [
                {
                    variant_name: 'Variant A',
                    assets: [
                        {
                            asset_type: 'image',
                            asset_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e',
                            asset_text: null,
                            asset_dimensions: { width: 1200, height: 628, aspect_ratio: '1.91:1' },
                            asset_format: 'jpg',
                            asset_size: 150000,
                            alt_text: 'Summer sale electronics banner variant A',
                            creative_id: 'creative_001a'
                        }
                    ],
                    targeting: null,
                    bid_adjustments: {
                        device_adjustments: [
                            { device_type: 'mobile', adjustment_percentage: 1.2 },
                            { device_type: 'desktop', adjustment_percentage: 0.8 }
                        ],
                        location_adjustments: [
                            { location: 'US', adjustment_percentage: 1.1 },
                            { location: 'CA', adjustment_percentage: 0.9 }
                        ],
                        time_adjustments: [
                            { time_period: 'evening', adjustment_percentage: 1.3 }
                        ]
                    }
                }
            ],
            call_to_action: 'Shop Now',
            headline: 'Summer Sale - Up to 50% Off Electronics',
            description: 'Get the latest gadgets at unbeatable prices. Limited time offer!',
            display_url: 'www.example.com/summer-sale',
            final_url: 'https://www.example.com/summer-sale?utm_source=facebook&utm_medium=paid&utm_campaign=summer_sale',
            tracking_url: 'https://tracking.example.com/click?campaign_id={campaign_id}&ad_group_id={ad_group_id}',
            custom_parameters: [
                { key: 'utm_source', value: 'facebook' },
                { key: 'utm_medium', value: 'paid' },
                { key: 'utm_campaign', value: 'summer_sale' }
            ],
            template_id: 'template_electronics_001',
            template_fields: [
                { field_name: 'product_category', field_value: 'electronics', field_type: 'text' },
                { field_name: 'discount_percentage', field_value: '50', field_type: 'number' }
            ],
            created_at: '2024-05-25T10:00:00Z',
            updated_at: '2024-06-01T10:00:00Z',
            impressions: 25000,
            clicks: 1250,
            conversions: 50,
            ctr: 0.05,
            cpm: 36.0,
            cpc: 0.72,
            quality_score: 8.7,
            relevance_score: 9.0,
            landing_page_score: 8.5
        },
        {
            id: 'creative_002',
            ad_group_id: 'group_002',
            name: 'Summer Sale - Fashion Video',
            creative_type: 'video',
            status: 'active',
            assets: [
                {
                    asset_type: 'video',
                    asset_url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
                    asset_text: null,
                    asset_dimensions: { width: 1280, height: 720, aspect_ratio: '16:9' },
                    asset_format: 'mp4',
                    asset_size: 1048576,
                    alt_text: 'Summer fashion video ad',
                    creative_id: 'creative_002'
                }
            ],
            variants: null,
            call_to_action: 'Learn More',
            headline: 'Summer Fashion - Fresh Styles for Less',
            description: 'Discover trendy styles at amazing prices. Shop the collection today!',
            display_url: 'www.example.com/summer-fashion',
            final_url: 'https://www.example.com/summer-fashion?utm_source=instagram&utm_medium=paid&utm_campaign=summer_fashion',
            tracking_url: 'https://tracking.example.com/click?campaign_id={campaign_id}&ad_group_id={ad_group_id}',
            custom_parameters: [
                { key: 'utm_source', value: 'instagram' },
                { key: 'utm_medium', value: 'paid' },
                { key: 'utm_campaign', value: 'summer_fashion' }
            ],
            template_id: null,
            template_fields: null,
            created_at: '2024-05-25T10:00:00Z',
            updated_at: '2024-06-01T10:00:00Z',
            impressions: 20000,
            clicks: 900,
            conversions: 20,
            ctr: 0.045,
            cpm: 34.0,
            cpc: 0.85,
            quality_score: 8.2,
            relevance_score: 8.5,
            landing_page_score: 8.0
        }
    ];

    // Mock performance data
    const mockPerformanceData = [
        {
            campaign_id: 'campaign_001',
            date: '2024-06-15T00:00:00Z',
            impressions: 250000,
            clicks: 12500,
            conversions: 500,
            spend: 8500.0,
            ctr: 0.05,
            cpm: 34.0,
            cpc: 0.68,
            roas: 3.2,
            conversion_rate: 0.04,
            quality_score: 8.5,
            ad_rank: 1.2,
            performance_score: 85.0
        },
        {
            campaign_id: 'campaign_002',
            date: '2024-06-15T00:00:00Z',
            impressions: 1500000,
            clicks: 8000,
            conversions: 200,
            spend: 12000.0,
            ctr: 0.0053,
            cpm: 8.0,
            cpc: 1.50,
            roas: 1.8,
            conversion_rate: 0.025,
            quality_score: 7.2,
            ad_rank: 0.8,
            performance_score: 72.0
        },
        {
            campaign_id: 'campaign_003',
            date: '2024-06-15T00:00:00Z',
            impressions: 85000,
            clicks: 1700,
            conversions: 36,
            spend: 6500.0,
            ctr: 0.02,
            cpm: 76.47,
            cpc: 3.82,
            roas: 2.1,
            conversion_rate: 0.021,
            quality_score: 9.1,
            ad_rank: 1.5,
            performance_score: 91.0
        }
    ];

    // Mock reports data
    const mockReports = [
        {
            id: 'report_001',
            report_type: 'campaign_performance',
            date_range: '2024-06-01 to 2024-06-15',
            generated_at: '2024-06-16T10:00:00Z',
            generated_by: 'admin_user',
            campaigns: ['campaign_001', 'campaign_002', 'campaign_003'],
            total_spend: 27000.0,
            total_impressions: 1835000,
            total_clicks: 22200,
            total_conversions: 736,
            overall_ctr: 0.0121,
            overall_cpm: 14.71,
            overall_cpc: 1.22,
            overall_roas: 2.37,
            currency: 'USD',
            file_url: 'https://example.com/reports/campaign_performance_2024-06-16.pdf'
        },
        {
            id: 'report_002',
            report_type: 'ad_group_analysis',
            date_range: '2024-06-01 to 2024-06-15',
            generated_at: '2024-06-16T10:30:00Z',
            generated_by: 'marketing_user',
            ad_groups: ['group_001', 'group_002'],
            total_spend: 3900.0,
            total_impressions: 110000,
            total_clicks: 5250,
            total_conversions: 70,
            overall_ctr: 0.0477,
            overall_cpm: 35.45,
            overall_cpc: 0.74,
            currency: 'USD',
            file_url: 'https://example.com/reports/ad_group_analysis_2024-06-16.xlsx'
        }
    ];

    useEffect(() => {
        setIsLoading(true);
        // Simulate API call
        setTimeout(() => {
            setCampaigns(mockCampaigns);
            setAdGroups(mockAdGroups);
            setAdCreatives(mockAdCreatives);
            setIsLoading(false);
        }, 1000);
    }, [filters]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleBulkAction = () => {
        if (currentTab === 'campaigns' && selectedCampaigns.length === 0) {
            showToast('Please select campaigns first', 'warning');
            return;
        }
        if (currentTab === 'ad_groups' && selectedAdGroups.length === 0) {
            showToast('Please select ad groups first', 'warning');
            return;
        }
        if (currentTab === 'creatives' && selectedCreatives.length === 0) {
            showToast('Please select creatives first', 'warning');
            return;
        }

        if (bulkAction === 'activate') {
            if (currentTab === 'campaigns') {
                setCampaigns(prev => prev.map(c =>
                    selectedCampaigns.includes(c.id) ? { ...c, status: 'active' } : c
                ));
            } else if (currentTab === 'ad_groups') {
                setAdGroups(prev => prev.map(g =>
                    selectedAdGroups.includes(g.id) ? { ...g, status: 'active' } : g
                ));
            } else if (currentTab === 'creatives') {
                setAdCreatives(prev => prev.map(cr =>
                    selectedCreatives.includes(cr.id) ? { ...cr, status: 'active' } : cr
                ));
            }
            showToast('Items activated', 'success');
        } else if (bulkAction === 'pause') {
            if (currentTab === 'campaigns') {
                setCampaigns(prev => prev.map(c =>
                    selectedCampaigns.includes(c.id) ? { ...c, status: 'paused' } : c
                ));
            } else if (currentTab === 'ad_groups') {
                setAdGroups(prev => prev.map(g =>
                    selectedAdGroups.includes(g.id) ? { ...g, status: 'paused' } : g
                ));
            } else if (currentTab === 'creatives') {
                setAdCreatives(prev => prev.map(cr =>
                    selectedCreatives.includes(cr.id) ? { ...cr, status: 'paused' } : cr
                ));
            }
            showToast('Items paused', 'info');
        } else if (bulkAction === 'delete') {
            if (currentTab === 'campaigns') {
                if (confirm(`Delete ${selectedCampaigns.length} campaigns? This action cannot be undone.`)) {
                    setCampaigns(prev => prev.filter(c => !selectedCampaigns.includes(c.id)));
                    setSelectedCampaigns([]);
                }
            } else if (currentTab === 'ad_groups') {
                if (confirm(`Delete ${selectedAdGroups.length} ad groups? This action cannot be undone.`)) {
                    setAdGroups(prev => prev.filter(g => !selectedAdGroups.includes(g.id)));
                    setSelectedAdGroups([]);
                }
            } else if (currentTab === 'creatives') {
                if (confirm(`Delete ${selectedCreatives.length} creatives? This action cannot be undone.`)) {
                    setAdCreatives(prev => prev.filter(cr => !selectedCreatives.includes(cr.id)));
                    setSelectedCreatives([]);
                }
            }
            setBulkAction('');
            showToast('Items deleted', 'success');
        } else if (bulkAction === 'duplicate') {
            if (currentTab === 'campaigns') {
                const newCampaigns = selectedCampaigns.map(id => {
                    const original = campaigns.find(c => c.id === id);
                    return {
                        ...original,
                        id: `campaign_${Date.now()}`,
                        name: `${original.name} - Copy`,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        status: 'draft'
                    };
                });
                setCampaigns(prev => [...prev, ...newCampaigns]);
            } else if (currentTab === 'ad_groups') {
                const newGroups = selectedAdGroups.map(id => {
                    const original = adGroups.find(g => g.id === id);
                    return {
                        ...original,
                        id: `group_${Date.now()}`,
                        name: `${original.name} - Copy`,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        status: 'draft'
                    };
                });
                setAdGroups(prev => [...prev, ...newGroups]);
            } else if (currentTab === 'creatives') {
                const newCreatives = selectedCreatives.map(id => {
                    const original = adCreatives.find(cr => cr.id === id);
                    return {
                        ...original,
                        id: `creative_${Date.now()}`,
                        name: `${original.name} - Copy`,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        status: 'draft'
                    };
                });
                setAdCreatives(prev => [...prev, ...newCreatives]);
            }
            showToast('Items duplicated', 'success');
        }
        setBulkAction('');
    };

    const handleCreateCampaign = () => {
        setEditingCampaign({
            name: '',
            description: '',
            status: 'draft',
            start_date: '',
            end_date: '',
            daily_budget: 100,
            lifetime_budget: null,
            campaign_type: 'search',
            objective: 'traffic',
            optimization_goal: 'clicks'
        });
        setShowCampaignModal(true);
    };

    const handleCreateAdGroup = () => {
        setEditingGroup({
            name: '',
            status: 'draft',
            campaign_id: '',
            bid_amount: 1.0,
            targeting: {
                locations: [],
                demographics: {},
                interests: [],
                keywords: []
            }
        });
        setShowGroupModal(true);
    };

    const handleCreateCreative = () => {
        setEditingCreative({
            name: '',
            creative_type: 'image',
            status: 'draft',
            ad_group_id: '',
            headline: '',
            description: '',
            final_url: '',
            assets: []
        });
        setShowCreativeModal(true);
    };

    const handleEditCampaign = (campaign) => {
        setEditingCampaign(campaign);
        setShowCampaignModal(true);
    };

    const handleEditAdGroup = (group) => {
        setEditingGroup(group);
        setShowGroupModal(true);
    };

    const handleEditCreative = (creative) => {
        setEditingCreative(creative);
        setShowCreativeModal(true);
    };

    const handleDeleteCampaign = (campaignId) => {
        if (confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
            setCampaigns(prev => prev.filter(c => c.id !== campaignId));
            showToast('Campaign deleted', 'success');
        }
    };

    const handleDeleteAdGroup = (groupId) => {
        if (confirm('Are you sure you want to delete this ad group? This action cannot be undone.')) {
            setAdGroups(prev => prev.filter(g => g.id !== groupId));
            showToast('Ad group deleted', 'success');
        }
    };

    const handleDeleteCreative = (creativeId) => {
        if (confirm('Are you sure you want to delete this creative? This action cannot be undone.')) {
            setAdCreatives(prev => prev.filter(cr => cr.id !== creativeId));
            showToast('Creative deleted', 'success');
        }
    };

    const toggleCampaignSelection = (campaignId) => {
        setSelectedCampaigns(prev =>
            prev.includes(campaignId)
                ? prev.filter(id => id !== campaignId)
                : [...prev, campaignId]
        );
    };

    const toggleAdGroupSelection = (groupId) => {
        setSelectedAdGroups(prev =>
            prev.includes(groupId)
                ? prev.filter(id => id !== groupId)
                : [...prev, groupId]
        );
    };

    const toggleCreativeSelection = (creativeId) => {
        setSelectedCreatives(prev =>
            prev.includes(creativeId)
                ? prev.filter(id => id !== creativeId)
                : [...prev, creativeId]
        );
    };

    const selectAllCampaigns = () => {
        if (selectedCampaigns.length === campaigns.length) {
            setSelectedCampaigns([]);
        } else {
            setSelectedCampaigns(campaigns.map(c => c.id));
        }
    };

    const selectAllAdGroups = () => {
        if (selectedAdGroups.length === adGroups.length) {
            setSelectedAdGroups([]);
        } else {
            setSelectedAdGroups(adGroups.map(g => g.id));
        }
    };

    const selectAllCreatives = () => {
        if (selectedCreatives.length === adCreatives.length) {
            setSelectedCreatives([]);
        } else {
            setSelectedCreatives(adCreatives.map(cr => cr.id));
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'active': return { color: 'green', text: 'Active', icon: <Play size={14} /> };
            case 'paused': return { color: 'orange', text: 'Paused', icon: <Pause size={14} /> };
            case 'draft': return { color: 'blue', text: 'Draft', icon: <Clock size={14} /> };
            case 'archived': return { color: 'gray', text: 'Archived', icon: <EyeOff size={14} /> };
            default: return { color: 'gray', text: status, icon: <AlertCircle size={14} /> };
        }
    };

    const getCampaignTypeBadge = (type) => {
        switch (type) {
            case 'search': return { color: 'blue', text: 'Search', icon: <Search size={14} /> };
            case 'display': return { color: 'green', text: 'Display', icon: <Image size={14} /> };
            case 'video': return { color: 'purple', text: 'Video', icon: <Video size={14} /> };
            case 'shopping': return { color: 'orange', text: 'Shopping', icon: <ShoppingBag size={14} /> };
            case 'app': return { color: 'red', text: 'App', icon: <Smartphone size={14} /> };
            default: return { color: 'gray', text: type, icon: <AlertCircle size={14} /> };
        }
    };

    const getObjectiveBadge = (objective) => {
        switch (objective) {
            case 'brand_awareness': return { color: 'blue', text: 'Awareness', icon: <Eye size={14} /> };
            case 'traffic': return { color: 'green', text: 'Traffic', icon: <Users size={14} /> };
            case 'engagement': return { color: 'purple', text: 'Engagement', icon: <MessageCircle size={14} /> };
            case 'leads': return { color: 'orange', text: 'Leads', icon: <Target size={14} /> };
            case 'conversions': return { color: 'red', text: 'Conversions', icon: <TrendingUp size={14} /> };
            default: return { color: 'gray', text: objective, icon: <AlertCircle size={14} /> };
        }
    };

    const formatCurrency = (amount, currency = 'USD') => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount);
    };

    const formatPercentage = (value) => {
        return `${(value * 100).toFixed(2)}%`;
    };

    return (
        <div className="ad-management-tab">
            {/* Header */}
            <div className="tab-header">
                <div className="header-left">
                    <h2>Ad Management</h2>
                    <p>Comprehensive advertising campaign management with advanced targeting and performance analytics</p>
                </div>
                <div className="header-actions">
                    <button className="btn-secondary">
                        <Download size={18} />
                        Export Reports
                    </button>
                    <button className="btn-secondary">
                        <Upload size={18} />
                        Import Campaigns
                    </button>
                    <button
                        className="btn-primary"
                        onClick={() => setShowReportsModal(true)}
                    >
                        <BarChart3 size={18} />
                        Generate Reports
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="tabs-navigation">
                <div className="tab-buttons">
                    <button
                        className={`tab-btn ${currentTab === 'campaigns' ? 'active' : ''}`}
                        onClick={() => setCurrentTab('campaigns')}
                    >
                        <TrendingUp size={16} />
                        Campaigns
                    </button>
                    <button
                        className={`tab-btn ${currentTab === 'ad_groups' ? 'active' : ''}`}
                        onClick={() => setCurrentTab('ad_groups')}
                    >
                        <Users size={16} />
                        Ad Groups
                    </button>
                    <button
                        className={`tab-btn ${currentTab === 'creatives' ? 'active' : ''}`}
                        onClick={() => setCurrentTab('creatives')}
                    >
                        <Video size={16} />
                        Creatives
                    </button>
                    <button
                        className={`tab-btn ${currentTab === 'performance' ? 'active' : ''}`}
                        onClick={() => setCurrentTab('performance')}
                    >
                        <BarChart3 size={16} />
                        Performance
                    </button>
                </div>
            </div>

            {/* Campaigns Tab */}
            {currentTab === 'campaigns' && (
                <>
                    {/* Filters */}
                    <div className="filters-section">
                        <div className="search-filters">
                            <div className="search-box">
                                <Search size={20} className="search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search campaigns by name, description, or objective..."
                                    value={filters.search}
                                    onChange={(e) => handleFilterChange('search', e.target.value)}
                                />
                            </div>

                            <div className="filter-group">
                                <select
                                    value={filters.status}
                                    onChange={(e) => handleFilterChange('status', e.target.value)}
                                >
                                    <option value="all">All Status</option>
                                    <option value="active">Active</option>
                                    <option value="paused">Paused</option>
                                    <option value="draft">Draft</option>
                                    <option value="archived">Archived</option>
                                </select>

                                <select
                                    value={filters.campaign_type}
                                    onChange={(e) => handleFilterChange('campaign_type', e.target.value)}
                                >
                                    <option value="all">All Types</option>
                                    <option value="search">Search</option>
                                    <option value="display">Display</option>
                                    <option value="video">Video</option>
                                    <option value="shopping">Shopping</option>
                                    <option value="app">App</option>
                                </select>

                                <select
                                    value={filters.objective}
                                    onChange={(e) => handleFilterChange('objective', e.target.value)}
                                >
                                    <option value="all">All Objectives</option>
                                    <option value="brand_awareness">Brand Awareness</option>
                                    <option value="traffic">Traffic</option>
                                    <option value="engagement">Engagement</option>
                                    <option value="leads">Leads</option>
                                    <option value="conversions">Conversions</option>
                                </select>

                                <input
                                    type="number"
                                    placeholder="Min budget"
                                    value={filters.min_budget}
                                    onChange={(e) => handleFilterChange('min_budget', e.target.value)}
                                />

                                <input
                                    type="number"
                                    placeholder="Max budget"
                                    value={filters.max_budget}
                                    onChange={(e) => handleFilterChange('max_budget', e.target.value)}
                                />

                                <input
                                    type="number"
                                    placeholder="Min ROAS"
                                    value={filters.min_roas}
                                    onChange={(e) => handleFilterChange('min_roas', e.target.value)}
                                />

                                <input
                                    type="number"
                                    placeholder="Min CTR"
                                    value={filters.min_ctr}
                                    onChange={(e) => handleFilterChange('min_ctr', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="filter-actions">
                            <button className="refresh-btn" onClick={() => { }}>
                                <RefreshCw size={18} />
                                Refresh
                            </button>
                            <button className="btn-secondary" onClick={() => setShowPerformanceModal(true)}>
                                <BarChart3 size={18} />
                                Campaign Analytics
                            </button>
                        </div>
                    </div>

                    {/* Bulk Actions */}
                    {selectedCampaigns.length > 0 && (
                        <div className="bulk-actions">
                            <div className="selection-info">
                                {selectedCampaigns.length} campaigns selected
                            </div>
                            <div className="bulk-actions-controls">
                                <select
                                    value={bulkAction}
                                    onChange={(e) => setBulkAction(e.target.value)}
                                >
                                    <option value="">Bulk Actions</option>
                                    <option value="activate">Activate</option>
                                    <option value="pause">Pause</option>
                                    <option value="delete">Delete Campaigns</option>
                                    <option value="duplicate">Duplicate</option>
                                </select>
                                <button
                                    className="btn-primary"
                                    onClick={handleBulkAction}
                                    disabled={!bulkAction}
                                >
                                    Apply Action
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Campaigns Table */}
                    <div className="campaigns-table-container">
                        {isLoading ? (
                            <div className="loading-state">
                                <RefreshCw size={32} className="spin-anim" />
                                <p>Loading campaigns...</p>
                            </div>
                        ) : (
                            <>
                                <div className="table-header">
                                    <div className="select-all">
                                        <input
                                            type="checkbox"
                                            checked={selectedCampaigns.length === campaigns.length && campaigns.length > 0}
                                            onChange={selectAllCampaigns}
                                        />
                                        <span>Select All</span>
                                    </div>
                                    <div className="table-actions">
                                        <span className="campaign-count">{campaigns.length} campaigns found</span>
                                        <button className="btn-primary" onClick={handleCreateCampaign}>
                                            <Plus size={18} />
                                            Create Campaign
                                        </button>
                                    </div>
                                </div>

                                <div className="table-responsive">
                                    <table className="admin-table">
                                        <thead>
                                            <tr>
                                                <th>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedCampaigns.length === campaigns.length && campaigns.length > 0}
                                                        onChange={selectAllCampaigns}
                                                    />
                                                </th>
                                                <th>Campaign Info</th>
                                                <th>Status & Type</th>
                                                <th>Budget & Spend</th>
                                                <th>Performance Metrics</th>
                                                <th>Targeting & Optimization</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {campaigns.map(campaign => (
                                                <tr key={campaign.id} className={campaign.status === 'paused' ? 'paused-campaign' : campaign.status === 'draft' ? 'draft-campaign' : ''}>
                                                    <td>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedCampaigns.includes(campaign.id)}
                                                            onChange={() => toggleCampaignSelection(campaign.id)}
                                                        />
                                                    </td>
                                                    <td>
                                                        <div className="campaign-info">
                                                            <div className="campaign-header">
                                                                <strong>{campaign.name}</strong>
                                                                <span className="campaign-id">ID: {campaign.id}</span>
                                                            </div>
                                                            <div className="campaign-description">
                                                                <p>{campaign.description}</p>
                                                            </div>
                                                            <div className="campaign-meta">
                                                                <span className="campaign-created">Created: {new Date(campaign.created_at).toLocaleDateString()}</span>
                                                                <span className="campaign-updated">Updated: {new Date(campaign.updated_at).toLocaleDateString()}</span>
                                                                <span className="campaign-created-by">By: {campaign.created_by}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="status-info">
                                                            <div className="status-badge">
                                                                <span className={`status-pill ${getStatusBadge(campaign.status).color}`}>
                                                                    {getStatusBadge(campaign.status).icon}
                                                                    {getStatusBadge(campaign.status).text}
                                                                </span>
                                                                <span className={`campaign-type-pill ${getCampaignTypeBadge(campaign.campaign_type).color}`}>
                                                                    {getCampaignTypeBadge(campaign.campaign_type).icon}
                                                                    {getCampaignTypeBadge(campaign.campaign_type).text}
                                                                </span>
                                                                <span className={`objective-pill ${getObjectiveBadge(campaign.objective).color}`}>
                                                                    {getObjectiveBadge(campaign.objective).icon}
                                                                    {getObjectiveBadge(campaign.objective).text}
                                                                </span>
                                                            </div>
                                                            <div className="status-dates">
                                                                <div className="status-date">
                                                                    <Calendar size={12} />
                                                                    <span>Start: {new Date(campaign.start_date).toLocaleDateString()}</span>
                                                                </div>
                                                                <div className="status-date">
                                                                    <Calendar size={12} />
                                                                    <span>End: {campaign.end_date ? new Date(campaign.end_date).toLocaleDateString() : 'Ongoing'}</span>
                                                                </div>
                                                            </div>
                                                            <div className="campaign-stats">
                                                                <span className="groups-count">{campaign.groups_count} groups</span>
                                                                <span className="creatives-count">{campaign.creatives_count} creatives</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="budget-info">
                                                            <div className="budget-metrics">
                                                                <div className="metric-item">
                                                                    <DollarSign size={14} />
                                                                    <div>
                                                                        <strong>{formatCurrency(campaign.daily_budget, campaign.budget.currency)}</strong>
                                                                        <small>Daily Budget</small>
                                                                    </div>
                                                                </div>
                                                                {campaign.lifetime_budget && (
                                                                    <div className="metric-item">
                                                                        <DollarSign size={14} />
                                                                        <div>
                                                                            <strong>{formatCurrency(campaign.lifetime_budget, campaign.budget.currency)}</strong>
                                                                            <small>Lifetime Budget</small>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                <div className="metric-item">
                                                                    <DollarSign size={14} />
                                                                    <div>
                                                                        <strong>{formatCurrency(campaign.total_spend, campaign.budget.currency)}</strong>
                                                                        <small>Total Spend</small>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="budget-utilization">
                                                                <div className="utilization-bar">
                                                                    <div
                                                                        className="utilization-fill"
                                                                        style={{ width: `${campaign.budget.budget_utilization * 100}%` }}
                                                                    ></div>
                                                                </div>
                                                                <span className="utilization-text">
                                                                    {formatPercentage(campaign.budget.budget_utilization)} used
                                                                </span>
                                                            </div>
                                                            <div className="budget-actions">
                                                                <span className="bidding-strategy">{campaign.bidding_strategy}</span>
                                                                {campaign.target_roas && (
                                                                    <span className="target-roas">ROAS: {campaign.target_roas}x</span>
                                                                )}
                                                                {campaign.target_cpa && (
                                                                    <span className="target-cpa">CPA: {formatCurrency(campaign.target_cpa, campaign.budget.currency)}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="performance-info">
                                                            <div className="performance-metrics">
                                                                <div className="metric-item">
                                                                    <Eye size={14} />
                                                                    <div>
                                                                        <strong>{campaign.total_impressions.toLocaleString()}</strong>
                                                                        <small>Impressions</small>
                                                                    </div>
                                                                </div>
                                                                <div className="metric-item">
                                                                    <Users size={14} />
                                                                    <div>
                                                                        <strong>{campaign.total_clicks.toLocaleString()}</strong>
                                                                        <small>Clicks</small>
                                                                    </div>
                                                                </div>
                                                                <div className="metric-item">
                                                                    <TrendingUp size={14} />
                                                                    <div>
                                                                        <strong>{campaign.total_conversions}</strong>
                                                                        <small>Conversions</small>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="performance-rates">
                                                                <div className="rate-item">
                                                                    <span className="rate-label">CTR:</span>
                                                                    <span className="rate-value">{formatPercentage(campaign.ctr)}</span>
                                                                </div>
                                                                <div className="rate-item">
                                                                    <span className="rate-label">CPM:</span>
                                                                    <span className="rate-value">{formatCurrency(campaign.cpm, campaign.budget.currency)}</span>
                                                                </div>
                                                                <div className="rate-item">
                                                                    <span className="rate-label">CPC:</span>
                                                                    <span className="rate-value">{formatCurrency(campaign.cpc, campaign.budget.currency)}</span>
                                                                </div>
                                                                <div className="rate-item">
                                                                    <span className="rate-label">ROAS:</span>
                                                                    <span className="rate-value">{campaign.roas.toFixed(1)}x</span>
                                                                </div>
                                                            </div>
                                                            <div className="quality-scores">
                                                                <div className="score-item">
                                                                    <span className="score-label">Quality Score:</span>
                                                                    <span className="score-value">{campaign.quality_score.toFixed(1)}/10</span>
                                                                </div>
                                                                <div className="score-item">
                                                                    <span className="score-label">Performance Score:</span>
                                                                    <span className="score-value">{campaign.performance_score.toFixed(1)}/100</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="targeting-info">
                                                            <div className="targeting-metrics">
                                                                <div className="metric-item">
                                                                    <Target size={14} />
                                                                    <div>
                                                                        <strong>{campaign.optimization_goal}</strong>
                                                                        <small>Optimization Goal</small>
                                                                    </div>
                                                                </div>
                                                                <div className="metric-item">
                                                                    <Shield size={14} />
                                                                    <div>
                                                                        <strong>{campaign.attribution_model}</strong>
                                                                        <small>Attribution Model</small>
                                                                    </div>
                                                                </div>
                                                                <div className="metric-item">
                                                                    <Globe size={14} />
                                                                    <div>
                                                                        <strong>{campaign.frequency_capping?.impressions || 0}</strong>
                                                                        <small>Frequency Cap</small>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="targeting-actions">
                                                                <span className="tracking-pixel">Pixel: {campaign.tracking_pixel_id}</span>
                                                                <span className="conversion-actions">
                                                                    Conversions: {campaign.conversion_actions?.join(', ') || 'None'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="action-buttons">
                                                            <button
                                                                className="action-btn view"
                                                                onClick={() => window.open(`/campaign/${campaign.id}`, '_blank')}
                                                                title="View Campaign"
                                                            >
                                                                <Eye size={16} />
                                                            </button>
                                                            <button
                                                                className="action-btn edit"
                                                                onClick={() => handleEditCampaign(campaign)}
                                                                title="Edit Campaign"
                                                            >
                                                                <Edit size={16} />
                                                            </button>
                                                            <button
                                                                className="action-btn duplicate"
                                                                onClick={() => {
                                                                    const newCampaign = {
                                                                        ...campaign,
                                                                        id: `campaign_${Date.now()}`,
                                                                        name: `${campaign.name} - Copy`,
                                                                        created_at: new Date().toISOString(),
                                                                        updated_at: new Date().toISOString(),
                                                                        status: 'draft'
                                                                    };
                                                                    setCampaigns(prev => [...prev, newCampaign]);
                                                                    showToast('Campaign duplicated', 'success');
                                                                }}
                                                                title="Duplicate Campaign"
                                                            >
                                                                <Copy size={16} />
                                                            </button>
                                                            <button
                                                                className="action-btn delete"
                                                                onClick={() => handleDeleteCampaign(campaign.id)}
                                                                title="Delete Campaign"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                </>
            )}

            {/* Ad Groups Tab */}
            {currentTab === 'ad_groups' && (
                <>
                    {/* Filters */}
                    <div className="filters-section">
                        <div className="search-filters">
                            <div className="search-box">
                                <Search size={20} className="search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search ad groups by name or campaign..."
                                    value={filters.search}
                                    onChange={(e) => handleFilterChange('search', e.target.value)}
                                />
                            </div>

                            <div className="filter-group">
                                <select
                                    value={filters.status}
                                    onChange={(e) => handleFilterChange('status', e.target.value)}
                                >
                                    <option value="all">All Status</option>
                                    <option value="active">Active</option>
                                    <option value="paused">Paused</option>
                                    <option value="draft">Draft</option>
                                </select>

                                <select
                                    value={filters.campaign_type}
                                    onChange={(e) => handleFilterChange('campaign_type', e.target.value)}
                                >
                                    <option value="all">All Campaigns</option>
                                    {campaigns.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>

                                <input
                                    type="number"
                                    placeholder="Min spend"
                                    value={filters.min_spend}
                                    onChange={(e) => handleFilterChange('min_spend', e.target.value)}
                                />

                                <input
                                    type="number"
                                    placeholder="Max spend"
                                    value={filters.max_spend}
                                    onChange={(e) => handleFilterChange('max_spend', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="filter-actions">
                            <button className="refresh-btn" onClick={() => { }}>
                                <RefreshCw size={18} />
                                Refresh
                            </button>
                        </div>
                    </div>

                    {/* Bulk Actions */}
                    {selectedAdGroups.length > 0 && (
                        <div className="bulk-actions">
                            <div className="selection-info">
                                {selectedAdGroups.length} ad groups selected
                            </div>
                            <div className="bulk-actions-controls">
                                <select
                                    value={bulkAction}
                                    onChange={(e) => setBulkAction(e.target.value)}
                                >
                                    <option value="">Bulk Actions</option>
                                    <option value="activate">Activate</option>
                                    <option value="pause">Pause</option>
                                    <option value="delete">Delete Groups</option>
                                    <option value="duplicate">Duplicate</option>
                                </select>
                                <button
                                    className="btn-primary"
                                    onClick={handleBulkAction}
                                    disabled={!bulkAction}
                                >
                                    Apply Action
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Ad Groups Table */}
                    <div className="ad-groups-table-container">
                        {isLoading ? (
                            <div className="loading-state">
                                <RefreshCw size={32} className="spin-anim" />
                                <p>Loading ad groups...</p>
                            </div>
                        ) : (
                            <>
                                <div className="table-header">
                                    <div className="select-all">
                                        <input
                                            type="checkbox"
                                            checked={selectedAdGroups.length === adGroups.length && adGroups.length > 0}
                                            onChange={selectAllAdGroups}
                                        />
                                        <span>Select All</span>
                                    </div>
                                    <div className="table-actions">
                                        <span className="ad-group-count">{adGroups.length} ad groups found</span>
                                        <button className="btn-primary" onClick={handleCreateAdGroup}>
                                            <Plus size={18} />
                                            Create Ad Group
                                        </button>
                                    </div>
                                </div>

                                <div className="table-responsive">
                                    <table className="admin-table">
                                        <thead>
                                            <tr>
                                                <th>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedAdGroups.length === adGroups.length && adGroups.length > 0}
                                                        onChange={selectAllAdGroups}
                                                    />
                                                </th>
                                                <th>Ad Group Info</th>
                                                <th>Status & Targeting</th>
                                                <th>Bid Strategy</th>
                                                <th>Performance</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {adGroups.map(group => (
                                                <tr key={group.id} className={group.status === 'paused' ? 'paused-ad-group' : group.status === 'draft' ? 'draft-ad-group' : ''}>
                                                    <td>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedAdGroups.includes(group.id)}
                                                            onChange={() => toggleAdGroupSelection(group.id)}
                                                        />
                                                    </td>
                                                    <td>
                                                        <div className="ad-group-info">
                                                            <div className="ad-group-header">
                                                                <strong>{group.name}</strong>
                                                                <span className="ad-group-id">ID: {group.id}</span>
                                                            </div>
                                                            <div className="campaign-reference">
                                                                <span className="campaign-label">Campaign:</span>
                                                                <span className="campaign-name">
                                                                    {campaigns.find(c => c.id === group.campaign_id)?.name || 'Unknown'}
                                                                </span>
                                                            </div>
                                                            <div className="ad-group-meta">
                                                                <span className="ad-group-created">Created: {new Date(group.created_at).toLocaleDateString()}</span>
                                                                <span className="ad-group-updated">Updated: {new Date(group.updated_at).toLocaleDateString()}</span>
                                                                <span className="creatives-count">{group.creatives_count} creatives</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="targeting-info">
                                                            <div className="status-badge">
                                                                <span className={`status-pill ${getStatusBadge(group.status).color}`}>
                                                                    {getStatusBadge(group.status).icon}
                                                                    {getStatusBadge(group.status).text}
                                                                </span>
                                                            </div>
                                                            <div className="targeting-details">
                                                                <div className="targeting-section">
                                                                    <span className="targeting-label">Locations:</span>
                                                                    <span className="targeting-values">
                                                                        {group.targeting.locations?.join(', ') || 'All'}
                                                                    </span>
                                                                </div>
                                                                <div className="targeting-section">
                                                                    <span className="targeting-label">Devices:</span>
                                                                    <span className="targeting-values">
                                                                        {group.targeting.devices?.join(', ') || 'All'}
                                                                    </span>
                                                                </div>
                                                                <div className="targeting-section">
                                                                    <span className="targeting-label">Interests:</span>
                                                                    <span className="targeting-values">
                                                                        {group.targeting.interests?.join(', ') || 'None'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="bid-info">
                                                            <div className="bid-metrics">
                                                                <div className="metric-item">
                                                                    <DollarSign size={14} />
                                                                    <div>
                                                                        <strong>{group.bid_strategy.bid_amount.toFixed(2)}</strong>
                                                                        <small>{group.bid_strategy.bid_type.toUpperCase()}</small>
                                                                    </div>
                                                                </div>
                                                                <div className="metric-item">
                                                                    <Settings size={14} />
                                                                    <div>
                                                                        <strong>{group.bid_strategy.bid_strategy}</strong>
                                                                        <small>Bid Strategy</small>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="bid-limits">
                                                                {group.bid_strategy.bid_ceiling && (
                                                                    <span className="bid-limit">Max: {group.bid_strategy.bid_ceiling}</span>
                                                                )}
                                                                {group.bid_strategy.bid_floor && (
                                                                    <span className="bid-limit">Min: {group.bid_strategy.bid_floor}</span>
                                                                )}
                                                            </div>
                                                            <div className="ad-rotation">
                                                                <span className="rotation-label">Rotation:</span>
                                                                <span className="rotation-value">{group.ad_rotation}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="performance-info">
                                                            <div className="performance-metrics">
                                                                <div className="metric-item">
                                                                    <Eye size={14} />
                                                                    <div>
                                                                        <strong>{group.total_impressions.toLocaleString()}</strong>
                                                                        <small>Impressions</small>
                                                                    </div>
                                                                </div>
                                                                <div className="metric-item">
                                                                    <Users size={14} />
                                                                    <div>
                                                                        <strong>{group.total_clicks.toLocaleString()}</strong>
                                                                        <small>Clicks</small>
                                                                    </div>
                                                                </div>
                                                                <div className="metric-item">
                                                                    <DollarSign size={14} />
                                                                    <div>
                                                                        <strong>{formatCurrency(group.total_spend, 'USD')}</strong>
                                                                        <small>Spend</small>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="performance-rates">
                                                                <div className="rate-item">
                                                                    <span className="rate-label">CTR:</span>
                                                                    <span className="rate-value">{formatPercentage(group.ctr)}</span>
                                                                </div>
                                                                <div className="rate-item">
                                                                    <span className="rate-label">CPM:</span>
                                                                    <span className="rate-value">{formatCurrency(group.cpm, 'USD')}</span>
                                                                </div>
                                                                <div className="rate-item">
                                                                    <span className="rate-label">CPC:</span>
                                                                    <span className="rate-value">{formatCurrency(group.cpc, 'USD')}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="action-buttons">
                                                            <button
                                                                className="action-btn edit"
                                                                onClick={() => handleEditAdGroup(group)}
                                                                title="Edit Ad Group"
                                                            >
                                                                <Edit size={16} />
                                                            </button>
                                                            <button
                                                                className="action-btn duplicate"
                                                                onClick={() => {
                                                                    const newGroup = {
                                                                        ...group,
                                                                        id: `group_${Date.now()}`,
                                                                        name: `${group.name} - Copy`,
                                                                        created_at: new Date().toISOString(),
                                                                        updated_at: new Date().toISOString(),
                                                                        status: 'draft'
                                                                    };
                                                                    setAdGroups(prev => [...prev, newGroup]);
                                                                    showToast('Ad group duplicated', 'success');
                                                                }}
                                                                title="Duplicate Ad Group"
                                                            >
                                                                <Copy size={16} />
                                                            </button>
                                                            <button
                                                                className="action-btn delete"
                                                                onClick={() => handleDeleteAdGroup(group.id)}
                                                                title="Delete Ad Group"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                </>
            )}

            {/* Creatives Tab */}
            {currentTab === 'creatives' && (
                <>
                    {/* Filters */}
                    <div className="filters-section">
                        <div className="search-filters">
                            <div className="search-box">
                                <Search size={20} className="search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search creatives by name, type, or ad group..."
                                    value={filters.search}
                                    onChange={(e) => handleFilterChange('search', e.target.value)}
                                />
                            </div>

                            <div className="filter-group">
                                <select
                                    value={filters.status}
                                    onChange={(e) => handleFilterChange('status', e.target.value)}
                                >
                                    <option value="all">All Status</option>
                                    <option value="active">Active</option>
                                    <option value="paused">Paused</option>
                                    <option value="draft">Draft</option>
                                </select>

                                <select
                                    value={filters.creative_type}
                                    onChange={(e) => handleFilterChange('creative_type', e.target.value)}
                                >
                                    <option value="all">All Types</option>
                                    <option value="image">Image</option>
                                    <option value="video">Video</option>
                                    <option value="carousel">Carousel</option>
                                    <option value="collection">Collection</option>
                                </select>

                                <input
                                    type="number"
                                    placeholder="Min impressions"
                                    value={filters.min_impressions}
                                    onChange={(e) => handleFilterChange('min_impressions', e.target.value)}
                                />

                                <input
                                    type="number"
                                    placeholder="Min CTR"
                                    value={filters.min_ctr}
                                    onChange={(e) => handleFilterChange('min_ctr', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="filter-actions">
                            <button className="refresh-btn" onClick={() => { }}>
                                <RefreshCw size={18} />
                                Refresh
                            </button>
                        </div>
                    </div>

                    {/* Bulk Actions */}
                    {selectedCreatives.length > 0 && (
                        <div className="bulk-actions">
                            <div className="selection-info">
                                {selectedCreatives.length} creatives selected
                            </div>
                            <div className="bulk-actions-controls">
                                <select
                                    value={bulkAction}
                                    onChange={(e) => setBulkAction(e.target.value)}
                                >
                                    <option value="">Bulk Actions</option>
                                    <option value="activate">Activate</option>
                                    <option value="pause">Pause</option>
                                    <option value="delete">Delete Creatives</option>
                                    <option value="duplicate">Duplicate</option>
                                </select>
                                <button
                                    className="btn-primary"
                                    onClick={handleBulkAction}
                                    disabled={!bulkAction}
                                >
                                    Apply Action
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Creatives Table */}
                    <div className="creatives-table-container">
                        {isLoading ? (
                            <div className="loading-state">
                                <RefreshCw size={32} className="spin-anim" />
                                <p>Loading creatives...</p>
                            </div>
                        ) : (
                            <>
                                <div className="table-header">
                                    <div className="select-all">
                                        <input
                                            type="checkbox"
                                            checked={selectedCreatives.length === adCreatives.length && adCreatives.length > 0}
                                            onChange={selectAllCreatives}
                                        />
                                        <span>Select All</span>
                                    </div>
                                    <div className="table-actions">
                                        <span className="creative-count">{adCreatives.length} creatives found</span>
                                        <button className="btn-primary" onClick={handleCreateCreative}>
                                            <Plus size={18} />
                                            Create Creative
                                        </button>
                                    </div>
                                </div>

                                <div className="table-responsive">
                                    <table className="admin-table">
                                        <thead>
                                            <tr>
                                                <th>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedCreatives.length === adCreatives.length && adCreatives.length > 0}
                                                        onChange={selectAllCreatives}
                                                    />
                                                </th>
                                                <th>Creative Content</th>
                                                <th>Status & Type</th>
                                                <th>Performance</th>
                                                <th>Quality Scores</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {adCreatives.map(creative => (
                                                <tr key={creative.id} className={creative.status === 'paused' ? 'paused-creative' : creative.status === 'draft' ? 'draft-creative' : ''}>
                                                    <td>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedCreatives.includes(creative.id)}
                                                            onChange={() => toggleCreativeSelection(creative.id)}
                                                        />
                                                    </td>
                                                    <td>
                                                        <div className="creative-content">
                                                            <div className="creative-media-preview">
                                                                {creative.creative_type === 'image' ? (
                                                                    <img src={creative.assets[0]?.asset_url} alt="Creative Preview" className="creative-thumbnail" />
                                                                ) : (
                                                                    <video src={creative.assets[0]?.asset_url} className="creative-thumbnail" />
                                                                )}
                                                                <div className="creative-type-overlay">
                                                                    {creative.creative_type === 'image' ? (
                                                                        <Image size={16} />
                                                                    ) : (
                                                                        <Video size={16} />
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="creative-info">
                                                                <div className="creative-header">
                                                                    <strong>{creative.name}</strong>
                                                                    <span className="creative-id">ID: {creative.id}</span>
                                                                </div>
                                                                <div className="creative-text">
                                                                    <div className="creative-headline">{creative.headline}</div>
                                                                    <div className="creative-description">{creative.description}</div>
                                                                    <div className="creative-cta">{creative.call_to_action}</div>
                                                                </div>
                                                                <div className="creative-meta">
                                                                    <span className="creative-url">{creative.display_url}</span>
                                                                    <span className="creative-final-url">{creative.final_url}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="status-info">
                                                            <div className="status-badge">
                                                                <span className={`status-pill ${getStatusBadge(creative.status).color}`}>
                                                                    {getStatusBadge(creative.status).icon}
                                                                    {getStatusBadge(creative.status).text}
                                                                </span>
                                                                <span className={`creative-type-pill ${creative.creative_type === 'image' ? 'green' : 'purple'}`}>
                                                                    {creative.creative_type === 'image' ? <Image size={12} /> : <Video size={12} />}
                                                                    {creative.creative_type.toUpperCase()}
                                                                </span>
                                                            </div>
                                                            <div className="creative-stats">
                                                                <span className="ad-group-reference">
                                                                    Ad Group: {adGroups.find(g => g.id === creative.ad_group_id)?.name || 'Unknown'}
                                                                </span>
                                                                <span className="creative-variants">
                                                                    Variants: {creative.variants?.length || 0}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="performance-info">
                                                            <div className="performance-metrics">
                                                                <div className="metric-item">
                                                                    <Eye size={14} />
                                                                    <div>
                                                                        <strong>{creative.impressions.toLocaleString()}</strong>
                                                                        <small>Impressions</small>
                                                                    </div>
                                                                </div>
                                                                <div className="metric-item">
                                                                    <Users size={14} />
                                                                    <div>
                                                                        <strong>{creative.clicks.toLocaleString()}</strong>
                                                                        <small>Clicks</small>
                                                                    </div>
                                                                </div>
                                                                <div className="metric-item">
                                                                    <TrendingUp size={14} />
                                                                    <div>
                                                                        <strong>{creative.conversions}</strong>
                                                                        <small>Conversions</small>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="performance-rates">
                                                                <div className="rate-item">
                                                                    <span className="rate-label">CTR:</span>
                                                                    <span className="rate-value">{formatPercentage(creative.ctr)}</span>
                                                                </div>
                                                                <div className="rate-item">
                                                                    <span className="rate-label">CPM:</span>
                                                                    <span className="rate-value">{formatCurrency(creative.cpm, 'USD')}</span>
                                                                </div>
                                                                <div className="rate-item">
                                                                    <span className="rate-label">CPC:</span>
                                                                    <span className="rate-value">{formatCurrency(creative.cpc, 'USD')}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="quality-info">
                                                            <div className="quality-metrics">
                                                                <div className="metric-item">
                                                                    <span className="quality-label">Quality Score:</span>
                                                                    <span className="quality-value">{creative.quality_score.toFixed(1)}/10</span>
                                                                </div>
                                                                <div className="metric-item">
                                                                    <span className="quality-label">Relevance Score:</span>
                                                                    <span className="quality-value">{creative.relevance_score.toFixed(1)}/10</span>
                                                                </div>
                                                                <div className="metric-item">
                                                                    <span className="quality-label">Landing Page Score:</span>
                                                                    <span className="quality-value">{creative.landing_page_score.toFixed(1)}/10</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="action-buttons">
                                                            <button
                                                                className="action-btn view"
                                                                onClick={() => window.open(creative.final_url, '_blank')}
                                                                title="Preview Creative"
                                                            >
                                                                <Eye size={16} />
                                                            </button>
                                                            <button
                                                                className="action-btn edit"
                                                                onClick={() => handleEditCreative(creative)}
                                                                title="Edit Creative"
                                                            >
                                                                <Edit size={16} />
                                                            </button>
                                                            <button
                                                                className="action-btn duplicate"
                                                                onClick={() => {
                                                                    const newCreative = {
                                                                        ...creative,
                                                                        id: `creative_${Date.now()}`,
                                                                        name: `${creative.name} - Copy`,
                                                                        created_at: new Date().toISOString(),
                                                                        updated_at: new Date().toISOString(),
                                                                        status: 'draft'
                                                                    };
                                                                    setAdCreatives(prev => [...prev, newCreative]);
                                                                    showToast('Creative duplicated', 'success');
                                                                }}
                                                                title="Duplicate Creative"
                                                            >
                                                                <Copy size={16} />
                                                            </button>
                                                            <button
                                                                className="action-btn delete"
                                                                onClick={() => handleDeleteCreative(creative.id)}
                                                                title="Delete Creative"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                </>
            )}

            {/* Performance Tab */}
            {currentTab === 'performance' && (
                <div className="performance-tab">
                    <div className="performance-header">
                        <h3>Advertising Performance Analytics</h3>
                        <div className="performance-actions">
                            <button className="btn-secondary">
                                <Download size={18} />
                                Export Performance Data
                            </button>
                            <button className="btn-primary">
                                <BarChart3 size={18} />
                                Generate Performance Report
                            </button>
                        </div>
                    </div>

                    <div className="performance-metrics-grid">
                        <div className="metric-card">
                            <div className="metric-icon">
                                <DollarSign size={24} />
                            </div>
                            <div className="metric-content">
                                <div className="metric-value">
                                    {formatCurrency(mockPerformanceData.reduce((sum, p) => sum + p.spend, 0), 'USD')}
                                </div>
                                <div className="metric-label">Total Spend</div>
                            </div>
                        </div>

                        <div className="metric-card">
                            <div className="metric-icon">
                                <Eye size={24} />
                            </div>
                            <div className="metric-content">
                                <div className="metric-value">
                                    {mockPerformanceData.reduce((sum, p) => sum + p.impressions, 0).toLocaleString()}
                                </div>
                                <div className="metric-label">Total Impressions</div>
                            </div>
                        </div>

                        <div className="metric-card">
                            <div className="metric-icon">
                                <Users size={24} />
                            </div>
                            <div className="metric-content">
                                <div className="metric-value">
                                    {mockPerformanceData.reduce((sum, p) => sum + p.clicks, 0).toLocaleString()}
                                </div>
                                <div className="metric-label">Total Clicks</div>
                            </div>
                        </div>

                        <div className="metric-card">
                            <div className="metric-icon">
                                <TrendingUp size={24} />
                            </div>
                            <div className="metric-content">
                                <div className="metric-value">
                                    {mockPerformanceData.reduce((sum, p) => sum + p.conversions, 0)}
                                </div>
                                <div className="metric-label">Total Conversions</div>
                            </div>
                        </div>

                        <div className="metric-card">
                            <div className="metric-icon">
                                <BarChart3 size={24} />
                            </div>
                            <div className="metric-content">
                                <div className="metric-value">
                                    {formatPercentage(mockPerformanceData.reduce((sum, p) => sum + p.ctr, 0) / mockPerformanceData.length)}
                                </div>
                                <div className="metric-label">Average CTR</div>
                            </div>
                        </div>

                        <div className="metric-card">
                            <div className="metric-icon">
                                <Target size={24} />
                            </div>
                            <div className="metric-content">
                                <div className="metric-value">
                                    {(mockPerformanceData.reduce((sum, p) => sum + p.roas, 0) / mockPerformanceData.length).toFixed(1)}x
                                </div>
                                <div className="metric-label">Average ROAS</div>
                            </div>
                        </div>
                    </div>

                    <div className="performance-table-container">
                        <div className="table-header">
                            <h4>Campaign Performance Overview</h4>
                            <span className="performance-count">{mockPerformanceData.length} campaigns</span>
                        </div>

                        <div className="table-responsive">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Campaign</th>
                                        <th>Impressions</th>
                                        <th>Clicks</th>
                                        <th>Conversions</th>
                                        <th>Spend</th>
                                        <th>CTR</th>
                                        <th>CPM</th>
                                        <th>CPC</th>
                                        <th>ROAS</th>
                                        <th>Quality Score</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mockPerformanceData.map(data => {
                                        const campaign = campaigns.find(c => c.id === data.campaign_id);
                                        return (
                                            <tr key={data.campaign_id}>
                                                <td>
                                                    <div className="campaign-name">
                                                        <strong>{campaign?.name || 'Unknown Campaign'}</strong>
                                                        <span className="campaign-date">{new Date(data.date).toLocaleDateString()}</span>
                                                    </div>
                                                </td>
                                                <td>{data.impressions.toLocaleString()}</td>
                                                <td>{data.clicks.toLocaleString()}</td>
                                                <td>{data.conversions}</td>
                                                <td>{formatCurrency(data.spend, 'USD')}</td>
                                                <td>{formatPercentage(data.ctr)}</td>
                                                <td>{formatCurrency(data.cpm, 'USD')}</td>
                                                <td>{formatCurrency(data.cpc, 'USD')}</td>
                                                <td>{data.roas.toFixed(1)}x</td>
                                                <td>{data.quality_score.toFixed(1)}/10</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Campaign Modal */}
            {showCampaignModal && editingCampaign && (
                <div className="modal-overlay" onClick={() => setShowCampaignModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
                        <div className="modal-header">
                            <h3>{editingCampaign.id ? 'Edit Campaign' : 'Create New Campaign'}</h3>
                            <button className="close-btn" onClick={() => setShowCampaignModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Campaign Name</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={editingCampaign.name}
                                        onChange={(e) => setEditingCampaign({ ...editingCampaign, name: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Status</label>
                                    <select
                                        className="form-input"
                                        value={editingCampaign.status}
                                        onChange={(e) => setEditingCampaign({ ...editingCampaign, status: e.target.value })}
                                    >
                                        <option value="active">Active</option>
                                        <option value="paused">Paused</option>
                                        <option value="draft">Draft</option>
                                        <option value="archived">Archived</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Daily Budget</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={editingCampaign.daily_budget}
                                        onChange={(e) => setEditingCampaign({ ...editingCampaign, daily_budget: parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Lifetime Budget (Optional)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={editingCampaign.lifetime_budget || ''}
                                        onChange={(e) => setEditingCampaign({ ...editingCampaign, lifetime_budget: e.target.value ? parseFloat(e.target.value) : null })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Campaign Type</label>
                                    <select
                                        className="form-input"
                                        value={editingCampaign.campaign_type}
                                        onChange={(e) => setEditingCampaign({ ...editingCampaign, campaign_type: e.target.value })}
                                    >
                                        <option value="search">Search</option>
                                        <option value="display">Display</option>
                                        <option value="video">Video</option>
                                        <option value="shopping">Shopping</option>
                                        <option value="app">App</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Objective</label>
                                    <select
                                        className="form-input"
                                        value={editingCampaign.objective}
                                        onChange={(e) => setEditingCampaign({ ...editingCampaign, objective: e.target.value })}
                                    >
                                        <option value="brand_awareness">Brand Awareness</option>
                                        <option value="traffic">Traffic</option>
                                        <option value="engagement">Engagement</option>
                                        <option value="leads">Leads</option>
                                        <option value="conversions">Conversions</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Optimization Goal</label>
                                    <select
                                        className="form-input"
                                        value={editingCampaign.optimization_goal}
                                        onChange={(e) => setEditingCampaign({ ...editingCampaign, optimization_goal: e.target.value })}
                                    >
                                        <option value="clicks">Clicks</option>
                                        <option value="conversions">Conversions</option>
                                        <option value="impressions">Impressions</option>
                                        <option value="reach">Reach</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Bidding Strategy</label>
                                    <select
                                        className="form-input"
                                        value={editingCampaign.bidding_strategy}
                                        onChange={(e) => setEditingCampaign({ ...editingCampaign, bidding_strategy: e.target.value })}
                                    >
                                        <option value="manual_cpc">Manual CPC</option>
                                        <option value="automatic_cpc">Automatic CPC</option>
                                        <option value="cpm">CPM</option>
                                        <option value="cpa">CPA</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    className="form-input"
                                    rows="4"
                                    value={editingCampaign.description}
                                    onChange={(e) => setEditingCampaign({ ...editingCampaign, description: e.target.value })}
                                ></textarea>
                            </div>

                            <div className="form-group">
                                <label>Start Date</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={editingCampaign.start_date}
                                    onChange={(e) => setEditingCampaign({ ...editingCampaign, start_date: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label>End Date (Optional)</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={editingCampaign.end_date || ''}
                                    onChange={(e) => setEditingCampaign({ ...editingCampaign, end_date: e.target.value || null })}
                                />
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button type="button" className="btn-secondary" onClick={() => setShowCampaignModal(false)}>
                                Cancel
                            </button>
                            <button type="button" className="btn-primary" onClick={() => {
                                if (editingCampaign.id) {
                                    setCampaigns(prev => prev.map(c => c.id === editingCampaign.id ? editingCampaign : c));
                                } else {
                                    const newCampaign = {
                                        ...editingCampaign,
                                        id: `campaign_${Date.now()}`,
                                        created_at: new Date().toISOString(),
                                        updated_at: new Date().toISOString(),
                                        budget: {
                                            daily_budget: editingCampaign.daily_budget,
                                            lifetime_budget: editingCampaign.lifetime_budget,
                                            budget_type: editingCampaign.lifetime_budget ? 'lifetime' : 'daily',
                                            budget_delivery: 'standard',
                                            currency: 'USD',
                                            spent_today: 0,
                                            spent_lifetime: 0,
                                            remaining_daily: editingCampaign.daily_budget,
                                            remaining_lifetime: editingCampaign.lifetime_budget,
                                            budget_utilization: 0
                                        },
                                        groups_count: 0,
                                        creatives_count: 0,
                                        total_spend: 0,
                                        total_impressions: 0,
                                        total_clicks: 0,
                                        total_conversions: 0,
                                        ctr: 0,
                                        cpm: 0,
                                        cpc: 0,
                                        roas: 0,
                                        conversion_rate: 0,
                                        quality_score: 0,
                                        ad_rank: 0,
                                        performance_score: 0,
                                        last_updated: new Date().toISOString()
                                    };
                                    setCampaigns(prev => [...prev, newCampaign]);
                                }
                                setShowCampaignModal(false);
                                setEditingCampaign(null);
                                showToast('Campaign saved successfully', 'success');
                            }}>
                                Save Campaign
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Performance Modal */}
            {showPerformanceModal && (
                <div className="modal-overlay" onClick={() => setShowPerformanceModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '1200px' }}>
                        <div className="modal-header">
                            <h3>Campaign Analytics Dashboard</h3>
                            <button className="close-btn" onClick={() => setShowPerformanceModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="analytics-grid">
                                {/* Analytics content would go here */}
                                <div className="analytics-placeholder">
                                    <BarChart3 size={48} />
                                    <p>Advanced analytics dashboard coming soon</p>
                                    <p>Includes charts, graphs, and detailed performance metrics</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Reports Modal */}
            {showReportsModal && (
                <div className="modal-overlay" onClick={() => setShowReportsModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '1000px' }}>
                        <div className="modal-header">
                            <h3>Advertising Reports</h3>
                            <button className="close-btn" onClick={() => setShowReportsModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="reports-list">
                                {mockReports.map(report => (
                                    <div key={report.id} className="report-item">
                                        <div className="report-header">
                                            <div className="report-info">
                                                <strong>{report.report_type.replace('_', ' ').toUpperCase()}</strong>
                                                <span className="report-date">Generated: {new Date(report.generated_at).toLocaleString()}</span>
                                                <span className="report-by">By: {report.generated_by}</span>
                                            </div>
                                            <div className="report-actions">
                                                <button className="report-action-btn">
                                                    <Download size={16} />
                                                    Download
                                                </button>
                                                <button className="report-action-btn">
                                                    <Eye size={16} />
                                                    View Details
                                                </button>
                                            </div>
                                        </div>

                                        <div className="report-meta">
                                            <span className="report-range">Date Range: {report.date_range}</span>
                                            <span className="report-currency">Currency: {report.currency}</span>
                                            <span className="report-campaigns">Campaigns: {report.campaigns?.length || report.ad_groups?.length || 0}</span>
                                        </div>

                                        <div className="report-summary">
                                            <div className="summary-metrics">
                                                <div className="metric-item">
                                                    <DollarSign size={16} />
                                                    <span>{formatCurrency(report.total_spend, report.currency)}</span>
                                                    <small>Total Spend</small>
                                                </div>
                                                <div className="metric-item">
                                                    <Eye size={16} />
                                                    <span>{report.total_impressions.toLocaleString()}</span>
                                                    <small>Impressions</small>
                                                </div>
                                                <div className="metric-item">
                                                    <Users size={16} />
                                                    <span>{report.total_clicks.toLocaleString()}</span>
                                                    <small>Clicks</small>
                                                </div>
                                                <div className="metric-item">
                                                    <TrendingUp size={16} />
                                                    <span>{report.total_conversions}</span>
                                                    <small>Conversions</small>
                                                </div>
                                            </div>

                                            <div className="summary-rates">
                                                <div className="rate-item">
                                                    <span className="rate-label">CTR:</span>
                                                    <span className="rate-value">{formatPercentage(report.overall_ctr)}</span>
                                                </div>
                                                <div className="rate-item">
                                                    <span className="rate-label">CPM:</span>
                                                    <span className="rate-value">{formatCurrency(report.overall_cpm, report.currency)}</span>
                                                </div>
                                                <div className="rate-item">
                                                    <span className="rate-label">CPC:</span>
                                                    <span className="rate-value">{formatCurrency(report.overall_cpc, report.currency)}</span>
                                                </div>
                                                {report.overall_roas && (
                                                    <div className="rate-item">
                                                        <span className="rate-label">ROAS:</span>
                                                        <span className="rate-value">{report.overall_roas.toFixed(1)}x</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="reports-actions">
                                <button className="btn-secondary">Generate Custom Report</button>
                                <button className="btn-primary">Schedule Report</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdManagementTab;