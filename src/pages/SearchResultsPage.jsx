import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Search,
    User,
    FileText,
    ShoppingBag,
    Users,
    Calendar,
    ArrowRight,
    SlidersHorizontal,
    X,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import MainLayout from '../layouts/MainLayout';
import Avatar from '../components/Avatar.jsx';
import Skeleton from '../components/Skeleton.jsx';
import '../styles/SearchResultsPage.css';

const SearchResultsPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    const [activeTab, setActiveTab] = useState('all');
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        dateRange: '',
        school: '',
        year: '',
        verified: false,
    });

    const { data: results, isLoading } = useQuery({
        queryKey: ['search', query, activeTab],
        queryFn: async () => {
            if (!query) return null;
            const type =
                activeTab === 'all'
                    ? 'all'
                    : activeTab === 'people'
                      ? 'users'
                      : activeTab === 'market'
                        ? 'marketplace'
                        : activeTab;
            const { data } = await api.get(`/search?q=${query}&search_type=${type}`);
            return data;
        },
        enabled: !!query,
    });

    const handleSearch = (e) => {
        if (e.key === 'Enter') {
            setSearchParams({ q: e.target.value });
        }
    };

    return (
        <MainLayout>
            <div className="container search-results-page py-8">
                <div className="search-header-large mb-8">
                    <div className="search-input-wrapper flex items-center bg-gray-100 rounded-xl px-4 py-3 mb-6">
                        <Search size={24} className="text-gray-400 mr-3" />
                        <input
                            type="text"
                            defaultValue={query}
                            onKeyDown={handleSearch}
                            placeholder="Search KaruTeens..."
                            className="bg-transparent border-none focus:outline-none w-full text-lg"
                        />
                    </div>

                    <div className="search-tabs flex gap-4 border-b border-gray-100 overflow-x-auto pb-1">
                        {['all', 'people', 'posts', 'groups', 'events'].map((tab) => (
                            <button
                                key={tab}
                                className={`tab-btn px-4 py-2 text-sm font-medium capitalize transition-colors relative ${
                                    activeTab === tab
                                        ? 'text-primary'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                                onClick={() => setActiveTab(tab)}
                            >
                                {tab}
                                {activeTab === tab && (
                                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-full"></span>
                                )}
                            </button>
                        ))}
                    </div>

                    <button
                        className="filters-toggle-btn"
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <SlidersHorizontal size={16} />
                        Advanced Filters
                    </button>

                    {showFilters && (
                        <div className="advanced-filters">
                            <div className="filter-group">
                                <label>Date Range</label>
                                <select
                                    value={filters.dateRange}
                                    onChange={(e) =>
                                        setFilters({ ...filters, dateRange: e.target.value })
                                    }
                                >
                                    <option value="">Any time</option>
                                    <option value="today">Past 24 hours</option>
                                    <option value="week">Past week</option>
                                    <option value="month">Past month</option>
                                    <option value="year">Past year</option>
                                </select>
                            </div>
                            <div className="filter-group">
                                <label>School</label>
                                <select
                                    value={filters.school}
                                    onChange={(e) =>
                                        setFilters({ ...filters, school: e.target.value })
                                    }
                                >
                                    <option value="">All schools</option>
                                    <option value="KU">Kenyatta University</option>
                                    <option value="UON">University of Nairobi</option>
                                    <option value="KU">Kenyatta University</option>
                                    <option value="Moi">Moi University</option>
                                    <option value="Egerton">Egerton University</option>
                                </select>
                            </div>
                            <div className="filter-group">
                                <label>Year of Study</label>
                                <select
                                    value={filters.year}
                                    onChange={(e) =>
                                        setFilters({ ...filters, year: e.target.value })
                                    }
                                >
                                    <option value="">Any year</option>
                                    <option value="1">First Year</option>
                                    <option value="2">Second Year</option>
                                    <option value="3">Third Year</option>
                                    <option value="4">Fourth Year</option>
                                    <option value="5">Fifth Year+</option>
                                </select>
                            </div>
                            <div className="filter-group checkbox">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={filters.verified}
                                        onChange={(e) =>
                                            setFilters({ ...filters, verified: e.target.checked })
                                        }
                                    />
                                    Verified only
                                </label>
                            </div>
                            <button
                                className="clear-filters"
                                onClick={() =>
                                    setFilters({
                                        dateRange: '',
                                        school: '',
                                        year: '',
                                        verified: false,
                                    })
                                }
                            >
                                <X size={14} /> Clear
                            </button>
                        </div>
                    )}
                </div>

                <div className="results-content">
                    {isLoading ? (
                        <div className="space-y-8">
                            {[1, 2, 3].map((i) => (
                                <Skeleton key={i} height="200px" className="rounded-xl" />
                            ))}
                        </div>
                    ) : !query ? (
                        <div className="text-center py-20">
                            <Search size={64} className="mx-auto text-gray-200 mb-4" />
                            <h3 className="text-xl font-medium text-gray-500">
                                Search for something on KaruTeens
                            </h3>
                        </div>
                    ) : (
                        <div className="space-y-12">
                            {/* People Results */}
                            {results?.users?.length > 0 && (
                                <section className="result-section">
                                    <h3 className="flex items-center gap-2 text-xl font-bold mb-6 text-gray-900">
                                        <User size={20} className="text-primary" /> People
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {results.users.map((user) => (
                                            <Link
                                                to={`/profile/${user.username}`}
                                                key={user.user_id}
                                                className="flex items-center p-4 bg-white rounded-xl border border-gray-100 hover:shadow-md transition-shadow"
                                            >
                                                <Avatar
                                                    src={user.avatar_url}
                                                    name={user.username}
                                                    className="mr-4"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-gray-900 truncate">
                                                        {user.full_name || user.username}
                                                    </h4>
                                                    <p className="text-sm text-gray-500 truncate">
                                                        @{user.username}
                                                    </p>
                                                </div>
                                                <ArrowRight size={16} className="text-gray-300" />
                                            </Link>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Posts Results */}
                            {results?.posts?.length > 0 && (
                                <section className="result-section">
                                    <h3 className="flex items-center gap-2 text-xl font-bold mb-6 text-gray-900">
                                        <FileText size={20} className="text-primary" /> Posts
                                    </h3>
                                    <div className="space-y-4">
                                        {results.posts.map((post) => (
                                            <Link
                                                to={`/post/${post.id}`}
                                                key={post.id}
                                                className="block p-5 bg-white rounded-xl border border-gray-100 hover:border-primary/20 hover:bg-primary/5 transition-all"
                                            >
                                                <h4 className="font-bold text-lg text-gray-900 mb-1">
                                                    {post.title}
                                                </h4>
                                                <div className="flex items-center gap-3 text-sm text-gray-500">
                                                    <span>by {post.author_name}</span>
                                                    <span>•</span>
                                                    <span>
                                                        {new Date(
                                                            post.created_at,
                                                        ).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Groups Results */}
                            {results?.groups?.length > 0 && (
                                <section className="result-section">
                                    <h3 className="flex items-center gap-2 text-xl font-bold mb-6 text-gray-900">
                                        <Users size={20} className="text-primary" /> Groups
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {results.groups.map((group) => (
                                            <Link
                                                to={`/groups/${group.id}`}
                                                key={group.id}
                                                className="flex items-center p-4 bg-white rounded-xl border border-gray-100 hover:shadow-md transition-shadow"
                                            >
                                                <div className="w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0 mr-4 overflow-hidden">
                                                    {group.avatar_url ? (
                                                        <img
                                                            src={group.avatar_url}
                                                            alt={group.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <Users className="w-full h-full p-3 text-gray-400" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-gray-900 truncate">
                                                        {group.name}
                                                    </h4>
                                                    <p className="text-sm text-gray-500">
                                                        {group.member_count} members
                                                    </p>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Events Results */}
                            {results?.events?.length > 0 && (
                                <section className="result-section">
                                    <h3 className="flex items-center gap-2 text-xl font-bold mb-6 text-gray-900">
                                        <Calendar size={20} className="text-primary" /> Events
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {results.events.map((event) => (
                                            <Link
                                                to={`/events/${event.id}`}
                                                key={event.id}
                                                className="p-4 bg-white rounded-xl border border-gray-100 hover:shadow-md transition-shadow"
                                            >
                                                <h4 className="font-bold text-gray-900 mb-2">
                                                    {event.title}
                                                </h4>
                                                <div className="flex flex-col gap-1 text-sm text-gray-500">
                                                    <span className="truncate">
                                                        📍 {event.location}
                                                    </span>
                                                    <span>
                                                        📅{' '}
                                                        {new Date(
                                                            event.start_datetime,
                                                        ).toLocaleString()}
                                                    </span>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {Object.values(results || {}).every(
                                (arr) => !arr || arr.length === 0,
                            ) && (
                                <div className="text-center py-20">
                                    <h3 className="text-xl font-medium text-gray-500">
                                        No results found for "{query}"
                                    </h3>
                                    <p className="text-gray-400 mt-2">
                                        Try adjusting your search or category
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    );
};

export default SearchResultsPage;
