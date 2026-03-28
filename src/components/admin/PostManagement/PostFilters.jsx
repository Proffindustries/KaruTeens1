import React from 'react';
import { Search, RefreshCw } from 'lucide-react';

const PostFilters = ({ filters, handleFilterChange }) => {
    return (
        <div className="filters-section">
            <div className="search-filters">
                <div className="search-box">
                    <Search size={20} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search posts by title, content, or author..."
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                    />
                </div>

                <div className="filter-group">
                    <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                    >
                        <option value="all">All Status</option>
                        <option value="published">Published</option>
                        <option value="approved">Approved</option>
                        <option value="pending_review">Pending Review</option>
                        <option value="draft">Draft</option>
                        <option value="rejected">Rejected</option>
                        <option value="scheduled">Scheduled</option>
                    </select>

                    <select
                        value={filters.post_type}
                        onChange={(e) => handleFilterChange('post_type', e.target.value)}
                    >
                        <option value="all">All Types</option>
                        <option value="article">Article</option>
                        <option value="blog">Blog</option>
                        <option value="news">News</option>
                        <option value="announcement">Announcement</option>
                        <option value="tutorial">Tutorial</option>
                    </select>

                    <select
                        value={filters.category}
                        onChange={(e) => handleFilterChange('category', e.target.value)}
                    >
                        <option value="all">All Categories</option>
                        <option value="Technology">Technology</option>
                        <option value="Health">Health</option>
                        <option value="News">News</option>
                        <option value="Opinion">Opinion</option>
                        <option value="Education">Education</option>
                    </select>
                </div>
            </div>

            <div className="filter-actions">
                <button className="refresh-btn" onClick={() => {}}>
                    <RefreshCw size={18} />
                    Refresh
                </button>
            </div>
        </div>
    );
};

export default PostFilters;
