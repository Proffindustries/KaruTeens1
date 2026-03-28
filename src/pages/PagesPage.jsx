import React, { useState, useEffect } from 'react';
import { Layout, Search, ArrowRight, BookOpen, Globe, Users, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import useDebounce from '../hooks/useDebounce';
import '../styles/PagesPage.css';

const PagesPage = () => {
    const [pages, setPages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 300);
    const { showToast } = useToast();

    useEffect(() => {
        fetchPages();
    }, []);

    const fetchPages = async () => {
        try {
            const { data } = await api.get('/pages');
            setPages(data);
        } catch (error) {
            console.error('Failed to fetch pages:', error);
            showToast('Failed to load pages', 'error');
        } finally {
            setLoading(false);
        }
    };

    const filteredPages =
        debouncedSearchQuery === ''
            ? pages
            : pages.filter(
                  (page) =>
                      page.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
                      (page.description &&
                          page.description
                              .toLowerCase()
                              .includes(debouncedSearchQuery.toLowerCase())),
              );

    return (
        <div className="container pages-page py-8">
            <div className="pages-header mb-8">
                <h1>Official Pages</h1>
                <p>Discover student organizations, departments, and official campus channels.</p>

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
                                            alt={page.title}
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
                                    <h3>{page.title}</h3>
                                    <p>{page.description || 'No description available.'}</p>
                                    <div className="page-footer">
                                        <span>
                                            <Users size={14} /> {page.followers_count || 0}{' '}
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
