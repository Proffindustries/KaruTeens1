import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import api from '../api/client';

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

    const trackAdEvent = async (creativeId, eventType) => {
        try {
            await api.post('/ads/tracker', {
                creative_id: creativeId,
                event_type: eventType
            });
        } catch (err) {
            console.error(`Failed to track ${eventType} for creative ${creativeId}:`, err);
        }
    };

    useEffect(() => {
        // Fetch local ads from backend - Future endpoint based on ad system
        const fetchLocalAds = async () => {
            setIsLoading(true);
            try {
                // Call the active ads endpoint
                const { data } = await api.get('/ads/active', { 
                    params: { page, limit: 1 } 
                });
                if (data && data.length > 0) {
                    setLocalAd(data[0]);
                }
            } catch (err) {
                // Silently fail if no local ads or endpoint not ready
                console.log("Local ad system pending or no active local ads.");
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
        // Load Adsterra script only for non-premium
        if (!isPremium) {
            const SCRIPT_ID = 'adsterra-invoke-js';
            if (!document.getElementById(SCRIPT_ID)) {
                const script = document.createElement('script');
                script.id = SCRIPT_ID;
                script.src = 'https://pl29110148.profitablecpmratenetwork.com/3705d905f3bea18853eecd342950b3cb/invoke.js';
                script.async = true;
                script.dataset.cfasync = 'false';
                document.body.appendChild(script);
            }
        }
    }, [isPremium]);

    // If premium and no local ads, hide the component entirely to provide a clean experience
    if (isPremium && !localAd) return null;

    return (
        <div className="ad-container-wrapper" style={{ margin: '2rem 0', textAlign: 'center' }}>
            <div className="ad-label-wrapper" style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '0.75rem'
            }}>
                <span style={{ 
                    height: '1px', 
                    flex: '1', 
                    background: 'rgba(var(--border), 0.3)',
                    maxWidth: '50px'
                }}></span>
                <span style={{ 
                    fontSize: '0.65rem', 
                    fontWeight: '700',
                    color: 'rgb(var(--text-muted))', 
                    textTransform: 'uppercase',
                    letterSpacing: '1.2px'
                }}>
                    Sponsored {isPremium && ' • Campus Partner'}
                </span>
                <span style={{ 
                    height: '1px', 
                    flex: '1', 
                    background: 'rgba(var(--border), 0.3)',
                    maxWidth: '50px'
                }}></span>
            </div>

            {/* Local Ad Content */}
            {localAd ? (
                <div className="local-ad-card card shadow-sm" style={{ 
                    padding: '0.75rem', 
                    border: '1px solid rgba(var(--primary), 0.15)',
                    background: 'rgba(var(--surface), 0.5)',
                    textAlign: 'left'
                }}>
                    <a 
                        href={localAd.final_url} 
                        target="_blank" 
                        rel="noreferrer" 
                        style={{ textDecoration: 'none', color: 'inherit' }}
                        onClick={() => trackAdEvent(localAd.id, 'click')}
                    >
                        {localAd.creative_type === 'image' && (
                            <img 
                                src={localAd.assets?.[0]?.asset_url} 
                                alt={localAd.name} 
                                style={{ width: '100%', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem' }} 
                            />
                        )}
                        <h4 style={{ fontSize: '0.95rem', margin: '0 0 4px 0' }}>{localAd.headline}</h4>
                        <p style={{ fontSize: '0.8rem', color: 'rgb(var(--text-muted))', margin: 0 }}>{localAd.description}</p>
                    </a>
                </div>
            ) : (
                /* External Ad Slot (Adsterra & AdSense) - Only visible to non-premium */
                !isPremium && (
                    <div className="external-ad-stack">
                        {/* Adsterra Invoke Unit */}
                        <div id="container-3705d905f3bea18853eecd342950b3cb"></div>
                        
                        {/* Dedicated AdSense Room (Placeholder for manual units) */}
                        <div className="adsense-reserve" style={{ 
                            marginTop: '1.5rem', 
                            minHeight: '100px', 
                            background: 'rgba(var(--text-muted), 0.05)',
                            border: '1px dashed rgba(var(--border), 0.5)',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '1rem'
                        }}>
                            <span style={{ fontSize: '0.7rem', color: 'rgb(var(--text-muted))', marginBottom: '4px' }}>Google AdSense</span>
                            <span style={{ fontSize: '0.6rem', color: 'rgb(var(--text-muted))', opacity: 0.6 }}>Placement ID: Manual_Unit_01</span>
                            {/* 
                                FUTURE: Insert AdSense code here 
                                <ins className="adsbygoogle"
                                     style={{display:'block'}}
                                     data-ad-client={import.meta.env.VITE_ADSENSE_CLIENT_ID || "ca-pub-placeholder"}
                                     data-ad-slot={import.meta.env.VITE_ADSENSE_SLOT_ID || "placeholder"}
                                     data-ad-format="auto"
                                     data-full-width-responsive="true"></ins>
                            */}
                        </div>
                    </div>
                )
            )}
        </div>
    );
};

export default AdComponent;
