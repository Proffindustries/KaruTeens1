import React, { useState } from 'react';
import { ExternalLink, MapPin, Loader2 } from 'lucide-react';
import '../styles/MapPreview.css';

const MapPreview = ({ location, size = 'md' }) => {
    const [showConfirm, setShowConfirm] = useState(false);
    const [imgError, setImgError] = useState(false);

    if (!location || !location.latitude || !location.longitude) return null;

    // IMPORTANT: In a real app, you'd use a Google Maps API Key here.
    // For now, we use a placeholder that mimics the data-saving static map.
    // Replace YOUR_API_KEY with the actual key from .env if available.
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
    const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${location.latitude},${location.longitude}&zoom=15&size=400x200&markers=color:red%7C${location.latitude},${location.longitude}&key=${apiKey}`;

    const handleMapClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setShowConfirm(true);
    };

    const confirmExternal = () => {
        const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
        window.open(googleMapsUrl, '_blank');
        setShowConfirm(false);
    };

    return (
        <div className={`map-preview-container ${size}`} onClick={handleMapClick}>
            <div className="map-image-wrapper">
                {(!apiKey || imgError) ? (
                    <div className="map-placeholder">
                        <MapPin size={32} className="pin-icon" />
                        <span className="location-label-text">{location.label || '📍 Location Shared'}</span>
                        <div className="map-grid-pattern"></div>
                    </div>
                ) : (
                    <img
                        src={staticMapUrl}
                        alt="Map Location"
                        className="static-map-img"
                        onError={() => setImgError(true)}
                    />
                )}

                {location.is_live && (
                    <div className="live-badge">
                        <div className="pulse-dot"></div>
                        Live
                    </div>
                )}
            </div>

            <div className="map-overlay-info">
                <span>{location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</span>
                <ExternalLink size={14} />
            </div>

            {showConfirm && (
                <div className="map-confirm-overlay" onClick={(e) => e.stopPropagation()}>
                    <div className="confirm-bubble">
                        <p>Open in Google Maps?</p>
                        <div className="confirm-actions">
                            <button className="confirm-btn yes" onClick={confirmExternal}>Continue</button>
                            <button className="confirm-btn no" onClick={() => setShowConfirm(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MapPreview;
