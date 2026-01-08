import React, { useState, useEffect, useRef } from 'react';
import {
    Video, Upload, Download, Trash2, Edit, Eye, EyeOff, Play, Pause, StopCircle,
    FileText, Clock, FileCheck, AlertTriangle, CheckCircle, XCircle, RefreshCw,
    Settings, Globe, Shield, Users, TrendingUp, BarChart3, Filter, Search,
    Plus, Copy, Share2, File, FileAudio, FileVideo, FileImage, FileArchive,
    FileCode, FileSpreadsheet, FileSymlink, FileX, FileMinus, FilePlus,
    FileSearch, FileStack, FileWarning,
    FileClock, Database, Cpu, Wifi, WifiOff
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

const VideoManagementTab = () => {
    const [videos, setVideos] = useState([]);
    const [transcodingJobs, setTranscodingJobs] = useState([]);
    const [storageStats, setStorageStats] = useState({});
    const [filters, setFilters] = useState({
        status: 'all',
        quality: 'all',
        format: 'all',
        duration_min: '',
        duration_max: '',
        size_min: '',
        size_max: '',
        upload_date_start: '',
        upload_date_end: '',
        sort_by: 'upload_date',
        sort_order: 'desc'
    });

    const [selectedVideos, setSelectedVideos] = useState([]);
    const [bulkAction, setBulkAction] = useState('');
    const [showTranscodingModal, setShowTranscodingModal] = useState(false);
    const [showStorageModal, setShowStorageModal] = useState(false);
    const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [editingVideo, setEditingVideo] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [currentTab, setCurrentTab] = useState('videos');

    const fileInputRef = useRef(null);
    const { showToast } = useToast();

    // Mock data for videos
    const mockVideos = [
        {
            id: 'video_001',
            title: 'Product Demo Video',
            description: 'High-quality product demonstration video',
            file_name: 'product_demo.mp4',
            file_size: 157286400, // 150MB
            duration: 180, // 3 minutes
            resolution: '1920x1080',
            quality: 'high',
            format: 'mp4',
            codec: 'h264',
            bitrate: 5000,
            frame_rate: 30,
            audio_codec: 'aac',
            audio_bitrate: 192,
            audio_channels: 2,
            status: 'transcoded',
            upload_date: '2024-06-15T10:00:00Z',
            transcoding_date: '2024-06-15T10:05:00Z',
            storage_path: '/videos/original/product_demo.mp4',
            thumbnail_path: '/thumbnails/product_demo.jpg',
            transcoded_files: [
                {
                    quality: 'high',
                    format: 'mp4',
                    resolution: '1920x1080',
                    file_size: 120000000,
                    bitrate: 5000,
                    storage_path: '/videos/transcoded/high/product_demo.mp4'
                },
                {
                    quality: 'medium',
                    format: 'mp4',
                    resolution: '1280x720',
                    file_size: 60000000,
                    bitrate: 2500,
                    storage_path: '/videos/transcoded/medium/product_demo.mp4'
                },
                {
                    quality: 'low',
                    format: 'mp4',
                    resolution: '640x480',
                    file_size: 20000000,
                    bitrate: 1000,
                    storage_path: '/videos/transcoded/low/product_demo.mp4'
                }
            ],
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
            likes: 89,
            comments: 12,
            transcoding_status: 'completed',
            transcoding_progress: 100,
            error_message: null,
            created_at: '2024-06-15T10:00:00Z',
            updated_at: '2024-06-15T10:05:00Z'
        },
        {
            id: 'video_002',
            title: 'Tutorial Video',
            description: 'Step-by-step tutorial for beginners',
            file_name: 'tutorial_beginner.mp4',
            file_size: 83886080, // 80MB
            duration: 600, // 10 minutes
            resolution: '1280x720',
            quality: 'medium',
            format: 'mp4',
            codec: 'h264',
            bitrate: 2500,
            frame_rate: 30,
            audio_codec: 'aac',
            audio_bitrate: 128,
            audio_channels: 2,
            status: 'transcoding',
            upload_date: '2024-06-16T14:30:00Z',
            transcoding_date: null,
            storage_path: '/videos/original/tutorial_beginner.mp4',
            thumbnail_path: '/thumbnails/tutorial_beginner.jpg',
            transcoded_files: [],
            metadata: {
                instructor: 'Sarah Johnson',
                topic: 'Video Editing Basics',
                software: 'Adobe Premiere Pro'
            },
            tags: ['tutorial', 'beginner', 'video editing'],
            categories: ['education', 'tutorial'],
            views: 890,
            downloads: 23,
            shares: 8,
            likes: 67,
            comments: 5,
            transcoding_status: 'in_progress',
            transcoding_progress: 65,
            error_message: null,
            created_at: '2024-06-16T14:30:00Z',
            updated_at: '2024-06-16T14:35:00Z'
        },
        {
            id: 'video_003',
            title: 'Error Video',
            description: 'Video with transcoding error',
            file_name: 'error_video.mov',
            file_size: 209715200, // 200MB
            duration: 300, // 5 minutes
            resolution: '3840x2160',
            quality: 'ultra',
            format: 'mov',
            codec: 'prores',
            bitrate: 10000,
            frame_rate: 60,
            audio_codec: 'pcm',
            audio_bitrate: 1536,
            audio_channels: 6,
            status: 'error',
            upload_date: '2024-06-17T09:15:00Z',
            transcoding_date: null,
            storage_path: '/videos/original/error_video.mov',
            thumbnail_path: '/thumbnails/error_video.jpg',
            transcoded_files: [],
            metadata: {
                camera: 'RED Epic',
                lens: 'Cooke S7/i',
                location: 'Outdoor Set',
                director: 'Mike Wilson'
            },
            tags: ['error', 'ultra hd', 'cinematic'],
            categories: ['cinematic', 'ultra_hd'],
            views: 0,
            downloads: 0,
            shares: 0,
            likes: 0,
            comments: 0,
            transcoding_status: 'failed',
            transcoding_progress: 0,
            error_message: 'Unsupported codec: prores. Please convert to h264 or h265.',
            created_at: '2024-06-17T09:15:00Z',
            updated_at: '2024-06-17T09:20:00Z'
        }
    ];

    // Mock data for transcoding jobs
    const mockTranscodingJobs = [
        {
            id: 'job_001',
            video_id: 'video_001',
            video_title: 'Product Demo Video',
            status: 'completed',
            progress: 100,
            created_at: '2024-06-15T10:00:00Z',
            started_at: '2024-06-15T10:01:00Z',
            completed_at: '2024-06-15T10:05:00Z',
            duration: 240,
            input_format: 'mp4',
            input_resolution: '1920x1080',
            output_formats: ['mp4', 'webm'],
            output_qualities: ['high', 'medium', 'low'],
            output_resolutions: ['1920x1080', '1280x720', '640x480'],
            error_message: null,
            worker_node: 'transcode-worker-01',
            priority: 'normal'
        },
        {
            id: 'job_002',
            video_id: 'video_002',
            video_title: 'Tutorial Video',
            status: 'in_progress',
            progress: 65,
            created_at: '2024-06-16T14:30:00Z',
            started_at: '2024-06-16T14:31:00Z',
            completed_at: null,
            duration: null,
            input_format: 'mp4',
            input_resolution: '1280x720',
            output_formats: ['mp4'],
            output_qualities: ['high', 'medium'],
            output_resolutions: ['1280x720', '854x480'],
            error_message: null,
            worker_node: 'transcode-worker-02',
            priority: 'normal'
        },
        {
            id: 'job_003',
            video_id: 'video_003',
            video_title: 'Error Video',
            status: 'failed',
            progress: 0,
            created_at: '2024-06-17T09:15:00Z',
            started_at: '2024-06-17T09:16:00Z',
            completed_at: '2024-06-17T09:17:00Z',
            duration: 60,
            input_format: 'mov',
            input_resolution: '3840x2160',
            output_formats: ['mp4'],
            output_qualities: ['high'],
            output_resolutions: ['3840x2160'],
            error_message: 'Unsupported codec: prores. Please convert to h264 or h265.',
            worker_node: 'transcode-worker-03',
            priority: 'high'
        }
    ];

    // Mock data for storage stats
    const mockStorageStats = {
        total_videos: 1500,
        total_storage: 52428800000, // 50GB
        used_storage: 32768000000, // 30GB
        available_storage: 19660800000, // 20GB
        storage_utilization: 0.6,
        formats: {
            mp4: { count: 1200, size: 25000000000 },
            webm: { count: 200, size: 5000000000 },
            mov: { count: 50, size: 2000000000 },
            avi: { count: 50, size: 768000000 }
        },
        qualities: {
            high: { count: 800, size: 20000000000 },
            medium: { count: 500, size: 10000000000 },
            low: { count: 200, size: 2768000000 }
        },
        transcoding_stats: {
            total_jobs: 2000,
            completed: 1800,
            in_progress: 150,
            failed: 50,
            success_rate: 0.9,
            avg_transcoding_time: 120
        }
    };

    useEffect(() => {
        setIsLoading(true);
        // Simulate API calls
        setTimeout(() => {
            setVideos(mockVideos);
            setTranscodingJobs(mockTranscodingJobs);
            setStorageStats(mockStorageStats);
            setIsLoading(false);
        }, 1000);
    }, [filters]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleBulkAction = () => {
        if (selectedVideos.length === 0) {
            showToast('Please select videos first', 'warning');
            return;
        }

        if (bulkAction === 'transcode') {
            const selectedVideoObjects = videos.filter(v => selectedVideos.includes(v.id));
            selectedVideoObjects.forEach(video => {
                // Simulate transcoding job creation
                const newJob = {
                    id: `job_${Date.now()}`,
                    video_id: video.id,
                    video_title: video.title,
                    status: 'pending',
                    progress: 0,
                    created_at: new Date().toISOString(),
                    started_at: null,
                    completed_at: null,
                    duration: null,
                    input_format: video.format,
                    input_resolution: video.resolution,
                    output_formats: ['mp4'],
                    output_qualities: ['high', 'medium', 'low'],
                    output_resolutions: ['1920x1080', '1280x720', '640x480'],
                    error_message: null,
                    worker_node: `transcode-worker-${Math.floor(Math.random() * 5) + 1}`,
                    priority: 'normal'
                };
                setTranscodingJobs(prev => [...prev, newJob]);
            });
            showToast(`${selectedVideos.length} videos added to transcoding queue`, 'success');
        } else if (bulkAction === 'delete') {
            if (confirm(`Delete ${selectedVideos.length} videos? This action cannot be undone.`)) {
                setVideos(prev => prev.filter(v => !selectedVideos.includes(v.id)));
                setSelectedVideos([]);
                showToast('Videos deleted', 'success');
            }
        } else if (bulkAction === 'retry_failed') {
            const failedVideos = videos.filter(v =>
                selectedVideos.includes(v.id) && v.status === 'error'
            );
            failedVideos.forEach(video => {
                // Simulate retrying transcoding
                const newJob = {
                    id: `job_${Date.now()}_${video.id}`,
                    video_id: video.id,
                    video_title: video.title,
                    status: 'pending',
                    progress: 0,
                    created_at: new Date().toISOString(),
                    started_at: null,
                    completed_at: null,
                    duration: null,
                    input_format: video.format,
                    input_resolution: video.resolution,
                    output_formats: ['mp4'],
                    output_qualities: ['high'],
                    output_resolutions: [video.resolution],
                    error_message: null,
                    worker_node: `transcode-worker-${Math.floor(Math.random() * 5) + 1}`,
                    priority: 'high'
                };
                setTranscodingJobs(prev => [...prev, newJob]);
            });
            showToast(`${failedVideos.length} failed videos queued for retry`, 'success');
        }
        setBulkAction('');
    };

    const handleUploadVideo = (files) => {
        Array.from(files).forEach(file => {
            const newVideo = {
                id: `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                title: file.name.replace(/\.[^/.]+$/, ""),
                description: 'Uploaded video',
                file_name: file.name,
                file_size: file.size,
                duration: 0, // Will be determined after upload
                resolution: 'unknown',
                quality: 'unknown',
                format: file.name.split('.').pop(),
                codec: 'unknown',
                bitrate: 0,
                frame_rate: 0,
                audio_codec: 'unknown',
                audio_bitrate: 0,
                audio_channels: 0,
                status: 'uploading',
                upload_date: new Date().toISOString(),
                transcoding_date: null,
                storage_path: `/videos/original/${file.name}`,
                thumbnail_path: `/thumbnails/${file.name}.jpg`,
                transcoded_files: [],
                metadata: {},
                tags: [],
                categories: [],
                views: 0,
                downloads: 0,
                shares: 0,
                likes: 0,
                comments: 0,
                transcoding_status: 'pending',
                transcoding_progress: 0,
                error_message: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            setVideos(prev => [...prev, newVideo]);

            // Simulate upload progress
            setTimeout(() => {
                setVideos(prev => prev.map(v =>
                    v.id === newVideo.id
                        ? { ...v, status: 'uploaded', transcoding_status: 'pending' }
                        : v
                ));

                // Create transcoding job
                const newJob = {
                    id: `job_${Date.now()}_${newVideo.id}`,
                    video_id: newVideo.id,
                    video_title: newVideo.title,
                    status: 'pending',
                    progress: 0,
                    created_at: new Date().toISOString(),
                    started_at: null,
                    completed_at: null,
                    duration: null,
                    input_format: newVideo.format,
                    input_resolution: 'unknown',
                    output_formats: ['mp4'],
                    output_qualities: ['high', 'medium', 'low'],
                    output_resolutions: ['1920x1080', '1280x720', '640x480'],
                    error_message: null,
                    worker_node: `transcode-worker-${Math.floor(Math.random() * 5) + 1}`,
                    priority: 'normal'
                };
                setTranscodingJobs(prev => [...prev, newJob]);
            }, 2000);
        });

        showToast(`${files.length} videos uploaded successfully`, 'success');
    };

    const handleDeleteVideo = (videoId) => {
        if (confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
            setVideos(prev => prev.filter(v => v.id !== videoId));
            setTranscodingJobs(prev => prev.filter(j => j.video_id !== videoId));
            showToast('Video deleted', 'success');
        }
    };

    const handleRetryTranscoding = (videoId) => {
        const video = videos.find(v => v.id === videoId);
        if (video) {
            const newJob = {
                id: `job_${Date.now()}_${video.id}`,
                video_id: video.id,
                video_title: video.title,
                status: 'pending',
                progress: 0,
                created_at: new Date().toISOString(),
                started_at: null,
                completed_at: null,
                duration: null,
                input_format: video.format,
                input_resolution: video.resolution,
                output_formats: ['mp4'],
                output_qualities: ['high'],
                output_resolutions: [video.resolution],
                error_message: null,
                worker_node: `transcode-worker-${Math.floor(Math.random() * 5) + 1}`,
                priority: 'high'
            };
            setTranscodingJobs(prev => [...prev, newJob]);
            showToast('Transcoding job queued for retry', 'success');
        }
    };

    const toggleVideoSelection = (videoId) => {
        setSelectedVideos(prev =>
            prev.includes(videoId)
                ? prev.filter(id => id !== videoId)
                : [...prev, videoId]
        );
    };

    const selectAllVideos = () => {
        if (selectedVideos.length === videos.length) {
            setSelectedVideos([]);
        } else {
            setSelectedVideos(videos.map(v => v.id));
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDuration = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return [h, m, s]
            .map(v => v < 10 ? '0' + v : v)
            .filter((v, i) => v !== '00' || i > 0)
            .join(':');
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'completed': return { color: 'green', text: 'Completed', icon: <CheckCircle size={14} /> };
            case 'in_progress': return { color: 'blue', text: 'In Progress', icon: <RefreshCw size={14} /> };
            case 'pending': return { color: 'yellow', text: 'Pending', icon: <Clock size={14} /> };
            case 'failed': return { color: 'red', text: 'Failed', icon: <XCircle size={14} /> };
            case 'uploading': return { color: 'blue', text: 'Uploading', icon: <Upload size={14} /> };
            case 'uploaded': return { color: 'green', text: 'Uploaded', icon: <FileCheckIcon size={14} /> };
            case 'transcoding': return { color: 'blue', text: 'Transcoding', icon: <RefreshCw size={14} /> };
            case 'transcoded': return { color: 'green', text: 'Transcoded', icon: <CheckCircle size={14} /> };
            case 'error': return { color: 'red', text: 'Error', icon: <AlertTriangle size={14} /> };
            default: return { color: 'gray', text: status, icon: <FileTextIcon size={14} /> };
        }
    };

    const getQualityBadge = (quality) => {
        switch (quality) {
            case 'ultra': return { color: 'purple', text: 'Ultra HD', icon: <FileVideo size={14} /> };
            case 'high': return { color: 'green', text: 'High', icon: <FileVideo size={14} /> };
            case 'medium': return { color: 'blue', text: 'Medium', icon: <FileVideo size={14} /> };
            case 'low': return { color: 'orange', text: 'Low', icon: <FileVideo size={14} /> };
            default: return { color: 'gray', text: quality, icon: <FileVideo size={14} /> };
        }
    };

    return (
        <div className="video-management-tab">
            {/* Header */}
            <div className="tab-header">
                <div className="header-left">
                    <h2>Video Management</h2>
                    <p>Advanced video transcoding, storage optimization, and content delivery management</p>
                </div>
                <div className="header-actions">
                    <button className="btn-secondary" onClick={() => setShowStorageModal(true)}>
                        <Globe size={18} />
                        Storage Analytics
                    </button>
                    <button className="btn-secondary" onClick={() => setShowAnalyticsModal(true)}>
                        <BarChart3 size={18} />
                        Video Analytics
                    </button>
                    <button className="btn-primary" onClick={() => setShowUploadModal(true)}>
                        <Upload size={18} />
                        Upload Videos
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="tabs-navigation">
                <div className="tab-buttons">
                    <button
                        className={`tab-btn ${currentTab === 'videos' ? 'active' : ''}`}
                        onClick={() => setCurrentTab('videos')}
                    >
                        <Video size={16} />
                        Videos
                    </button>
                    <button
                        className={`tab-btn ${currentTab === 'transcoding' ? 'active' : ''}`}
                        onClick={() => setCurrentTab('transcoding')}
                    >
                        <RefreshCw size={16} />
                        Transcoding Jobs
                    </button>
                    <button
                        className={`tab-btn ${currentTab === 'storage' ? 'active' : ''}`}
                        onClick={() => setCurrentTab('storage')}
                    >
                        <File size={16} />
                        Storage Management
                    </button>
                    <button
                        className={`tab-btn ${currentTab === 'analytics' ? 'active' : ''}`}
                        onClick={() => setCurrentTab('analytics')}
                    >
                        <BarChart3 size={16} />
                        Analytics
                    </button>
                </div>
            </div>

            {/* Videos Tab */}
            {currentTab === 'videos' && (
                <>
                    {/* Filters */}
                    <div className="filters-section">
                        <div className="search-filters">
                            <div className="search-box">
                                <Search size={20} className="search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search videos by title, description, or tags..."
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
                                    <option value="completed">Completed</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="pending">Pending</option>
                                    <option value="failed">Failed</option>
                                    <option value="uploading">Uploading</option>
                                    <option value="uploaded">Uploaded</option>
                                    <option value="transcoding">Transcoding</option>
                                    <option value="transcoded">Transcoded</option>
                                    <option value="error">Error</option>
                                </select>

                                <select
                                    value={filters.quality}
                                    onChange={(e) => handleFilterChange('quality', e.target.value)}
                                >
                                    <option value="all">All Qualities</option>
                                    <option value="ultra">Ultra HD</option>
                                    <option value="high">High</option>
                                    <option value="medium">Medium</option>
                                    <option value="low">Low</option>
                                </select>

                                <select
                                    value={filters.format}
                                    onChange={(e) => handleFilterChange('format', e.target.value)}
                                >
                                    <option value="all">All Formats</option>
                                    <option value="mp4">MP4</option>
                                    <option value="webm">WebM</option>
                                    <option value="mov">MOV</option>
                                    <option value="avi">AVI</option>
                                </select>

                                <input
                                    type="number"
                                    placeholder="Min duration (sec)"
                                    value={filters.duration_min}
                                    onChange={(e) => handleFilterChange('duration_min', e.target.value)}
                                />

                                <input
                                    type="number"
                                    placeholder="Max duration (sec)"
                                    value={filters.duration_max}
                                    onChange={(e) => handleFilterChange('duration_max', e.target.value)}
                                />

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
                            <button className="btn-secondary" onClick={() => setShowTranscodingModal(true)}>
                                <Settings size={18} />
                                Transcoding Settings
                            </button>
                        </div>
                    </div>

                    {/* Bulk Actions */}
                    {selectedVideos.length > 0 && (
                        <div className="bulk-actions">
                            <div className="selection-info">
                                {selectedVideos.length} videos selected
                            </div>
                            <div className="bulk-actions-controls">
                                <select
                                    value={bulkAction}
                                    onChange={(e) => setBulkAction(e.target.value)}
                                >
                                    <option value="">Bulk Actions</option>
                                    <option value="transcode">Start Transcoding</option>
                                    <option value="delete">Delete Videos</option>
                                    <option value="retry_failed">Retry Failed Videos</option>
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

                    {/* Videos Table */}
                    <div className="videos-table-container">
                        {isLoading ? (
                            <div className="loading-state">
                                <RefreshCw size={32} className="spin-anim" />
                                <p>Loading videos...</p>
                            </div>
                        ) : (
                            <>
                                <div className="table-header">
                                    <div className="select-all">
                                        <input
                                            type="checkbox"
                                            checked={selectedVideos.length === videos.length && videos.length > 0}
                                            onChange={selectAllVideos}
                                        />
                                        <span>Select All</span>
                                    </div>
                                    <div className="table-actions">
                                        <span className="video-count">{videos.length} videos found</span>
                                        <button className="btn-primary" onClick={() => setShowUploadModal(true)}>
                                            <Plus size={18} />
                                            Upload Video
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
                                                        checked={selectedVideos.length === videos.length && videos.length > 0}
                                                        onChange={selectAllVideos}
                                                    />
                                                </th>
                                                <th>Video Info</th>
                                                <th>Status & Quality</th>
                                                <th>Technical Specs</th>
                                                <th>Storage & Performance</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {videos.map(video => (
                                                <tr key={video.id} className={video.status === 'error' ? 'error-video' : video.status === 'transcoding' ? 'transcoding-video' : ''}>
                                                    <td>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedVideos.includes(video.id)}
                                                            onChange={() => toggleVideoSelection(video.id)}
                                                        />
                                                    </td>
                                                    <td>
                                                        <div className="video-info">
                                                            <div className="video-thumbnail">
                                                                <img src={video.thumbnail_path} alt={video.title} />
                                                                <div className="video-duration">{formatDuration(video.duration)}</div>
                                                            </div>
                                                            <div className="video-details">
                                                                <div className="video-title">
                                                                    <strong>{video.title}</strong>
                                                                    <span className="video-id">ID: {video.id}</span>
                                                                </div>
                                                                <div className="video-description">
                                                                    <p>{video.description}</p>
                                                                </div>
                                                                <div className="video-meta">
                                                                    <span className="video-file-name">{video.file_name}</span>
                                                                    <span className="video-upload-date">Uploaded: {new Date(video.upload_date).toLocaleDateString()}</span>
                                                                </div>
                                                                <div className="video-tags">
                                                                    {video.tags.map(tag => (
                                                                        <span key={tag} className="tag-pill">{tag}</span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="status-info">
                                                            <div className="status-badge">
                                                                <span className={`status-pill ${getStatusBadge(video.status).color}`}>
                                                                    {getStatusBadge(video.status).icon}
                                                                    {getStatusBadge(video.status).text}
                                                                </span>
                                                                <span className={`quality-pill ${getQualityBadge(video.quality).color}`}>
                                                                    {getQualityBadge(video.quality).icon}
                                                                    {getQualityBadge(video.quality).text}
                                                                </span>
                                                                <span className={`format-pill ${video.format === 'mp4' ? 'green' : video.format === 'webm' ? 'blue' : 'orange'}`}>
                                                                    {video.format.toUpperCase()}
                                                                </span>
                                                            </div>
                                                            <div className="transcoding-status">
                                                                {video.transcoding_status !== 'completed' && (
                                                                    <div className="progress-bar">
                                                                        <div
                                                                            className="progress-fill"
                                                                            style={{ width: `${video.transcoding_progress}%` }}
                                                                        ></div>
                                                                        <span className="progress-text">{video.transcoding_progress}%</span>
                                                                    </div>
                                                                )}
                                                                {video.error_message && (
                                                                    <div className="error-message">
                                                                        <AlertTriangle size={12} />
                                                                        <span>{video.error_message}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="video-stats">
                                                                <span className="views-count">{video.views.toLocaleString()} views</span>
                                                                <span className="downloads-count">{video.downloads} downloads</span>
                                                                <span className="shares-count">{video.shares} shares</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="specs-info">
                                                            <div className="specs-grid">
                                                                <div className="spec-item">
                                                                    <span className="spec-label">Resolution:</span>
                                                                    <span className="spec-value">{video.resolution}</span>
                                                                </div>
                                                                <div className="spec-item">
                                                                    <span className="spec-label">Codec:</span>
                                                                    <span className="spec-value">{video.codec}</span>
                                                                </div>
                                                                <div className="spec-item">
                                                                    <span className="spec-label">Bitrate:</span>
                                                                    <span className="spec-value">{video.bitrate} kbps</span>
                                                                </div>
                                                                <div className="spec-item">
                                                                    <span className="spec-label">Frame Rate:</span>
                                                                    <span className="spec-value">{video.frame_rate} fps</span>
                                                                </div>
                                                                <div className="spec-item">
                                                                    <span className="spec-label">Audio:</span>
                                                                    <span className="spec-value">{video.audio_codec} {video.audio_bitrate}kbps {video.audio_channels}ch</span>
                                                                </div>
                                                                <div className="spec-item">
                                                                    <span className="spec-label">Duration:</span>
                                                                    <span className="spec-value">{formatDuration(video.duration)}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="storage-info">
                                                            <div className="storage-metrics">
                                                                <div className="metric-item">
                                                                    <File size={14} />
                                                                    <div>
                                                                        <strong>{formatFileSize(video.file_size)}</strong>
                                                                        <small>File Size</small>
                                                                    </div>
                                                                </div>
                                                                <div className="metric-item">
                                                                    <Users size={14} />
                                                                    <div>
                                                                        <strong>{video.views.toLocaleString()}</strong>
                                                                        <small>Views</small>
                                                                    </div>
                                                                </div>
                                                                <div className="metric-item">
                                                                    <Download size={14} />
                                                                    <div>
                                                                        <strong>{video.downloads}</strong>
                                                                        <small>Downloads</small>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="storage-actions">
                                                                <span className="storage-path">{video.storage_path}</span>
                                                                <div className="transcoded-count">
                                                                    {video.transcoded_files.length} transcoded versions
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="action-buttons">
                                                            <button
                                                                className="action-btn view"
                                                                onClick={() => window.open(video.storage_path, '_blank')}
                                                                title="Preview Video"
                                                            >
                                                                <Eye size={16} />
                                                            </button>
                                                            <button
                                                                className="action-btn edit"
                                                                onClick={() => setEditingVideo(video)}
                                                                title="Edit Video"
                                                            >
                                                                <Edit size={16} />
                                                            </button>
                                                            {video.status === 'error' && (
                                                                <button
                                                                    className="action-btn retry"
                                                                    onClick={() => handleRetryTranscoding(video.id)}
                                                                    title="Retry Transcoding"
                                                                >
                                                                    <RefreshCw size={16} />
                                                                </button>
                                                            )}
                                                            <button
                                                                className="action-btn delete"
                                                                onClick={() => handleDeleteVideo(video.id)}
                                                                title="Delete Video"
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

            {/* Transcoding Jobs Tab */}
            {currentTab === 'transcoding' && (
                <div className="transcoding-tab">
                    <div className="transcoding-header">
                        <h3>Transcoding Job Management</h3>
                        <div className="transcoding-actions">
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

                    <div className="transcoding-stats">
                        <div className="stat-card">
                            <div className="stat-icon success">
                                <CheckCircle size={24} />
                            </div>
                            <div className="stat-content">
                                <span className="stat-label">Completed</span>
                                <strong>{mockStorageStats.transcoding_stats.completed}</strong>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon processing">
                                <RefreshCw size={24} />
                            </div>
                            <div className="stat-content">
                                <span className="stat-label">In Progress</span>
                                <strong>{mockStorageStats.transcoding_stats.in_progress}</strong>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon error">
                                <XCircle size={24} />
                            </div>
                            <div className="stat-content">
                                <span className="stat-label">Failed</span>
                                <strong>{mockStorageStats.transcoding_stats.failed}</strong>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon total">
                                <FileTextIcon size={24} />
                            </div>
                            <div className="stat-content">
                                <span className="stat-label">Success Rate</span>
                                <strong>{(mockStorageStats.transcoding_stats.success_rate * 100).toFixed(1)}%</strong>
                            </div>
                        </div>
                    </div>

                    <div className="transcoding-jobs-container">
                        <div className="table-header">
                            <h4>Active Transcoding Jobs</h4>
                            <span className="job-count">{transcodingJobs.length} jobs</span>
                        </div>

                        <div className="table-responsive">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Job Info</th>
                                        <th>Status & Progress</th>
                                        <th>Input Specs</th>
                                        <th>Output Specs</th>
                                        <th>Performance</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transcodingJobs.map(job => (
                                        <tr key={job.id} className={job.status === 'failed' ? 'failed-job' : job.status === 'in_progress' ? 'in-progress-job' : ''}>
                                            <td>
                                                <div className="job-info">
                                                    <div className="job-title">
                                                        <strong>{job.video_title}</strong>
                                                        <span className="job-id">Job: {job.id}</span>
                                                    </div>
                                                    <div className="job-meta">
                                                        <span className="job-created">Created: {new Date(job.created_at).toLocaleString()}</span>
                                                        <span className="job-worker">Worker: {job.worker_node}</span>
                                                        <span className="job-priority">Priority: {job.priority}</span>
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
                                                <div className="input-specs">
                                                    <div className="spec-item">
                                                        <span className="spec-label">Format:</span>
                                                        <span className="spec-value">{job.input_format}</span>
                                                    </div>
                                                    <div className="spec-item">
                                                        <span className="spec-label">Resolution:</span>
                                                        <span className="spec-value">{job.input_resolution}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="output-specs">
                                                    <div className="output-formats">
                                                        <strong>Formats:</strong>
                                                        {job.output_formats.map(format => (
                                                            <span key={format} className="format-pill">{format}</span>
                                                        ))}
                                                    </div>
                                                    <div className="output-qualities">
                                                        <strong>Qualities:</strong>
                                                        {job.output_qualities.map(quality => (
                                                            <span key={quality} className="quality-pill">{quality}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="performance-info">
                                                    <div className="perf-item">
                                                        <span className="perf-label">Duration:</span>
                                                        <span className="perf-value">{job.duration ? formatDuration(job.duration) : 'N/A'}</span>
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
                                    <div className="metric-value">{storageStats.total_videos}</div>
                                    <div className="metric-label">Total Videos</div>
                                </div>
                            </div>

                            <div className="metric-card">
                                <div className="metric-icon">
                                    <FileArchive size={24} />
                                </div>
                                <div className="metric-content">
                                    <div className="metric-value">{formatFileSize(storageStats.total_storage)}</div>
                                    <div className="metric-label">Total Storage</div>
                                </div>
                            </div>

                            <div className="metric-card">
                                <div className="metric-icon">
                                    <FileCheckIcon size={24} />
                                </div>
                                <div className="metric-content">
                                    <div className="metric-value">{formatFileSize(storageStats.used_storage)}</div>
                                    <div className="metric-label">Used Storage</div>
                                </div>
                            </div>

                            <div className="metric-card">
                                <div className="metric-icon">
                                    <FilePlus size={24} />
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
                            <h4>By Format</h4>
                            <div className="format-breakdown">
                                {Object.entries(storageStats.formats || {}).map(([format, data]) => (
                                    <div key={format} className="format-item">
                                        <div className="format-info">
                                            <span className="format-name">{format.toUpperCase()}</span>
                                            <span className="format-count">{data.count} videos</span>
                                        </div>
                                        <div className="format-storage">
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

                        <div className="breakdown-section">
                            <h4>By Quality</h4>
                            <div className="quality-breakdown">
                                {Object.entries(storageStats.qualities || {}).map(([quality, data]) => (
                                    <div key={quality} className="quality-item">
                                        <div className="quality-info">
                                            <span className="quality-name">{quality.toUpperCase()}</span>
                                            <span className="quality-count">{data.count} videos</span>
                                        </div>
                                        <div className="quality-storage">
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
                </div>
            )}

            {/* Analytics Tab */}
            {currentTab === 'analytics' && (
                <div className="analytics-tab">
                    <div className="analytics-header">
                        <h3>Video Analytics & Performance</h3>
                        <div className="analytics-actions">
                            <button className="btn-secondary">
                                <BarChart3 size={18} />
                                Export Report
                            </button>
                            <button className="btn-primary">
                                <TrendingUp size={18} />
                                Performance Trends
                            </button>
                        </div>
                    </div>

                    <div className="analytics-metrics">
                        <div className="metric-card">
                            <div className="metric-icon">
                                <Eye size={24} />
                            </div>
                            <div className="metric-content">
                                <div className="metric-value">{videos.reduce((sum, v) => sum + v.views, 0).toLocaleString()}</div>
                                <div className="metric-label">Total Views</div>
                            </div>
                        </div>

                        <div className="metric-card">
                            <div className="metric-icon">
                                <Download size={24} />
                            </div>
                            <div className="metric-content">
                                <div className="metric-value">{videos.reduce((sum, v) => sum + v.downloads, 0)}</div>
                                <div className="metric-label">Total Downloads</div>
                            </div>
                        </div>

                        <div className="metric-card">
                            <div className="metric-icon">
                                <Share2 size={24} />
                            </div>
                            <div className="metric-content">
                                <div className="metric-value">{videos.reduce((sum, v) => sum + v.shares, 0)}</div>
                                <div className="metric-label">Total Shares</div>
                            </div>
                        </div>

                        <div className="metric-card">
                            <div className="metric-icon">
                                <Users size={24} />
                            </div>
                            <div className="metric-content">
                                <div className="metric-value">{videos.reduce((sum, v) => sum + v.likes, 0)}</div>
                                <div className="metric-label">Total Likes</div>
                            </div>
                        </div>
                    </div>

                    <div className="analytics-breakdown">
                        <div className="breakdown-section">
                            <h4>Top Performing Videos</h4>
                            <div className="top-videos">
                                {videos
                                    .sort((a, b) => b.views - a.views)
                                    .slice(0, 5)
                                    .map(video => (
                                        <div key={video.id} className="top-video-item">
                                            <div className="video-thumbnail-small">
                                                <img src={video.thumbnail_path} alt={video.title} />
                                            </div>
                                            <div className="video-stats">
                                                <strong>{video.title}</strong>
                                                <div className="stat-row">
                                                    <span className="stat-item">Views: {video.views.toLocaleString()}</span>
                                                    <span className="stat-item">Downloads: {video.downloads}</span>
                                                    <span className="stat-item">Shares: {video.shares}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>

                        <div className="breakdown-section">
                            <h4>Transcoding Performance</h4>
                            <div className="transcoding-performance">
                                <div className="perf-metric">
                                    <span className="perf-label">Average Transcoding Time:</span>
                                    <span className="perf-value">{storageStats.transcoding_stats.avg_transcoding_time} seconds</span>
                                </div>
                                <div className="perf-metric">
                                    <span className="perf-label">Success Rate:</span>
                                    <span className="perf-value">{(storageStats.transcoding_stats.success_rate * 100).toFixed(1)}%</span>
                                </div>
                                <div className="perf-metric">
                                    <span className="perf-label">Total Jobs:</span>
                                    <span className="perf-value">{storageStats.transcoding_stats.total_jobs}</span>
                                </div>
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
                            <h3>Upload Videos</h3>
                            <button className="close-btn" onClick={() => setShowUploadModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
                                <div className="upload-icon">
                                    <Upload size={48} />
                                </div>
                                <div className="upload-text">
                                    <h4>Drag and drop videos here</h4>
                                    <p>or click to select files</p>
                                    <p className="upload-hint">Supported formats: MP4, WebM, MOV, AVI</p>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    accept="video/*"
                                    onChange={(e) => handleUploadVideo(e.target.files)}
                                    style={{ display: 'none' }}
                                />
                            </div>

                            <div className="upload-settings">
                                <h4>Upload Settings</h4>
                                <div className="setting-group">
                                    <label>
                                        <input type="checkbox" defaultChecked />
                                        Auto-transcode to multiple qualities
                                    </label>
                                    <label>
                                        <input type="checkbox" defaultChecked />
                                        Generate thumbnails
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

            {/* Transcoding Settings Modal */}
            {showTranscodingModal && (
                <div className="modal-overlay" onClick={() => setShowTranscodingModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
                        <div className="modal-header">
                            <h3>Transcoding Settings</h3>
                            <button className="close-btn" onClick={() => setShowTranscodingModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="settings-grid">
                                <div className="setting-section">
                                    <h4>Output Qualities</h4>
                                    <div className="quality-settings">
                                        <div className="quality-item">
                                            <label>High Quality (1080p)</label>
                                            <div className="quality-config">
                                                <input type="number" placeholder="Bitrate (kbps)" defaultValue="5000" />
                                                <input type="number" placeholder="Frame Rate" defaultValue="30" />
                                            </div>
                                        </div>
                                        <div className="quality-item">
                                            <label>Medium Quality (720p)</label>
                                            <div className="quality-config">
                                                <input type="number" placeholder="Bitrate (kbps)" defaultValue="2500" />
                                                <input type="number" placeholder="Frame Rate" defaultValue="30" />
                                            </div>
                                        </div>
                                        <div className="quality-item">
                                            <label>Low Quality (480p)</label>
                                            <div className="quality-config">
                                                <input type="number" placeholder="Bitrate (kbps)" defaultValue="1000" />
                                                <input type="number" placeholder="Frame Rate" defaultValue="30" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="setting-section">
                                    <h4>Codec Settings</h4>
                                    <div className="codec-settings">
                                        <div className="codec-item">
                                            <label>Video Codec</label>
                                            <select defaultValue="h264">
                                                <option value="h264">H.264</option>
                                                <option value="h265">H.265</option>
                                                <option value="vp9">VP9</option>
                                            </select>
                                        </div>
                                        <div className="codec-item">
                                            <label>Audio Codec</label>
                                            <select defaultValue="aac">
                                                <option value="aac">AAC</option>
                                                <option value="mp3">MP3</option>
                                                <option value="opus">Opus</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button type="button" className="btn-secondary" onClick={() => setShowTranscodingModal(false)}>
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

export default VideoManagementTab;