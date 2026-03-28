import React from 'react';
import {
    CheckCircle,
    ShieldCheck,
    FileClock,
    Calendar,
    XCircle,
    AlertTriangle,
    FileText,
    MessageCircle,
    Globe,
    AlertCircle,
    Zap,
} from 'lucide-react';

export const getStatusBadge = (status) => {
    switch (status) {
        case 'published':
            return { color: 'green', text: 'Published', icon: <CheckCircle size={14} /> };
        case 'approved':
            return { color: 'blue', text: 'Approved', icon: <ShieldCheck size={14} /> };
        case 'pending_review':
            return { color: 'orange', text: 'Pending Review', icon: <FileClock size={14} /> };
        case 'draft':
            return { color: 'gray', text: 'Draft', icon: <FileClock size={14} /> };
        case 'rejected':
            return { color: 'red', text: 'Rejected', icon: <XCircle size={14} /> };
        case 'scheduled':
            return { color: 'purple', text: 'Scheduled', icon: <Calendar size={14} /> };
        default:
            return { color: 'gray', text: status, icon: <AlertTriangle size={14} /> };
    }
};

export const getPostTypeBadge = (postType) => {
    switch (postType) {
        case 'article':
            return { color: 'blue', text: 'Article', icon: <FileText size={14} /> };
        case 'blog':
            return { color: 'green', text: 'Blog', icon: <MessageCircle size={14} /> };
        case 'news':
            return { color: 'orange', text: 'News', icon: <Globe size={14} /> };
        case 'announcement':
            return { color: 'red', text: 'Announcement', icon: <AlertCircle size={14} /> };
        case 'tutorial':
            return { color: 'purple', text: 'Tutorial', icon: <Zap size={14} /> };
        default:
            return { color: 'gray', text: postType, icon: <AlertTriangle size={14} /> };
    }
};

export const getDaysSinceCreated = (createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffTime = now - created;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

export const formatEngagementRate = (rate) => {
    return `${rate.toFixed(1)}%`;
};

export const getReadingTimeText = (minutes) => {
    if (minutes <= 1) return '1 min read';
    return `${minutes} min read`;
};
