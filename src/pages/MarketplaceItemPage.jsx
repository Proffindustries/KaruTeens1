import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Share2, Shield, Heart, Tag } from 'lucide-react';
import { motion } from 'framer-motion';
import '../styles/MarketplacePage.css';
import { useMarketplaceItem, useMarkSold } from '../hooks/useMarketplace.js';
import Avatar from '../components/Avatar.jsx';

const MarketplaceItemPage = () => {
    const { itemId } = useParams();
    const navigate = useNavigate();
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    const { data: item, isLoading, error } = useMarketplaceItem(itemId);
    const { mutate: markSold } = useMarkSold();
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    if (isLoading) return <div className="container item-detail-page">Loading item details...</div>;
    if (error) return <div className="container item-detail-page">Error loading item: {error.message}</div>;
    if (!item) return <div className="container item-detail-page">Item not found</div>;

    const isOwner = currentUser.username === item.seller_name; // Rough check, better with IDs if available in local storage

    const handleContactSeller = () => {
        // Navigate to messages with seller context
        // Assuming MessagesPage can handle this via state or query params
        navigate('/messages', { state: { recipientUsername: item.seller_name } });
    };

    const handleMarkSold = () => {
        if (window.confirm("Mark this item as sold?")) {
            markSold(item.id);
        }
    };

    return (
        <div className="container item-detail-page" style={{ padding: '2rem 1rem', maxWidth: '1000px' }}>
            <Link to="/marketplace" className="back-link" style={{ marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#636e72', textDecoration: 'none' }}>
                <ArrowLeft size={20} /> Back to Marketplace
            </Link>

            <div className="item-detail-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1.2fr) minmax(300px, 0.8fr)', gap: '2rem' }}>
                {/* Left: Images */}
                <div className="item-images">
                    <div className="main-image" style={{ borderRadius: '12px', overflow: 'hidden', marginBottom: '1rem', border: '1px solid #dfe6e9', aspectRatio: '4/3', backgroundColor: '#f5f6fa' }}>
                        {item.images && item.images.length > 0 ? (
                            <img
                                src={item.images[activeImageIndex]}
                                alt={item.title}
                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            />
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#b2bec3' }}>
                                <Tag size={64} />
                            </div>
                        )}
                    </div>
                    {item.images && item.images.length > 1 && (
                        <div className="thumbnail-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.5rem' }}>
                            {item.images.map((img, i) => (
                                <div
                                    key={i}
                                    className={`thumb ${i === activeImageIndex ? 'active-thumb' : ''}`}
                                    style={{
                                        borderRadius: '8px',
                                        overflow: 'hidden',
                                        border: i === activeImageIndex ? '2px solid var(--accent-color)' : '1px solid #dfe6e9',
                                        cursor: 'pointer',
                                        aspectRatio: '1',
                                        opacity: i === activeImageIndex ? 1 : 0.7
                                    }}
                                    onClick={() => setActiveImageIndex(i)}
                                >
                                    <img src={img} alt="thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right: Info */}
                <div className="item-info">
                    <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                            <span className="badge" style={{ background: '#dff9fb', color: '#130f40', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>{item.category}</span>
                            <span style={{ fontSize: '0.85rem', color: '#636e72' }}>
                                {new Date(item.created_at).toLocaleDateString()}
                            </span>
                        </div>
                        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#2d3436' }}>{item.title}</h1>
                        <h2 style={{ fontSize: '2rem', color: '#2ed573', margin: '0 0 1rem 0' }}>{item.currency} {item.price.toLocaleString()}</h2>

                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div className="item-condition-badge" style={{ background: '#ffeaa7', color: '#d35400', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.9rem' }}>
                                {item.condition}
                            </div>
                            {item.status === 'sold' && (
                                <div style={{ background: '#ff7675', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 'bold' }}>
                                    SOLD
                                </div>
                            )}
                        </div>

                        <p style={{ lineHeight: '1.6', color: '#636e72', marginBottom: '1.5rem', whiteSpace: 'pre-wrap' }}>
                            {item.description}
                        </p>

                        <div className="action-buttons" style={{ display: 'grid', gap: '0.75rem' }}>
                            {isOwner ? (
                                <button
                                    className="btn btn-primary btn-full"
                                    onClick={handleMarkSold}
                                    disabled={item.status === 'sold'}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                >
                                    {item.status === 'sold' ? 'Sold' : 'Mark as Sold'}
                                </button>
                            ) : (
                                <button
                                    className="btn btn-primary btn-full"
                                    onClick={handleContactSeller}
                                    disabled={item.status === 'sold'}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                >
                                    <MessageCircle size={20} /> Contact Seller
                                </button>
                            )}

                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button className="btn btn-outline" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                    <Heart size={20} /> Save
                                </button>
                                <button className="btn btn-outline" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                    <Share2 size={20} /> Share
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="card seller-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                        <Avatar
                            src={item.seller_avatar}
                            name={item.seller_name}
                            size="50px"
                        />
                        <div>
                            <h4 style={{ margin: 0 }}>{item.seller_name}</h4>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#636e72' }}>Seller</p>
                        </div>
                    </div>

                    <div className="safety-tip" style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #2ed573' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem', color: '#2d3436', fontWeight: '600' }}>
                            <Shield size={18} /> Safety Tip
                        </div>
                        <p style={{ fontSize: '0.85rem', color: '#636e72', margin: 0 }}>
                            Meet in a safe, public place like the Student Center or Library. Avoid sending money before seeing the item.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MarketplaceItemPage;
