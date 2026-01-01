import React, { useState } from 'react';
import { Search, Filter, PlusCircle, Tag, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import '../styles/MarketplacePage.css';
import CreateItemModal from '../components/CreateItemModal.jsx';
import { useMarketplaceItems } from '../hooks/useMarketplace.js';

const MarketplacePage = () => {
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const { data: items, isLoading, error } = useMarketplaceItems({
        category: filter,
        search
    });

    return (
        <div className="container marketplace-page">
            {/* Header */}
            <div className="market-header">
                <div className="market-intro">
                    <h1>Student Marketplace</h1>
                    <p>Buy, sell, and trade with fellow students.</p>
                </div>
                <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                    <PlusCircle size={20} /> Sell Item
                </button>
            </div>

            {/* Search & Filter */}
            <div className="market-controls">
                <div className="search-bar">
                    <Search size={20} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search for books, electronics..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="categories-scroll">
                    {['all', 'Books', 'Electronics', 'Furniture', 'Clothing', 'Notes', 'Other'].map(cat => (
                        <button
                            key={cat}
                            className={`cat-pill ${filter === cat ? 'active' : ''}`}
                            onClick={() => setFilter(cat)}
                        >
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Items Grid */}
            <div className="market-grid">
                {isLoading ? (
                    <div className="loading-state">Loading items...</div>
                ) : items?.length > 0 ? (
                    items.map(item => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            whileHover={{ y: -5 }}
                            className="market-item-card"
                        >
                            <Link to={`/marketplace/item/${item.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                <div className="item-image-container">
                                    <img
                                        src={item.images?.[0] || 'https://via.placeholder.com/300?text=No+Image'}
                                        alt={item.title}
                                        className="item-image"
                                    />
                                    <div className="item-price">{item.currency} {item.price}</div>
                                    <div className="item-condition-badge">{item.condition}</div>
                                </div>
                                <div className="item-details">
                                    <h3>{item.title}</h3>
                                    <div className="item-meta">
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            {item.seller_name}
                                            {item.seller_is_verified && <CheckCircle size={14} color="#2ed573" fill="#2ed573" title="Verified Seller" />}
                                        </span>
                                        <span>•</span>
                                        <span>{item.category}</span>
                                    </div>
                                    <button className="btn btn-outline btn-sm btn-full-width" style={{ marginTop: '0.5rem' }}>
                                        View Details
                                    </button>
                                </div>
                            </Link>
                        </motion.div>
                    ))
                ) : (
                    <div className="empty-state">
                        <Tag size={48} color="#ccc" />
                        <p>No items found related to your search.</p>
                    </div>
                )}
            </div>

            <CreateItemModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </div>
    );
};

export default MarketplacePage;
