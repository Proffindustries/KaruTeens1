import React, { useState, useEffect, useRef } from 'react';
import {
    Image, File, FileText, FileAudio, FileVideo, FileImage, FileArchive, FileCode, FileSpreadsheet,
    Upload, Download, Trash2, Edit, Eye, EyeOff, RefreshCw, Settings, Globe, Shield, Users,
    TrendingUp, BarChart3, Filter, Search, Plus, Copy, Share2, FileCheck, AlertTriangle,
    CheckCircle, XCircle, Clock, FileClock, FileCog, FileDiff,
    FileMinus, FilePlus, FileSearch, FileStack, FileWarning, FileX, FileSymlink,
    HardDrive, Database, Cloud, Server, Zap, Wifi, WifiOff,
    Battery, BatteryCharging, BatteryFull, BatteryLow, BatteryMedium, BatteryWarning,
    Network
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

const MediaManagementTab = () => {
    const [mediaFiles, setMediaFiles] = useState([]);
    const [storageStats, setStorageStats] = useState({});
    const [optimizationJobs, setOptimizationJobs] = useState([]);
    const [cdnStatus, setCDNStatus] = useState({});
    const [filters, setFilters] = useState({
        type: 'all',
        status: 'all',
        size_min: '',
        size_max: '',
        upload_date_start: '',
        upload_date_end: '',
        storage_location: 'all',
        optimization_status: 'all',
        sort_by: 'upload_date',
        sort_order: 'desc'
    });

    const [selectedFiles, setSelectedFiles] = useState([]);
    const [bulkAction, setBulkAction] = useState('');
    const [showOptimizationModal, setShowOptimizationModal] = useState(false);
    const [showStorageModal, setShowStorageModal] = useState(false);
    const [showCDNModal, setShowCDNModal] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [editingFile, setEditingFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [currentTab, setCurrentTab] = useState('files');

    const fileInputRef = useRef(null);
    const { showToast } = useToast();

    // Mock data for media files
    const mockMediaFiles = [
        {
            id: 'media_001',
            filename: 'product_demo.mp4',
            original_filename: 'product_demo_original.mp4',
            file_size: 157286400, // 150MB
            optimized_size: 120000000, // 114MB
            size_reduction: 23.7,
            file_type: 'video',
            mime_type: 'video/mp4',
            dimensions: '1920x1080',
            duration: 180,
            upload_date: '2024-06-15T10:00:00Z',
            storage_location: 'primary',
            optimization_status: 'optimized',
            optimization_date: '2024-06-15T10:05:00Z',
            cdn_status: 'synced',
            cdn_url: 'https://cdn.example.com/videos/product_demo.mp4',
            backup_status: 'completed',
            backup_location: 'backup_storage_01',
            metadata: {
                camera: 'Canon EOS R5',
                lens: '24-70mm f/2.8',
                location: 'Studio A',
                director: 'John Doe',
                producer: 'Jane Smith'
            },
            tags: ['product', 'demo', 'marketing'],
            categories: ['marketing', 'product'],
            views: 1250,
            downloads: 45,
            shares: 23,
            created_at: '2024-06-15T10:00:00Z',
            updated_at: '2024-06-15T10:05:00Z'
        },
        {
            id: 'media_002',
            filename: 'tutorial_beginner.jpg',
            original_filename: 'tutorial_beginner_original.jpg',
            file_size: 8388608, // 8MB
            optimized_size: 5242880, // 5MB
            size_reduction: 37.5,
            file_type: 'image',
            mime_type: 'image/jpeg',
            dimensions: '4000x3000',
            duration: null,
            upload_date: '2024-06-16T14:30:00Z',
            storage_location: 'primary',
            optimization_status: 'optimized',
            optimization_date: '2024-06-16T14:35:00Z',
            cdn_status: 'synced',
            cdn_url: 'https://cdn.example.com/images/tutorial_beginner.jpg',
            backup_status: 'completed',
            backup_location: 'backup_storage_02',
            metadata: {
                camera: 'Nikon D850',
                lens: '50mm f/1.8',
                location: 'Outdoor',
                photographer: 'Sarah Johnson'
            },
            tags: ['tutorial', 'beginner', 'photography'],
            categories: ['education', 'tutorial'],
            views: 890,
            downloads: 23,
            shares: 8,
            created_at: '2024-06-16T14:30:00Z',
            updated_at: '2024-06-16T14:35:00Z'
        },
        {
            id: 'media_003',
            filename: 'background_music.mp3',
            original_filename: 'background_music_original.mp3',
            file_size: 20971520, // 20MB
            optimized_size: 15728640, // 15MB
            size_reduction: 25.0,
            file_type: 'audio',
            mime_type: 'audio/mpeg',
            dimensions: null,
            duration: 300,
            upload_date: '2024-06-17T09:15:00Z',
            storage_location: 'primary',
            optimization_status: 'pending',
            optimization_date: null,
            cdn_status: 'pending',
            cdn_url: null,
            backup_status: 'pending',
            backup_location: null,
            metadata: {
                artist: 'Unknown Artist',
                album: 'Background Music',
                genre: 'Ambient',
                bitrate: '320kbps'
            },
            tags: ['music', 'background', 'ambient'],
            categories: ['audio', 'music'],
            views: 0,
            downloads: 0,
            shares: 0,
            created_at: '2024-06-17T09:15:00Z',
            updated_at: '2024-06-17T09:15:00Z'
        },
        {
            id: 'media_004',
            filename: 'document_report.pdf',
            original_filename: 'document_report_original.pdf',
            file_size: 52428800, // 50MB
            optimized_size: 31457280, // 30MB
            size_reduction: 40.0,
            file_type: 'document',
            mime_type: 'application/pdf',
            dimensions: null,
            duration: null,
            upload_date: '2024-06-18T11:45:00Z',
            storage_location: 'archive',
            optimization_status: 'optimized',
            optimization_date: '2024-06-18T11:50:00Z',
            cdn_status: 'synced',
            cdn_url: 'https://cdn.example.com/documents/document_report.pdf',
            backup_status: 'completed',
            backup_location: 'backup_storage_03',
            metadata: {
                author: 'Report Author',
                title: 'Monthly Report',
                pages: 150,
                created_date: '2024-06-01'
            },
            tags: ['report', 'document', 'monthly'],
            categories: ['documents', 'reports'],
            views: 150,
            downloads: 75,
            shares: 12,
            created_at: '2024-06-18T11:45:00Z',
            updated_at: '2024-06-18T11:50:00Z'
        },
        {
            id: 'media_005',
            filename: 'presentation.pptx',
            original_filename: 'presentation_original.pptx',
            file_size: 104857600, // 100MB
            optimized_size: 73400320, // 70MB
            size_reduction: 30.0,
            file_type: 'document',
            mime_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            dimensions: null,
            duration: null,
            upload_date: '2024-06-19T16:20:00Z',
            storage_location: 'primary',
            optimization_status: 'in_progress',
            optimization_date: '2024-06-19T16:25:00Z',
            cdn_status: 'pending',
            cdn_url: null,
            backup_status: 'pending',
            backup_location: null,
            metadata: {
                author: 'Presentation Author',
                title: 'Business Presentation',
                slides: 50,
                created_date: '2024-06-15'
            },
            tags: ['presentation', 'business', 'slides'],
            categories: ['documents', 'presentations'],
            views: 0,
            downloads: 0,
            shares: 0,
            created_at: '2024-06-19T16:20:00Z',
            updated_at: '2024-06-19T16:25:00Z'
        }
    ];

    // Mock data for optimization jobs
    const mockOptimizationJobs = [
        {
            id: 'opt_job_001',
            media_id: 'media_001',
            media_filename: 'product_demo.mp4',
            job_type: 'video_optimization',
            status: 'completed',
            progress: 100,
            created_at: '2024-06-15T10:00:00Z',
            started_at: '2024-06-15T10:01:00Z',
            completed_at: '2024-06-15T10:05:00Z',
            duration: 240,
            original_size: 157286400,
            optimized_size: 120000000,
            size_reduction: 23.7,
            optimization_settings: {
                codec: 'h264',
                bitrate: '5000k',
                resolution: '1920x1080',
                frame_rate: 30
            },
            error_message: null,
            worker_node: 'opt-worker-01'
        },
        {
            id: 'opt_job_002',
            media_id: 'media_002',
            media_filename: 'tutorial_beginner.jpg',
            job_type: 'image_optimization',
            status: 'completed',
            progress: 100,
            created_at: '2024-06-16T14:30:00Z',
            started_at: '2024-06-16T14:31:00Z',
            completed_at: '2024-06-16T14:32:00Z',
            duration: 60,
            original_size: 8388608,
            optimized_size: 5242880,
            size_reduction: 37.5,
            optimization_settings: {
                format: 'webp',
                quality: 85,
                compression: 'lossy'
            },
            error_message: null,
            worker_node: 'opt-worker-02'
        },
        {
            id: 'opt_job_003',
            media_id: 'media_003',
            media_filename: 'background_music.mp3',
            job_type: 'audio_optimization',
            status: 'pending',
            progress: 0,
            created_at: '2024-06-17T09:15:00Z',
            started_at: null,
            completed_at: null,
            duration: null,
            original_size: 20971520,
            optimized_size: null,
            size_reduction: null,
            optimization_settings: {
                codec: 'aac',
                bitrate: '192kbps',
                sample_rate: 44100
            },
            error_message: null,
            worker_node: 'opt-worker-03'
        },
        {
            id: 'opt_job_004',
            media_id: 'media_004',
            media_filename: 'document_report.pdf',
            job_type: 'document_optimization',
            status: 'completed',
            progress: 100,
            created_at: '2024-06-18T11:45:00Z',
            started_at: '2024-06-18T11:46:00Z',
            completed_at: '2024-06-18T11:48:00Z',
            duration: 120,
            original_size: 52428800,
            optimized_size: 31457280,
            size_reduction: 40.0,
            optimization_settings: {
                compression: 'high',
                image_quality: 'medium',
                remove_metadata: true
            },
            error_message: null,
            worker_node: 'opt-worker-04'
        },
        {
            id: 'opt_job_005',
            media_id: 'media_005',
            media_filename: 'presentation.pptx',
            job_type: 'document_optimization',
            status: 'in_progress',
            progress: 60,
            created_at: '2024-06-19T16:20:00Z',
            started_at: '2024-06-19T16:21:00Z',
            completed_at: null,
            duration: null,
            original_size: 104857600,
            optimized_size: null,
            size_reduction: null,
            optimization_settings: {
                compression: 'high',
                image_quality: 'medium',
                remove_metadata: true
            },
            error_message: null,
            worker_node: 'opt-worker-05'
        }
    ];

    // Mock data for storage stats
    const mockStorageStats = {
        total_files: 15000,
        total_storage: 107374182400, // 100GB
        used_storage: 75161927680, // 70GB
        available_storage: 32212254720, // 30GB
        storage_utilization: 0.7,
        storage_locations: {
            primary: { capacity: 53687091200, used: 37580963840, utilization: 0.7 },
            archive: { capacity: 32212254720, used: 21474836480, utilization: 0.67 },
            backup: { capacity: 21474836480, used: 16106127360, utilization: 0.75 }
        },
        file_types: {
            video: { count: 2000, size: 53687091200 },
            image: { count: 8000, size: 21474836480 },
            audio: { count: 3000, size: 10737418240 },
            document: { count: 2000, size: 21474836480 }
        },
        optimization_stats: {
            total_optimized: 12000,
            optimization_rate: 0.8,
            avg_size_reduction: 35.2,
            total_space_saved: 26843545600, // 25GB
            avg_optimization_time: 45
        },
        cdn_stats: {
            total_files_synced: 14000,
            sync_rate: 0.93,
            avg_sync_time: 15,
            cdn_bandwidth_used: 536870912000, // 500GB
            cdn_cost_estimate: 1250.00
        }
    };

    // Mock data for CDN status
    const mockCDNStatus = {
        status: 'operational',
        nodes: [
            { id: 'cdn-node-01', region: 'us-east-1', status: 'active', latency: 25, capacity: 0.6 },
            { id: 'cdn-node-02', region: 'us-west-2', status: 'active', latency: 45, capacity: 0.4 },
            { id: 'cdn-node-03', region: 'eu-west-1', status: 'active', latency: 60, capacity: 0.7 },
            { id: 'cdn-node-04', region: 'ap-southeast-1', status: 'active', latency: 80, capacity: 0.5 },
            { id: 'cdn-node-05', region: 'sa-east-1', status: 'maintenance', latency: null, capacity: null }
        ],
        bandwidth_usage: {
            current: 10737418240, // 10GB
            limit: 107374182400, // 100GB
            percentage: 0.1
        },
        cache_stats: {
            hit_rate: 0.85,
            miss_rate: 0.15,
            total_requests: 1000000,
            cached_files: 50000
        }
    };

    useEffect(() => {
        setIsLoading(true);
        // Simulate API calls
        setTimeout(() => {
            setMediaFiles(mockMediaFiles);
            setOptimizationJobs(mockOptimizationJobs);
            setStorageStats(mockStorageStats);
            setCDNStatus(mockCDNStatus);
            setIsLoading(false);
        }, 1000);
    }, [filters]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleBulkAction = () => {
        if (selectedFiles.length === 0) {
            showToast('Please select files first', 'warning');
            return;
        }

        if (bulkAction === 'optimize') {
            const selectedFileObjects = mediaFiles.filter(f => selectedFiles.includes(f.id));
            selectedFileObjects.forEach(file => {
                // Simulate optimization job creation
                const newJob = {
                    id: `opt_job_${Date.now()}`,
                    media_id: file.id,
                    media_filename: file.filename,
                    job_type: `${file.file_type}_optimization`,
                    status: 'pending',
                    progress: 0,
                    created_at: new Date().toISOString(),
                    started_at: null,
                    completed_at: null,
                    duration: null,
                    original_size: file.file_size,
                    optimized_size: null,
                    size_reduction: null,
                    optimization_settings: {
                        codec: file.file_type === 'video' ? 'h264' : 'webp',
                        quality: 85,
                        compression: 'high'
                    },
                    error_message: null,
                    worker_node: `opt-worker-${Math.floor(Math.random() * 5) + 1}`
                };
                setOptimizationJobs(prev => [...prev, newJob]);
            });
            showToast(`${selectedFiles.length} files added to optimization queue`, 'success');
        } else if (bulkAction === 'delete') {
            if (confirm(`Delete ${selectedFiles.length} files? This action cannot be undone.`)) {
                setMediaFiles(prev => prev.filter(f => !selectedFiles.includes(f.id)));
                setSelectedFiles([]);
                showToast('Files deleted', 'success');
            }
        } else if (bulkAction === 'sync_cdn') {
            const selectedFileObjects = mediaFiles.filter(f => selectedFiles.includes(f.id));
            selectedFileObjects.forEach(file => {
                // Simulate CDN sync
                setMediaFiles(prev => prev.map(f =>
                    f.id === file.id
                        ? { ...f, cdn_status: 'syncing' }
                        : f
                ));
            });
            showToast(`${selectedFiles.length} files queued for CDN sync`, 'success');
        }
        setBulkAction('');
    };

    const handleUploadMedia = (files) => {
        Array.from(files).forEach(file => {
            const newMedia = {
                id: `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                filename: file.name,
                original_filename: file.name,
                file_size: file.size,
                optimized_size: file.size,
                size_reduction: 0,
                file_type: getFileType(file.type),
                mime_type: file.type,
                dimensions: null,
                duration: null,
                upload_date: new Date().toISOString(),
                storage_location: 'primary',
                optimization_status: 'pending',
                optimization_date: null,
                cdn_status: 'pending',
                cdn_url: null,
                backup_status: 'pending',
                backup_location: null,
                metadata: {},
                tags: [],
                categories: [],
                views: 0,
                downloads: 0,
                shares: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            setMediaFiles(prev => [...prev, newMedia]);

            // Simulate upload progress
            setTimeout(() => {
                setMediaFiles(prev => prev.map(f =>
                    f.id === newMedia.id
                        ? { ...f, optimization_status: 'pending' }
                        : f
                ));

                // Create optimization job
                const newJob = {
                    id: `opt_job_${Date.now()}_${newMedia.id}`,
                    media_id: newMedia.id,
                    media_filename: newMedia.filename,
                    job_type: `${newMedia.file_type}_optimization`,
                    status: 'pending',
                    progress: 0,
                    created_at: new Date().toISOString(),
                    started_at: null,
                    completed_at: null,
                    duration: null,
                    original_size: newMedia.file_size,
                    optimized_size: null,
                    size_reduction: null,
                    optimization_settings: {
                        codec: newMedia.file_type === 'video' ? 'h264' : 'webp',
                        quality: 85,
                        compression: 'high'
                    },
                    error_message: null,
                    worker_node: `opt-worker-${Math.floor(Math.random() * 5) + 1}`
                };
                setOptimizationJobs(prev => [...prev, newJob]);
            }, 2000);
        });

        showToast(`${files.length} files uploaded successfully`, 'success');
    };

    const handleDeleteMedia = (mediaId) => {
        if (confirm('Are you sure you want to delete this media file? This action cannot be undone.')) {
            setMediaFiles(prev => prev.filter(f => f.id !== mediaId));
            setOptimizationJobs(prev => prev.filter(j => j.media_id !== mediaId));
            showToast('Media file deleted', 'success');
        }
    };

    const handleRetryOptimization = (mediaId) => {
        const media = mediaFiles.find(f => f.id === mediaId);
        if (media) {
            const newJob = {
                id: `opt_job_${Date.now()}_${media.id}`,
                media_id: media.id,
                media_filename: media.filename,
                job_type: `${media.file_type}_optimization`,
                status: 'pending',
                progress: 0,
                created_at: new Date().toISOString(),
                started_at: null,
                completed_at: null,
                duration: null,
                original_size: media.file_size,
                optimized_size: null,
                size_reduction: null,
                optimization_settings: {
                    codec: media.file_type === 'video' ? 'h264' : 'webp',
                    quality: 85,
                    compression: 'high'
                },
                error_message: null,
                worker_node: `opt-worker-${Math.floor(Math.random() * 5) + 1}`
            };
            setOptimizationJobs(prev => [...prev, newJob]);
            showToast('Optimization job queued for retry', 'success');
        }
    };

    const toggleFileSelection = (fileId) => {
        setSelectedFiles(prev =>
            prev.includes(fileId)
                ? prev.filter(id => id !== fileId)
                : [...prev, fileId]
        );
    };

    const selectAllFiles = () => {
        if (selectedFiles.length === mediaFiles.length) {
            setSelectedFiles([]);
        } else {
            setSelectedFiles(mediaFiles.map(f => f.id));
        }
    };

    const getFileType = (mimeType) => {
        if (mimeType.startsWith('video/')) return 'video';
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.startsWith('audio/')) return 'audio';
        if (mimeType.startsWith('application/')) return 'document';
        return 'other';
    };

    const getFileIcon = (fileType) => {
        switch (fileType) {
            case 'video': return <FileVideo size={24} />;
            case 'image': return <FileImage size={24} />;
            case 'audio': return <FileAudio size={24} />;
            case 'document': return <FileText size={24} />;
            default: return <File size={24} />;
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'completed': return { color: 'green', text: 'Completed', icon: <CheckCircle size={14} /> };
            case 'in_progress': return { color: 'blue', text: 'In Progress', icon: <RefreshCw size={14} /> };
            case 'pending': return { color: 'yellow', text: 'Pending', icon: <Clock size={14} /> };
            case 'failed': return { color: 'red', text: 'Failed', icon: <XCircle size={14} /> };
            case 'optimized': return { color: 'green', text: 'Optimized', icon: <CheckCircle size={14} /> };
            case 'optimizing': return { color: 'blue', text: 'Optimizing', icon: <RefreshCw size={14} /> };
            case 'synced': return { color: 'green', text: 'Synced', icon: <CheckCircle size={14} /> };
            case 'syncing': return { color: 'blue', text: 'Syncing', icon: <RefreshCw size={14} /> };
            case 'backup_completed': return { color: 'green', text: 'Backup Completed', icon: <CheckCircle size={14} /> };
            case 'backup_pending': return { color: 'yellow', text: 'Backup Pending', icon: <Clock size={14} /> };
            default: return { color: 'gray', text: status, icon: <FileText size={14} /> };
        }
    };

    const getStorageLocationBadge = (location) => {
        switch (location) {
            case 'primary': return { color: 'blue', text: 'Primary', icon: <HardDrive size={14} /> };
            case 'archive': return { color: 'orange', text: 'Archive', icon: <Database size={14} /> };
            case 'backup': return { color: 'green', text: 'Backup', icon: <Server size={14} /> };
            default: return { color: 'gray', text: location, icon: <File size={14} /> };
        }
    };

    return (
        <div className="media-management-tab">
            {/* Header */}
            <div className="tab-header">
                <div className="header-left">
                    <h2>Media Management</h2>
                    <p>Advanced media storage optimization, CDN management, and content delivery optimization</p>
                </div>
                <div className="header-actions">
                    <button className="btn-secondary" onClick={() => setShowStorageModal(true)}>
                        <Globe size={18} />
                        Storage Analytics
                    </button>
                    <button className="btn-secondary" onClick={() => setShowCDNModal(true)}>
                        <Wifi size={18} />
                        CDN Status
                    </button>
                    <button className="btn-primary" onClick={() => setShowUploadModal(true)}>
                        <Upload size={18} />
                        Upload Media
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="tabs-navigation">
                <div className="tab-buttons">
                    <button
                        className={`tab-btn ${currentTab === 'files' ? 'active' : ''}`}
                        onClick={() => setCurrentTab('files')}
                    >
                        <File size={16} />
                        Media Files
                    </button>
                    <button
                        className={`tab-btn ${currentTab === 'optimization' ? 'active' : ''}`}
                        onClick={() => setCurrentTab('optimization')}
                    >
                        <Zap size={16} />
                        Optimization Jobs
                    </button>
                    <button
                        className={`tab-btn ${currentTab === 'storage' ? 'active' : ''}`}
                        onClick={() => setCurrentTab('storage')}
                    >
                        <HardDrive size={16} />
                        Storage Management
                    </button>
                    <button
                        className={`tab-btn ${currentTab === 'cdn' ? 'active' : ''}`}
                        onClick={() => setCurrentTab('cdn')}
                    >
                        <Wifi size={16} />
                        CDN Management
                    </button>
                </div>
            </div>

            {/* Media Files Tab */}
            {currentTab === 'files' && (
                <>
                    {/* Filters */}
                    <div className="filters-section">
                        <div className="search-filters">
                            <div className="search-box">
                                <Search size={20} className="search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search media files by name, type, or tags..."
                                    value={filters.search}
                                    onChange={(e) => handleFilterChange('search', e.target.value)}
                                />
                            </div>

                            <div className="filter-group">
                                <select
                                    value={filters.type}
                                    onChange={(e) => handleFilterChange('type', e.target.value)}
                                >
                                    <option value="all">All Types</option>
                                    <option value="video">Video</option>
                                    <option value="image">Image</option>
                                    <option value="audio">Audio</option>
                                    <option value="document">Document</option>
                                </select>

                                <select
                                    value={filters.status}
                                    onChange={(e) => handleFilterChange('status', e.target.value)}
                                >
                                    <option value="all">All Status</option>
                                    <option value="optimized">Optimized</option>
                                    <option value="optimizing">Optimizing</option>
                                    <option value="pending">Pending</option>
                                    <option value="failed">Failed</option>
                                </select>

                                <select
                                    value={filters.storage_location}
                                    onChange={(e) => handleFilterChange('storage_location', e.target.value)}
                                >
                                    <option value="all">All Locations</option>
                                    <option value="primary">Primary</option>
                                    <option value="archive">Archive</option>
                                    <option value="backup">Backup</option>
                                </select>

                                <select
                                    value={filters.optimization_status}
                                    onChange={(e) => handleFilterChange('optimization_status', e.target.value)}
                                >
                                    <option value="all">All Optimization</option>
                                    <option value="optimized">Optimized</option>
                                    <option value="optimizing">Optimizing</option>
                                    <option value="pending">Pending</option>
                                </select>

                                <input
                                    type="number"
                                    placeholder="Min size (MB)"
                                    value={filters.size_min}
                                    onChange={(e) => handleFilterChange('size_min', e.target.value)}
                                />

                                <input
                                    type="number"
                                    placeholder="Max size (MB)"
                                    value={filters.size_max}
                                    onChange={(e) => handleFilterChange('size_max', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="filter-actions">
                            <button className="refresh-btn" onClick={() => { }}>
                                <RefreshCw size={18} />
                                Refresh
                            </button>
                            <button className="btn-secondary" onClick={() => setShowOptimizationModal(true)}>
                                <Settings size={18} />
                                Optimization Settings
                            </button>
                        </div>
                    </div>

                    {/* Bulk Actions */}
                    {selectedFiles.length > 0 && (
                        <div className="bulk-actions">
                            <div className="selection-info">
                                {selectedFiles.length} files selected
                            </div>
                            <div className="bulk-actions-controls">
                                <select
                                    value={bulkAction}
                                    onChange={(e) => setBulkAction(e.target.value)}
                                >
                                    <option value="">Bulk Actions</option>
                                    <option value="optimize">Start Optimization</option>
                                    <option value="sync_cdn">Sync to CDN</option>
                                    <option value="delete">Delete Files</option>
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

                    {/* Media Files Table */}
                    <div className="media-files-table-container">
                        {isLoading ? (
                            <div className="loading-state">
                                <RefreshCw size={32} className="spin-anim" />
                                <p>Loading media files...</p>
                            </div>
                        ) : (
                            <>
                                <div className="table-header">
                                    <div className="select-all">
                                        <input
                                            type="checkbox"
                                            checked={selectedFiles.length === mediaFiles.length && mediaFiles.length > 0}
                                            onChange={selectAllFiles}
                                        />
                                        <span>Select All</span>
                                    </div>
                                    <div className="table-actions">
                                        <span className="media-count">{mediaFiles.length} files found</span>
                                        <button className="btn-primary" onClick={() => setShowUploadModal(true)}>
                                            <Plus size={18} />
                                            Upload Media
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
                                                        checked={selectedFiles.length === mediaFiles.length && mediaFiles.length > 0}
                                                        onChange={selectAllFiles}
                                                    />
                                                </th>
                                                <th>File Info</th>
                                                <th>Type & Size</th>
                                                <th>Status & Optimization</th>
                                                <th>Storage & CDN</th>
                                                <th>Performance</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {mediaFiles.map(file => (
                                                <tr key={file.id} className={file.optimization_status === 'failed' ? 'error-file' : file.optimization_status === 'optimizing' ? 'optimizing-file' : ''}>
                                                    <td>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedFiles.includes(file.id)}
                                                            onChange={() => toggleFileSelection(file.id)}
                                                        />
                                                    </td>
                                                    <td>
                                                        <div className="file-info">
                                                            <div className="file-icon">
                                                                {getFileIcon(file.file_type)}
                                                            </div>
                                                            <div className="file-details">
                                                                <div className="file-title">
                                                                    <strong>{file.filename}</strong>
                                                                    <span className="file-id">ID: {file.id}</span>
                                                                </div>
                                                                <div className="file-meta">
                                                                    <span className="file-mime">{file.mime_type}</span>
                                                                    <span className="file-upload-date">Uploaded: {new Date(file.upload_date).toLocaleDateString()}</span>
                                                                </div>
                                                                <div className="file-tags">
                                                                    {file.tags.map(tag => (
                                                                        <span key={tag} className="tag-pill">{tag}</span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="type-size-info">
                                                            <div className="type-badge">
                                                                <span className={`type-pill ${file.file_type}`}>
                                                                    {file.file_type.toUpperCase()}
                                                                </span>
                                                                {file.dimensions && (
                                                                    <span className="dimensions-pill">{file.dimensions}</span>
                                                                )}
                                                                {file.duration && (
                                                                    <span className="duration-pill">{Math.floor(file.duration / 60)}:{(file.duration % 60).toString().padStart(2, '0')}</span>
                                                                )}
                                                            </div>
                                                            <div className="size-info">
                                                                <div className="size-item">
                                                                    <span className="size-label">Original:</span>
                                                                    <span className="size-value">{formatFileSize(file.file_size)}</span>
                                                                </div>
                                                                <div className="size-item">
                                                                    <span className="size-label">Optimized:</span>
                                                                    <span className="size-value">{formatFileSize(file.optimized_size)}</span>
                                                                </div>
                                                                <div className="size-item">
                                                                    <span className="size-label">Reduction:</span>
                                                                    <span className="size-value reduction">{file.size_reduction.toFixed(1)}%</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="status-info">
                                                            <div className="status-badge">
                                                                <span className={`status-pill ${getStatusBadge(file.optimization_status).color}`}>
                                                                    {getStatusBadge(file.optimization_status).icon}
                                                                    {getStatusBadge(file.optimization_status).text}
                                                                </span>
                                                                <span className={`status-pill ${getStatusBadge(file.cdn_status).color}`}>
                                                                    {getStatusBadge(file.cdn_status).icon}
                                                                    {getStatusBadge(file.cdn_status).text}
                                                                </span>
                                                                <span className={`status-pill ${getStatusBadge(file.backup_status).color}`}>
                                                                    {getStatusBadge(file.backup_status).icon}
                                                                    {getStatusBadge(file.backup_status).text}
                                                                </span>
                                                            </div>
                                                            <div className="optimization-status">
                                                                {file.optimization_status !== 'optimized' && (
                                                                    <div className="progress-bar">
                                                                        <div
                                                                            className="progress-fill"
                                                                            style={{ width: `${file.optimization_status === 'optimizing' ? 60 : 0}%` }}
                                                                        ></div>
                                                                        <span className="progress-text">{file.optimization_status === 'optimizing' ? '60%' : '0%'}</span>
                                                                    </div>
                                                                )}
                                                                {file.optimization_date && (
                                                                    <div className="optimization-date">
                                                                        <Clock size={12} />
                                                                        <span>Optimized: {new Date(file.optimization_date).toLocaleString()}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="storage-info">
                                                            <div className="storage-badge">
                                                                <span className={`storage-pill ${getStorageLocationBadge(file.storage_location).color}`}>
                                                                    {getStorageLocationBadge(file.storage_location).icon}
                                                                    {getStorageLocationBadge(file.storage_location).text}
                                                                </span>
                                                                {file.backup_location && (
                                                                    <span className="backup-pill">Backup: {file.backup_location}</span>
                                                                )}
                                                            </div>
                                                            <div className="cdn-info">
                                                                {file.cdn_url && (
                                                                    <div className="cdn-url">
                                                                        <span className="cdn-label">CDN URL:</span>
                                                                        <a href={file.cdn_url} target="_blank" rel="noopener noreferrer" className="cdn-link">
                                                                            {file.cdn_url}
                                                                        </a>
                                                                    </div>
                                                                )}
                                                                {file.cdn_status === 'syncing' && (
                                                                    <div className="syncing-status">
                                                                        <RefreshCw size={12} className="spin-anim" />
                                                                        <span>Syncing to CDN...</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="performance-info">
                                                            <div className="perf-metrics">
                                                                <div className="metric-item">
                                                                    <Eye size={14} />
                                                                    <span>{file.views.toLocaleString()} views</span>
                                                                </div>
                                                                <div className="metric-item">
                                                                    <Download size={14} />
                                                                    <span>{file.downloads} downloads</span>
                                                                </div>
                                                                <div className="metric-item">
                                                                    <Share2 size={14} />
                                                                    <span>{file.shares} shares</span>
                                                                </div>
                                                            </div>
                                                            <div className="file-actions">
                                                                {file.file_type === 'video' && (
                                                                    <button className="action-btn preview" title="Preview Video">
                                                                        <Eye size={16} />
                                                                    </button>
                                                                )}
                                                                {file.file_type === 'image' && (
                                                                    <button className="action-btn preview" title="Preview Image">
                                                                        <Eye size={16} />
                                                                    </button>
                                                                )}
                                                                <button className="action-btn download" title="Download Original">
                                                                    <Download size={16} />
                                                                </button>
                                                                {file.cdn_url && (
                                                                    <button className="action-btn cdn" title="Open CDN URL">
                                                                        <Wifi size={16} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="action-buttons">
                                                            <button
                                                                className="action-btn edit"
                                                                onClick={() => setEditingFile(file)}
                                                                title="Edit File"
                                                            >
                                                                <Edit size={16} />
                                                            </button>
                                                            {file.optimization_status === 'failed' && (
                                                                <button
                                                                    className="action-btn retry"
                                                                    onClick={() => handleRetryOptimization(file.id)}
                                                                    title="Retry Optimization"
                                                                >
                                                                    <RefreshCw size={16} />
                                                                </button>
                                                            )}
                                                            <button
                                                                className="action-btn delete"
                                                                onClick={() => handleDeleteMedia(file.id)}
                                                                title="Delete File"
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

            {/* Optimization Jobs Tab */}
            {currentTab === 'optimization' && (
                <div className="optimization-tab">
                    <div className="optimization-header">
                        <h3>Optimization Job Management</h3>
                        <div className="optimization-actions">
                            <button className="btn-secondary">
                                <RefreshCw size={18} />
                                Refresh Jobs
                            </button>
                            <button className="btn-primary">
                                <Settings size={18} />
                                Job Settings
                            </button>
                        </div>
                    </div>

                    <div className="optimization-stats">
                        <div className="stat-card">
                            <div className="stat-icon success">
                                <CheckCircle size={24} />
                            </div>
                            <div className="stat-content">
                                <span className="stat-label">Completed</span>
                                <strong>{mockOptimizationJobs.filter(j => j.status === 'completed').length}</strong>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon processing">
                                <RefreshCw size={24} />
                            </div>
                            <div className="stat-content">
                                <span className="stat-label">In Progress</span>
                                <strong>{mockOptimizationJobs.filter(j => j.status === 'in_progress').length}</strong>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon pending">
                                <Clock size={24} />
                            </div>
                            <div className="stat-content">
                                <span className="stat-label">Pending</span>
                                <strong>{mockOptimizationJobs.filter(j => j.status === 'pending').length}</strong>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon total">
                                <FileText size={24} />
                            </div>
                            <div className="stat-content">
                                <span className="stat-label">Avg Reduction</span>
                                <strong>{mockStorageStats.optimization_stats.avg_size_reduction.toFixed(1)}%</strong>
                            </div>
                        </div>
                    </div>

                    <div className="optimization-jobs-container">
                        <div className="table-header">
                            <h4>Active Optimization Jobs</h4>
                            <span className="job-count">{optimizationJobs.length} jobs</span>
                        </div>

                        <div className="table-responsive">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Job Info</th>
                                        <th>Status & Progress</th>
                                        <th>File Specs</th>
                                        <th>Optimization Settings</th>
                                        <th>Performance</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {optimizationJobs.map(job => (
                                        <tr key={job.id} className={job.status === 'failed' ? 'failed-job' : job.status === 'in_progress' ? 'in-progress-job' : ''}>
                                            <td>
                                                <div className="job-info">
                                                    <div className="job-title">
                                                        <strong>{job.media_filename}</strong>
                                                        <span className="job-id">Job: {job.id}</span>
                                                    </div>
                                                    <div className="job-meta">
                                                        <span className="job-type">{job.job_type}</span>
                                                        <span className="job-created">Created: {new Date(job.created_at).toLocaleString()}</span>
                                                        <span className="job-worker">Worker: {job.worker_node}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="job-status">
                                                    <div className="status-badge">
                                                        <span className={`status-pill ${getStatusBadge(job.status).color}`}>
                                                            {getStatusBadge(job.status).icon}
                                                            {getStatusBadge(job.status).text}
                                                        </span>
                                                    </div>
                                                    <div className="progress-container">
                                                        <div className="progress-bar">
                                                            <div
                                                                className="progress-fill"
                                                                style={{ width: `${job.progress}%` }}
                                                            ></div>
                                                            <span className="progress-text">{job.progress}%</span>
                                                        </div>
                                                    </div>
                                                    {job.error_message && (
                                                        <div className="error-message">
                                                            <AlertTriangle size={12} />
                                                            <span>{job.error_message}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="file-specs">
                                                    <div className="spec-item">
                                                        <span className="spec-label">Original:</span>
                                                        <span className="spec-value">{formatFileSize(job.original_size)}</span>
                                                    </div>
                                                    <div className="spec-item">
                                                        <span className="spec-label">Optimized:</span>
                                                        <span className="spec-value">{job.optimized_size ? formatFileSize(job.optimized_size) : 'N/A'}</span>
                                                    </div>
                                                    <div className="spec-item">
                                                        <span className="spec-label">Reduction:</span>
                                                        <span className="spec-value">{job.size_reduction ? `${job.size_reduction.toFixed(1)}%` : 'N/A'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="optimization-settings">
                                                    <div className="setting-item">
                                                        <span className="setting-label">Codec:</span>
                                                        <span className="setting-value">{job.optimization_settings.codec}</span>
                                                    </div>
                                                    <div className="setting-item">
                                                        <span className="setting-label">Quality:</span>
                                                        <span className="setting-value">{job.optimization_settings.quality}</span>
                                                    </div>
                                                    <div className="setting-item">
                                                        <span className="setting-label">Compression:</span>
                                                        <span className="setting-value">{job.optimization_settings.compression}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="performance-info">
                                                    <div className="perf-item">
                                                        <span className="perf-label">Duration:</span>
                                                        <span className="perf-value">{job.duration ? `${job.duration}s` : 'N/A'}</span>
                                                    </div>
                                                    <div className="perf-item">
                                                        <span className="perf-label">Started:</span>
                                                        <span className="perf-value">{job.started_at ? new Date(job.started_at).toLocaleString() : 'N/A'}</span>
                                                    </div>
                                                    <div className="perf-item">
                                                        <span className="perf-label">Completed:</span>
                                                        <span className="perf-value">{job.completed_at ? new Date(job.completed_at).toLocaleString() : 'N/A'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="job-actions">
                                                    <button className="action-btn view" title="View Details">
                                                        <Eye size={16} />
                                                    </button>
                                                    <button className="action-btn retry" title="Retry Job">
                                                        <RefreshCw size={16} />
                                                    </button>
                                                    <button className="action-btn delete" title="Cancel Job">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Storage Management Tab */}
            {currentTab === 'storage' && (
                <div className="storage-tab">
                    <div className="storage-header">
                        <h3>Storage Management & Analytics</h3>
                        <div className="storage-actions">
                            <button className="btn-secondary">
                                <Globe size={18} />
                                Storage Map
                            </button>
                            <button className="btn-primary">
                                <FileArchive size={18} />
                                Cleanup Storage
                            </button>
                        </div>
                    </div>

                    <div className="storage-overview">
                        <div className="storage-metrics">
                            <div className="metric-card">
                                <div className="metric-icon">
                                    <File size={24} />
                                </div>
                                <div className="metric-content">
                                    <div className="metric-value">{storageStats.total_files}</div>
                                    <div className="metric-label">Total Files</div>
                                </div>
                            </div>

                            <div className="metric-card">
                                <div className="metric-icon">
                                    <HardDrive size={24} />
                                </div>
                                <div className="metric-content">
                                    <div className="metric-value">{formatFileSize(storageStats.total_storage)}</div>
                                    <div className="metric-label">Total Storage</div>
                                </div>
                            </div>

                            <div className="metric-card">
                                <div className="metric-icon">
                                    <Database size={24} />
                                </div>
                                <div className="metric-content">
                                    <div className="metric-value">{formatFileSize(storageStats.used_storage)}</div>
                                    <div className="metric-label">Used Storage</div>
                                </div>
                            </div>

                            <div className="metric-card">
                                <div className="metric-icon">
                                    <Server size={24} />
                                </div>
                                <div className="metric-content">
                                    <div className="metric-value">{formatFileSize(storageStats.available_storage)}</div>
                                    <div className="metric-label">Available Storage</div>
                                </div>
                            </div>
                        </div>

                        <div className="storage-utilization">
                            <div className="utilization-header">
                                <h4>Storage Utilization</h4>
                                <span className="utilization-percentage">{(storageStats.storage_utilization * 100).toFixed(1)}%</span>
                            </div>
                            <div className="utilization-bar">
                                <div
                                    className="utilization-fill"
                                    style={{ width: `${storageStats.storage_utilization * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    <div className="storage-breakdown">
                        <div className="breakdown-section">
                            <h4>By Storage Location</h4>
                            <div className="location-breakdown">
                                {Object.entries(storageStats.storage_locations || {}).map(([location, data]) => (
                                    <div key={location} className="location-item">
                                        <div className="location-info">
                                            <span className="location-name">{location.toUpperCase()}</span>
                                            <span className="location-capacity">{formatFileSize(data.capacity)} capacity</span>
                                        </div>
                                        <div className="location-storage">
                                            <div className="storage-bar">
                                                <div
                                                    className="storage-fill"
                                                    style={{ width: `${data.utilization * 100}%` }}
                                                ></div>
                                            </div>
                                            <span className="storage-used">{formatFileSize(data.used)} used</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="breakdown-section">
                            <h4>By File Type</h4>
                            <div className="type-breakdown">
                                {Object.entries(storageStats.file_types || {}).map(([type, data]) => (
                                    <div key={type} className="type-item">
                                        <div className="type-info">
                                            <span className="type-name">{type.toUpperCase()}</span>
                                            <span className="type-count">{data.count} files</span>
                                        </div>
                                        <div className="type-storage">
                                            <div className="storage-bar">
                                                <div
                                                    className="storage-fill"
                                                    style={{ width: `${(data.size / storageStats.total_storage) * 100}%` }}
                                                ></div>
                                            </div>
                                            <span className="storage-size">{formatFileSize(data.size)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="optimization-stats">
                        <h4>Optimization Statistics</h4>
                        <div className="optimization-metrics">
                            <div className="optimization-metric">
                                <span className="metric-label">Total Optimized:</span>
                                <span className="metric-value">{storageStats.optimization_stats.total_optimized}</span>
                            </div>
                            <div className="optimization-metric">
                                <span className="metric-label">Optimization Rate:</span>
                                <span className="metric-value">{(storageStats.optimization_stats.optimization_rate * 100).toFixed(1)}%</span>
                            </div>
                            <div className="optimization-metric">
                                <span className="metric-label">Avg Size Reduction:</span>
                                <span className="metric-value">{storageStats.optimization_stats.avg_size_reduction.toFixed(1)}%</span>
                            </div>
                            <div className="optimization-metric">
                                <span className="metric-label">Space Saved:</span>
                                <span className="metric-value">{formatFileSize(storageStats.optimization_stats.total_space_saved)}</span>
                            </div>
                            <div className="optimization-metric">
                                <span className="metric-label">Avg Time:</span>
                                <span className="metric-value">{storageStats.optimization_stats.avg_optimization_time}s</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CDN Management Tab */}
            {currentTab === 'cdn' && (
                <div className="cdn-tab">
                    <div className="cdn-header">
                        <h3>CDN Management & Status</h3>
                        <div className="cdn-actions">
                            <button className="btn-secondary">
                                <Wifi size={18} />
                                Refresh Status
                            </button>
                            <button className="btn-primary">
                                <Settings size={18} />
                                CDN Settings
                            </button>
                        </div>
                    </div>

                    <div className="cdn-overview">
                        <div className="cdn-status">
                            <div className="status-card">
                                <div className="status-icon operational">
                                    <Wifi size={24} />
                                </div>
                                <div className="status-content">
                                    <span className="status-label">CDN Status</span>
                                    <strong className="status-value">{cdnStatus.status}</strong>
                                </div>
                            </div>

                            <div className="status-card">
                                <div className="status-icon bandwidth">
                                    <Zap size={24} />
                                </div>
                                <div className="status-content">
                                    <span className="status-label">Bandwidth Used</span>
                                    <strong className="status-value">{formatFileSize(cdnStatus.bandwidth_usage.current)}</strong>
                                    <small>of {formatFileSize(cdnStatus.bandwidth_usage.limit)}</small>
                                </div>
                            </div>

                            <div className="status-card">
                                <div className="status-icon cache">
                                    <Database size={24} />
                                </div>
                                <div className="status-content">
                                    <span className="status-label">Cache Hit Rate</span>
                                    <strong className="status-value">{(cdnStatus.cache_stats.hit_rate * 100).toFixed(1)}%</strong>
                                </div>
                            </div>

                            <div className="status-card">
                                <div className="status-icon cost">
                                    <FileText size={24} />
                                </div>
                                <div className="status-content">
                                    <span className="status-label">Estimated Cost</span>
                                    <strong className="status-value">${cdnStatus.cdn_stats.cdn_cost_estimate}</strong>
                                </div>
                            </div>
                        </div>

                        <div className="bandwidth-usage">
                            <div className="usage-header">
                                <h4>Bandwidth Usage</h4>
                                <span className="usage-percentage">{(cdnStatus.bandwidth_usage.percentage * 100).toFixed(1)}%</span>
                            </div>
                            <div className="usage-bar">
                                <div
                                    className="usage-fill"
                                    style={{ width: `${cdnStatus.bandwidth_usage.percentage * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    <div className="cdn-nodes">
                        <h4>CDN Nodes Status</h4>
                        <div className="nodes-grid">
                            {cdnStatus.nodes?.map(node => (
                                <div key={node.id} className={`node-card ${node.status}`}>
                                    <div className="node-header">
                                        <strong>{node.id}</strong>
                                        <span className={`status-pill ${node.status}`}>
                                            {node.status === 'active' ? <Wifi size={12} /> : node.status === 'maintenance' ? <Settings size={12} /> : <WifiOff size={12} />}
                                            {node.status.toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="node-region">{node.region}</div>
                                    <div className="node-metrics">
                                        <div className="metric">
                                            <span className="metric-label">Latency:</span>
                                            <span className="metric-value">{node.latency ? `${node.latency}ms` : 'N/A'}</span>
                                        </div>
                                        <div className="metric">
                                            <span className="metric-label">Capacity:</span>
                                            <span className="metric-value">{node.capacity ? `${(node.capacity * 100).toFixed(0)}%` : 'N/A'}</span>
                                        </div>
                                    </div>
                                    {node.status === 'active' && (
                                        <div className="node-usage">
                                            <div className="usage-bar">
                                                <div
                                                    className="usage-fill"
                                                    style={{ width: `${node.capacity * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="cdn-stats">
                        <h4>CDN Statistics</h4>
                        <div className="stats-grid">
                            <div className="stat-item">
                                <span className="stat-label">Files Synced:</span>
                                <span className="stat-value">{cdnStatus.cdn_stats.total_files_synced}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Sync Rate:</span>
                                <span className="stat-value">{(cdnStatus.cdn_stats.sync_rate * 100).toFixed(1)}%</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Avg Sync Time:</span>
                                <span className="stat-value">{cdnStatus.cdn_stats.avg_sync_time}s</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Total Requests:</span>
                                <span className="stat-value">{cdnStatus.cdn_stats.total_requests.toLocaleString()}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Cached Files:</span>
                                <span className="stat-value">{cdnStatus.cdn_stats.cached_files}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Miss Rate:</span>
                                <span className="stat-value">{(cdnStatus.cache_stats.miss_rate * 100).toFixed(1)}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <h3>Upload Media Files</h3>
                            <button className="close-btn" onClick={() => setShowUploadModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
                                <div className="upload-icon">
                                    <Upload size={48} />
                                </div>
                                <div className="upload-text">
                                    <h4>Drag and drop media files here</h4>
                                    <p>or click to select files</p>
                                    <p className="upload-hint">Supported formats: Images, Videos, Audio, Documents</p>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.ppt,.pptx"
                                    onChange={(e) => handleUploadMedia(e.target.files)}
                                    style={{ display: 'none' }}
                                />
                            </div>

                            <div className="upload-settings">
                                <h4>Upload Settings</h4>
                                <div className="setting-group">
                                    <label>
                                        <input type="checkbox" defaultChecked />
                                        Auto-optimize uploaded files
                                    </label>
                                    <label>
                                        <input type="checkbox" defaultChecked />
                                        Sync to CDN after optimization
                                    </label>
                                    <label>
                                        <input type="checkbox" defaultChecked />
                                        Create backup copies
                                    </label>
                                    <label>
                                        <input type="checkbox" />
                                        Extract metadata
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Optimization Settings Modal */}
            {showOptimizationModal && (
                <div className="modal-overlay" onClick={() => setShowOptimizationModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
                        <div className="modal-header">
                            <h3>Optimization Settings</h3>
                            <button className="close-btn" onClick={() => setShowOptimizationModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="settings-grid">
                                <div className="setting-section">
                                    <h4>Video Optimization</h4>
                                    <div className="optimization-settings">
                                        <div className="setting-item">
                                            <label>Codec</label>
                                            <select defaultValue="h264">
                                                <option value="h264">H.264</option>
                                                <option value="h265">H.265</option>
                                                <option value="vp9">VP9</option>
                                            </select>
                                        </div>
                                        <div className="setting-item">
                                            <label>Quality</label>
                                            <input type="range" min="1" max="100" defaultValue="85" />
                                        </div>
                                        <div className="setting-item">
                                            <label>Max Resolution</label>
                                            <select defaultValue="1920x1080">
                                                <option value="3840x2160">4K (3840x2160)</option>
                                                <option value="1920x1080">Full HD (1920x1080)</option>
                                                <option value="1280x720">HD (1280x720)</option>
                                                <option value="640x480">SD (640x480)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="setting-section">
                                    <h4>Image Optimization</h4>
                                    <div className="optimization-settings">
                                        <div className="setting-item">
                                            <label>Format</label>
                                            <select defaultValue="webp">
                                                <option value="webp">WebP</option>
                                                <option value="jpeg">JPEG</option>
                                                <option value="png">PNG</option>
                                            </select>
                                        </div>
                                        <div className="setting-item">
                                            <label>Quality</label>
                                            <input type="range" min="1" max="100" defaultValue="85" />
                                        </div>
                                        <div className="setting-item">
                                            <label>Compression</label>
                                            <select defaultValue="lossy">
                                                <option value="lossy">Lossy</option>
                                                <option value="lossless">Lossless</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="setting-section">
                                    <h4>Audio Optimization</h4>
                                    <div className="optimization-settings">
                                        <div className="setting-item">
                                            <label>Codec</label>
                                            <select defaultValue="aac">
                                                <option value="aac">AAC</option>
                                                <option value="mp3">MP3</option>
                                                <option value="opus">Opus</option>
                                            </select>
                                        </div>
                                        <div className="setting-item">
                                            <label>Bitrate</label>
                                            <select defaultValue="192">
                                                <option value="128">128 kbps</option>
                                                <option value="192">192 kbps</option>
                                                <option value="256">256 kbps</option>
                                                <option value="320">320 kbps</option>
                                            </select>
                                        </div>
                                        <div className="setting-item">
                                            <label>Sample Rate</label>
                                            <select defaultValue="44100">
                                                <option value="22050">22.05 kHz</option>
                                                <option value="44100">44.1 kHz</option>
                                                <option value="48000">48 kHz</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="setting-section">
                                    <h4>Document Optimization</h4>
                                    <div className="optimization-settings">
                                        <div className="setting-item">
                                            <label>Compression</label>
                                            <select defaultValue="high">
                                                <option value="low">Low</option>
                                                <option value="medium">Medium</option>
                                                <option value="high">High</option>
                                            </select>
                                        </div>
                                        <div className="setting-item">
                                            <label>Image Quality</label>
                                            <select defaultValue="medium">
                                                <option value="low">Low</option>
                                                <option value="medium">Medium</option>
                                                <option value="high">High</option>
                                            </select>
                                        </div>
                                        <div className="setting-item">
                                            <label>Remove Metadata</label>
                                            <input type="checkbox" defaultChecked />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button type="button" className="btn-secondary" onClick={() => setShowOptimizationModal(false)}>
                                Cancel
                            </button>
                            <button type="button" className="btn-primary">
                                Save Settings
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MediaManagementTab;