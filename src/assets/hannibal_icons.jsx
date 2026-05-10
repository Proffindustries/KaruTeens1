import React from 'react';

export const HeartIcon = ({ size = 24, className = "" }) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={`hannibal-heart ${className}`}
    >
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        <path d="M12 5v12" opacity="0.5" />
        <path d="M10 8c-2 0-3 1-3 3" opacity="0.5" />
        <path d="M14 8c2 0 3 1 3 3" opacity="0.5" />
    </svg>
);

export const ForkIcon = ({ size = 24, className = "" }) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={`hannibal-fork ${className}`}
    >
        <path d="M7 2v10c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V2" />
        <path d="M10 2v6" />
        <path d="M12 2v6" />
        <path d="M14 2v6" />
        <path d="M12 14v8" />
    </svg>
);
