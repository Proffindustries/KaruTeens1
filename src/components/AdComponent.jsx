import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import api from '../api/client';
import safeLocalStorage from '../utils/storage.js';

/**
 * AdComponent for Adsterra, AdSense, and Local Ad Integration.
 * Respects Premium status: show only Local Ads to Premium users.
 */
const AdComponent = ({ type = 'auto', page = 'general' }) => {
    const { user } = useAuth();
    const isPremium = user?.is_premium || false;
    const [localAd, setLocalAd] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [hasTrackedImpression, setHasTrackedImpression] = useState(false);
    const [shouldShow, setShouldShow] = useState(true);

    useEffect(() => {
        // Frequency capping check
        const checkFrequency = () => {
            if (!localAd) return;

            const lastShown = safeLocalStorage.getItem(`ad_last_shown_${localAd.id}`);
            if (lastShown) {
                const lastDate = new Date(parseInt(lastShown));
                const now = new Date();

                // Default: once per day (24h)
                let capHours = 24;
                if (localAd.frequency_capping?.time_period === 'hour') {
                    capHours = 1;
                } else if (localAd.frequency_capping?.time_period === 'week') {
                    capHours = 24 * 7;
                }

                const diffMs = now - lastDate;
                const diffHours = diffMs / (1000 * 60 * 60);

                if (diffHours < capHours) {
                    setShouldShow(false);
                    return;
                }
            }
            setShouldShow(true);
        };

        checkFrequency();
    }, [localAd]);

    const trackAdEvent = async (creativeId, eventType) => {
        try {
            if (eventType === 'impression') {
                safeLocalStorage.setItem(`ad_last_shown_${creativeId}`, Date.now().toString());
            }
            await api.post('/ads/tracker', {
                creative_id: creativeId,
                event_type: eventType,
            });
        } catch (err) {
            console.error(`Failed to track ${eventType} for creative ${creativeId}:`, err);
        }
    };

    // Helper function for Cloudinary optimization
    const getOptimizedAdUrl = (url, transformations = 'f_auto,q_auto,w_1080') => {
        if (!url || !url.includes('cloudinary.com')) return url;
        const cloudinaryRegex =
            /(https?:\/\/res\.cloudinary\.com\/[^/]+\/(image|video)\/upload\/)(v\d+\/)?(.+)/;
        const match = url.match(cloudinaryRegex);
        if (match) {
            const baseUrl = match[1];
            const version = match[3] || '';
            const publicId = match[4];
            return `${baseUrl}${transformations}/${version}${publicId}`;
        }
        return url;
    };

    useEffect(() => {
        // Fetch local ads from backend - Future endpoint based on ad system
        const fetchLocalAds = async () => {
            setIsLoading(true);
            try {
                // Call the active ads endpoint
                const { data } = await api.get('/ads/active', {
                    params: { placement: page, limit: 1 },
                });
                if (data && data.length > 0) {
                    setLocalAd(data[0]);
                }
            } catch (err) {
                // Silently fail if no local ads or endpoint not ready
                console.log('Local ad system pending or no active local ads.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchLocalAds();
    }, [page]);

    useEffect(() => {
        if (localAd && !hasTrackedImpression) {
            trackAdEvent(localAd.id, 'impression');
            setHasTrackedImpression(true);
        }
    }, [localAd, hasTrackedImpression]);

    useEffect(() => {
        // Load AdSense script (Adsterra was disabled because its invoke.js uses document.write
        // which wipes the DOM causing a white screen in React apps)
        if (!isPremium) {
            // Load AdSense script
            const ADSENSE_ID = 'adsbygoogle-js';
            if (!document.getElementById(ADSENSE_ID)) {
                const script = document.createElement('script');
                script.id = ADSENSE_ID;
                script.src =
                    'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' +
                    (import.meta.env.VITE_ADSENSE_CLIENT_ID || 'ca-pub-placeholder');
                script.async = true;
                script.crossOrigin = 'anonymous';
                document.body.appendChild(script);
            }
        }
    }, [isPremium]);

    // Dedicated useEffect for pushing to adsbygoogle
    useEffect(() => {
        if (isPremium || localAd || !shouldShow) return;

        let observer = null;
        let pushed = false;

        const pushAd = () => {
            if (pushed) return;
            try {
                const adsbygoogle = window.adsbygoogle || [];
                const adElements = document.querySelectorAll(
                    '.adsbygoogle:not([data-adsbygoogle-status="done"])',
                );

                if (adElements.length > 0) {
                    const lastElement = adElements[adElements.length - 1];
                    // Verify width and visibility with a stricter check
                    const offsetWidth = lastElement.offsetWidth;
                    if (
                        offsetWidth > 50 &&
                        window.getComputedStyle(lastElement).display !== 'none'
                    ) {
                        adsbygoogle.push({});
                        pushed = true;
                        if (observer) observer.disconnect();
                    }
                }
            } catch (err) {
                console.warn('AdSense push failed:', err);
            }
        };

        // Try immediately after a small delay
        const timer = setTimeout(pushAd, 500);

        // Also use ResizeObserver to catch layout changes
        const adReserve = document.querySelector('.adsense-reserve');
        if (adReserve && 'ResizeObserver' in window) {
            observer = new ResizeObserver(() => {
                if (!pushed) pushAd();
            });
            observer.observe(adReserve);
        }

        return () => {
            clearTimeout(timer);
            if (observer) observer.disconnect();
        };
    }, [isPremium, localAd, shouldShow, page]);

    // If premium and no local ads, hide the component entirely to provide a clean experience
    if (isPremium && (!localAd || !shouldShow)) return null;
    if (!shouldShow && localAd) return null;

    return (
        <div className="ad-container-wrapper" style={{ margin: '2rem 0', textAlign: 'center' }}>
            <div
                className="ad-label-wrapper"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginBottom: '0.75rem',
                }}
            >
                <span
                    style={{
                        height: '1px',
                        flex: '1',
                        background: 'rgba(var(--border), 0.3)',
                        maxWidth: '50px',
                    }}
                ></span>
                <span
                    style={{
                        fontSize: '0.65rem',
                        fontWeight: '700',
                        color: 'rgb(var(--text-muted))',
                        textTransform: 'uppercase',
                        letterSpacing: '1.2px',
                    }}
                >
                    Sponsored {isPremium && ' • Campus Partner'}
                </span>
                <span
                    style={{
                        height: '1px',
                        flex: '1',
                        background: 'rgba(var(--border), 0.3)',
                        maxWidth: '50px',
                    }}
                ></span>
            </div>

            {/* Local Ad Content */}
            {localAd ? (
                <div
                    className="local-ad-card card shadow-sm"
                    style={{
                        padding: '0.75rem',
                        border: '1px solid rgba(var(--primary), 0.15)',
                        background: 'rgba(var(--surface), 0.5)',
                        textAlign: 'left',
                    }}
                >
                    <a
                        href={localAd.final_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ textDecoration: 'none', color: 'inherit' }}
                        onClick={() => trackAdEvent(localAd.id, 'click')}
                    >
                        {/* Image Ad */}
                        {localAd.creative_type === 'image' && localAd.assets?.[0]?.asset_url && (
                            <img
                                src={getOptimizedAdUrl(
                                    localAd.assets?.[0]?.asset_url,
                                    'f_auto,q_auto,w_800',
                                )}
                                alt={localAd.name || 'Advertisement'}
                                style={{
                                    width: '100%',
                                    borderRadius: 'var(--radius-sm)',
                                    marginBottom: '0.5rem',
                                    display: 'block',
                                }}
                                loading="lazy"
                            />
                        )}

                        {/* Video Ad */}
                        {localAd.creative_type === 'video' && localAd.assets?.[0]?.asset_url && (
                            <video
                                autoPlay
                                muted
                                loop
                                playsInline
                                poster={getOptimizedAdUrl(
                                    localAd.assets?.[0]?.asset_url,
                                    'f_auto,q_auto,so_1,w_800',
                                ).replace(/\.[^/.]+$/, '.jpg')}
                                style={{
                                    width: '100%',
                                    borderRadius: 'var(--radius-sm)',
                                    marginBottom: '0.5rem',
                                    display: 'block',
                                }}
                                aria-label={localAd.headline || 'Promotional Video'}
                            >
                                <source
                                    src={getOptimizedAdUrl(
                                        localAd.assets?.[0]?.asset_url,
                                        'f_auto,q_auto,vc_h265',
                                    )}
                                    type="video/mp4"
                                />
                                Your browser does not support the video tag.
                            </video>
                        )}

                        {/* Text Content */}
                        <h4 style={{ fontSize: '0.95rem', margin: '0 0 4px 0', fontWeight: '700' }}>
                            {localAd.headline}
                        </h4>
                        <p
                            style={{
                                fontSize: '0.8rem',
                                color: 'rgb(var(--text-muted))',
                                margin: 0,
                                lineHeight: '1.4',
                            }}
                        >
                            {localAd.description}
                        </p>

                        {localAd.call_to_action && (
                            <div
                                style={{
                                    marginTop: '0.75rem',
                                    display: 'inline-block',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    color: 'rgb(var(--primary))',
                                    borderBottom: '1px solid currentColor',
                                }}
                            >
                                {localAd.call_to_action} →
                            </div>
                        )}
                    </a>
                </div>
            ) : (
                /* External Ad Slot (Adsterra & AdSense) - Only visible to non-premium */
                !isPremium && (
                    <div className="external-ad-stack">
                        {/* Adsterra Invoke Unit */}
                        <div id="container-3705d905f3bea18853eecd342950b3cb"></div>

                        {/* Dedicated AdSense Room */}
                        <div
                            className="adsense-reserve"
                            style={{
                                marginTop: '1.5rem',
                                minHeight: '100px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <ins
                                className="adsbygoogle"
                                style={{ display: 'block' }}
                                data-ad-client={
                                    import.meta.env.VITE_ADSENSE_CLIENT_ID || 'ca-pub-placeholder'
                                }
                                data-ad-slot={import.meta.env.VITE_ADSENSE_SLOT_ID || 'placeholder'}
                                data-ad-format="auto"
                                data-full-width-responsive="true"
                            ></ins>
                        </div>
                    </div>
                )
            )}
        </div>
    );
};

export default AdComponent;
