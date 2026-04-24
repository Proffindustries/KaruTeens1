import React from 'react';
import { Search, RefreshCw, BarChart3 } from 'lucide-react';

const AdFilters = ({ filters, handleFilterChange, isLoading, onRefresh, onShowPerformance }) => {
    return (
        <div className="filters-section">
            <div className="search-filters">
                <div className="search-box">
                    <Search size={20} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search by name, description, or objective..."
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                        aria-label="Search ads"
                    />
                </div>

                <div className="filter-group">
                    <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        aria-label="Filter by status"
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                        <option value="draft">Draft</option>
                        <option value="archived">Archived</option>
                    </select>

                    <select
                        value={filters.campaign_type}
                        onChange={(e) => handleFilterChange('campaign_type', e.target.value)}
                        aria-label="Filter by campaign type"
                    >
                        <option value="all">All Types</option>
                        <option value="search">Search</option>
                        <option value="display">Display</option>
                        <option value="video">Video</option>
                        <option value="shopping">Shopping</option>
                        <option value="app">App</option>
                    </select>

                    <input
                        type="number"
                        placeholder="Min budget"
                        value={filters.min_budget}
                        onChange={(e) => handleFilterChange('min_budget', e.target.value)}
                        aria-label="Minimum budget"
                    />

                    <input
                        type="number"
                        placeholder="Max budget"
                        value={filters.max_budget}
                        onChange={(e) => handleFilterChange('max_budget', e.target.value)}
                        aria-label="Maximum budget"
                    />
                </div>
            </div>

            <div className="filter-actions">
                <button
                    className="refresh-btn"
                    onClick={onRefresh}
                    disabled={isLoading}
                    aria-label="Refresh data"
                >
                    <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                    {isLoading ? 'Refreshing...' : 'Refresh'}
                </button>
                <button
                    className="btn btn-outline"
                    onClick={onShowPerformance}
                    aria-label="Show performance metrics"
                >
                    <BarChart3 size={18} />
                    Stats
                </button>
            </div>
        </div>
    );
};

export default AdFilters;
