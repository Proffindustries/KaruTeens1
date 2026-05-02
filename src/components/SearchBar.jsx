import React, { useState, useEffect } from 'react';
import { Search, X, Hash, AtSign } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import '../styles/SearchBar.css';

const SearchBar = ({ placeholder = "Search campus..." }) => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [query, setQuery] = useState(searchParams.get('search') || '');
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        setQuery(searchParams.get('search') || '');
    }, [searchParams]);

    const handleSearch = (e) => {
        e.preventDefault();
        if (query.trim()) {
            navigate(`/feed?search=${encodeURIComponent(query.trim())}`);
        } else {
            navigate('/feed');
        }
    };

    const clearSearch = () => {
        setQuery('');
        navigate('/feed');
    };

    const getIcon = () => {
        if (query.startsWith('#')) return <Hash size={18} className="search-icon-active" />;
        if (query.startsWith('@')) return <AtSign size={18} className="search-icon-active" />;
        return <Search size={18} className={isFocused ? "search-icon-active" : "search-icon"} />;
    };

    return (
        <form className={`search-bar-container ${isFocused ? 'focused' : ''}`} onSubmit={handleSearch}>
            <div className="search-input-group">
                <div className="search-icon-wrapper">
                    {getIcon()}
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder={placeholder}
                    className="search-input"
                />
                {query && (
                    <button type="button" className="clear-search-btn" onClick={clearSearch}>
                        <X size={16} />
                    </button>
                )}
            </div>
        </form>
    );
};

export default SearchBar;
