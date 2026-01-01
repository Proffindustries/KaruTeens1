import React, { useState } from 'react';
import { Search, User, FileText, ShoppingBag, Users } from 'lucide-react';
import '../styles/SearchResultsPage.css'; // Creating next
import Avatar from '../components/Avatar.jsx';

const SearchResultsPage = () => {
    const [query, setQuery] = useState('Calculus');
    const [activeTab, setActiveTab] = useState('all');

    return (
        <div className="container search-results-page">
            <div className="search-header-large">
                <div className="search-input-wrapper">
                    <Search size={20} />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search KaruTeens..."
                    />
                </div>

                <div className="search-tabs">
                    <button className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>All</button>
                    <button className={`tab-btn ${activeTab === 'people' ? 'active' : ''}`} onClick={() => setActiveTab('people')}>People</button>
                    <button className={`tab-btn ${activeTab === 'posts' ? 'active' : ''}`} onClick={() => setActiveTab('posts')}>Posts</button>
                    <button className={`tab-btn ${activeTab === 'market' ? 'active' : ''}`} onClick={() => setActiveTab('market')}>Marketplace</button>
                </div>
            </div>

            <div className="results-content">
                <p className="results-count">About 45 results for "{query}"</p>

                {/* People Results */}
                {(activeTab === 'all' || activeTab === 'people') && (
                    <div className="result-section">
                        <h3><User size={18} /> People</h3>
                        <div className="result-list">
                            <div className="result-item">
                                <Avatar name="John Calculus" />
                                <div>
                                    <h4>John Calculus</h4>
                                    <p>Student • School of Math</p>
                                </div>
                                <button className="btn btn-sm btn-outline">Follow</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Posts Results */}
                {(activeTab === 'all' || activeTab === 'posts') && (
                    <div className="result-section">
                        <h3><FileText size={18} /> Posts</h3>
                        <div className="result-list">
                            <div className="result-item post-preview">
                                <div>
                                    <h4>Help with Calculus Integration</h4>
                                    <p>Does anyone understand the substitution method we l...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Market Results */}
                {(activeTab === 'all' || activeTab === 'market') && (
                    <div className="result-section">
                        <h3><ShoppingBag size={18} /> Marketplace</h3>
                        <div className="result-list">
                            <div className="result-item">
                                <div className="result-img-placeholder"></div>
                                <div>
                                    <h4>Calculus Early Transcendentals</h4>
                                    <p className="price">Ksh 1,500</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchResultsPage;
