import React from 'react';

const Logo = ({ className = "", width = "180px", height = "60px" }) => {
    return (
        <svg
            width={width}
            height={height}
            viewBox="0 0 360 120"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <style>
                {`
                .pulse {
                    animation: pulse 2.8s ease-in-out infinite;
                    transform-origin: center;
                }

                .fade-in {
                    animation: fadeIn 1.4s ease forwards;
                    opacity: 0;
                }

                .fade-in-delay {
                    animation-delay: 0.5s;
                }

                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.04); opacity: 0.95; }
                    100% { transform: scale(1); opacity: 1; }
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(6px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                `}
            </style>

            {/* Icon background */}
            <circle cx="60" cy="60" r="48" fill="#2563EB" className="pulse" />

            {/* Chat bubble */}
            <path d="M40 40
                   h40
                   a10 10 0 0 1 10 10
                   v18
                   a10 10 0 0 1 -10 10
                   h-18
                   l-10 10
                   v-10
                   h-12
                   a10 10 0 0 1 -10 -10
                   v-18
                   a10 10 0 0 1 10 -10z"
                fill="#ffffff" />

            {/* K letter */}
            <text x="50" y="72"
                fontSize="30"
                fontWeight="bold"
                fill="#2563EB"
                fontFamily="Arial, Helvetica, sans-serif">
                K
            </text>

            {/* Brand text */}
            <text x="130" y="56"
                fontSize="38"
                fontWeight="800"
                fill="#2563EB"
                letterSpacing="0.5"
                fontFamily="Arial, Helvetica, sans-serif"
                className="fade-in">
                Karu
            </text>

            <text x="132" y="92"
                fontSize="26"
                fontWeight="600"
                fill="#22C55E"
                fontFamily="Arial, Helvetica, sans-serif"
                className="fade-in fade-in-delay">
                Teens
            </text>
        </svg>
    );
};

export default Logo;
