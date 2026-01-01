import React, { useState, useEffect } from 'react';

const Avatar = ({ src, name, size = 'md', className = '', onClick }) => {
    const [imgError, setImgError] = useState(false);

    // Reset error state if src changes
    useEffect(() => {
        setImgError(false);
    }, [src]);

    const getInitials = (n) => {
        if (!n) return '?';
        const parts = n.trim().split(' ').filter(p => p.length > 0);
        if (parts.length === 0) return n[0]?.toUpperCase() || '?';
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    const sizeMap = {
        xs: 24,
        sm: 32,
        md: 40,
        lg: 48,
        xl: 64,
        '2xl': 96,
        '3xl': 128
    };

    const dimension = sizeMap[size] || (typeof size === 'number' ? size : parseInt(size)) || 40;

    const colors = [
        '#3498db', '#2ecc71', '#f1c40f',
        '#e74c3c', '#9b59b6', '#ff6b6b', '#48dbfb'
    ];

    let colorIndex = 0;
    if (name) {
        colorIndex = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    }
    const bgColor = colors[colorIndex];

    const style = {
        width: `${dimension}px`,
        height: `${dimension}px`,
        fontSize: `${dimension / 2.5}px`,
        minWidth: `${dimension}px`,
        minHeight: `${dimension}px`,
    };

    if (!src || imgError) {
        return (
            <div
                className={`avatar-placeholder ${className}`}
                style={{ ...style, backgroundColor: bgColor }}
                onClick={onClick}
            >
                {getInitials(name)}
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={name || 'Avatar'}
            className={`avatar-img ${className}`}
            style={style}
            onError={() => setImgError(true)}
            onClick={onClick}
        />
    );
};

export default Avatar;
