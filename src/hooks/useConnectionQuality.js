import { useState, useEffect, useMemo } from 'react';

export const CONNECTION_QUALITY = {
    SLOW_2G: 'slow-2g',
    _2G: '2g',
    _3G: '3g',
    _4G: '4g',
};

const qualityLevels = {
    'slow-2g': 0,
    '2g': 1,
    '3g': 2,
    '4g': 3,
};

export const useConnectionQuality = () => {
    const [connection, setConnection] = useState(() => {
        if (typeof navigator === 'undefined' || !navigator.connection) return null;
        return {
            effectiveType: navigator.connection.effectiveType || '4g',
            downlink: navigator.connection.downlink || 10,
            rtt: navigator.connection.rtt || 50,
        };
    });

    useEffect(() => {
        const nc = navigator?.connection;
        if (!nc) return;

        const update = () => {
            setConnection({
                effectiveType: nc.effectiveType || '4g',
                downlink: nc.downlink || 10,
                rtt: nc.rtt || 50,
            });
        };

        nc.addEventListener('change', update);
        return () => nc.removeEventListener('change', update);
    }, []);

    return useMemo(() => {
        if (!connection)
            return { quality: CONNECTION_QUALITY._4G, level: 3, isSlow: false, isFast: true };

        const effectiveType = connection.effectiveType || '4g';
        const level = qualityLevels[effectiveType] ?? 3;
        const isSlow = level < 2;
        const isFast = level >= 3;

        return {
            quality: effectiveType,
            level,
            isSlow,
            isFast,
            downlink: connection.downlink,
            rtt: connection.rtt,
        };
    }, [connection]);
};
