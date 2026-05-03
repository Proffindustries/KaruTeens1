import React, { useState, useEffect } from 'react';
import { Layout, Search, ArrowRight, BookOpen, Globe, Users, Star, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useToast } from '../context/ToastContext.jsx';
import useDebounce from '../hooks/useDebounce';
import CreatePageModal from '../components/CreatePageModal.jsx';
import '../styles/PagesPage.css';

const PagesPage = () => {
    const [pages, setPages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const debouncedSearchQuery = useDebounce(searchQuery, 300);
    const { showToast } = useToast();

    const fetchPages = React.useCallback(async () => {
        try {
            const { data } = await api.get('/pages');
            setPages(data);
        } catch (error) {
            console.error('Failed to fetch pages:', error);
            showToast('Failed to load pages', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchPages();
    }, [fetchPages]);

    const filteredPages =
        debouncedSearchQuery === ''
            ? pages
            : pages.filter(
                  (page) =>
                      (page.name &&
                          page.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())) ||
                      (page.description &&
                          page.description
                              .toLowerCase()
                              .includes(debouncedSearchQuery.toLowerCase())),
              );

    return (
        <div className="container pages-page py-8">
            <div className="pages-header mb-8">
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <div>
                        <h1>Discover Pages</h1>
                        <p>
                            Explore channels from student leaders, organizations, and official
                            campus bodies.
                        </p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
                        <Plus size={18} /> Create Page
                    </button>
                </div>

                <div className="search-bar mt-6">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Search for a page..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {isCreateModalOpen && (
                <CreatePageModal
                    isOpen={isCreateModalOpen}
                    onClose={() => {
                        setIsCreateModalOpen(false);
                        fetchPages();
                    }}
                />
            )}

            {loading ? (
                <div className="pages-loading">Loading pages...</div>
            ) : (
                <div className="pages-grid">
                    {filteredPages.length > 0 ? (
                        filteredPages.map((page) => (
                            <Link
                                to={`/p/${page.slug}`}
                                key={page.id}
                                className="page-card card hover-card"
                            >
                                <div className="page-image">
                                    {page.featured_image ? (
                                        <img
                                            src={page.featured_image}
                                            alt={page.name}
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="page-placeholder">
                                            <BookOpen size={48} />
                                        </div>
                                    )}
                                    {page.is_official && (
                                        <div className="official-badge">
                                            <Star size={12} fill="currentColor" /> Official
                                        </div>
                                    )}
                                </div>
                                <div className="page-info">
                                    <div className="page-category">
                                        {page.category || 'General'}
                                    </div>
                                    <h3>{page.name}</h3>
                                    <p>{page.description || 'No description available.'}</p>
                                    <div className="page-footer">
                                        <span>
                                            <Users size={14} /> {page.follower_count || 0}{' '}
                                            Followers
                                        </span>
                                        <ArrowRight size={16} />
                                    </div>
                                </div>
                            </Link>
                        ))
                    ) : (
                        <div className="empty-pages">
                            <Globe size={64} />
                            <p>No pages found matching your search.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PagesPage;
