import React, { useState, useEffect } from 'react';
import { Search, Loader2, Bookmark, Flame, Clock } from 'lucide-react';
import { fetchTrendingStickers, searchStickers } from '../utils/giphy';
import { getSavedStickers, removeSticker } from '../utils/stickerStorage';

const StickerPicker = ({ onSelect, onClose, staticStickers }) => {
    const [activeTab, setActiveTab] = useState('trending'); // 'trending', 'search', 'saved', 'default'
    const [stickers, setStickers] = useState([]);
    const [savedStickers, setSavedStickers] = useState([]);
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (activeTab === 'saved') {
            setSavedStickers(getSavedStickers());
        } else if (activeTab === 'trending') {
            loadTrending();
        } else if (activeTab === 'default') {
            setStickers(staticStickers || []);
        }
    }, [activeTab]);

    const loadTrending = async () => {
        setIsLoading(true);
        const results = await fetchTrendingStickers();
        setStickers(results);
        setIsLoading(false);
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;
        
        setActiveTab('search');
        setIsLoading(true);
        const results = await searchStickers(query);
        setStickers(results);
        setIsLoading(false);
    };

    return (
        <div className="sticker-picker-container">
            <div className="sticker-picker-header">
                <div className="sticker-tabs">
                    <button 
                        className={`sticker-tab ${activeTab === 'trending' ? 'active' : ''}`}
                        onClick={() => setActiveTab('trending')}
                        title="Trending"
                    >
                        <Flame size={18} />
                    </button>
                    <button 
                        className={`sticker-tab ${activeTab === 'search' ? 'active' : ''}`}
                        onClick={() => setActiveTab('search')}
                        title="Search Giphy"
                    >
                        <Search size={18} />
                    </button>
                    <button 
                        className={`sticker-tab ${activeTab === 'saved' ? 'active' : ''}`}
                        onClick={() => setActiveTab('saved')}
                        title="Saved Stickers"
                    >
                        <Bookmark size={18} />
                    </button>
                    <button 
                        className={`sticker-tab ${activeTab === 'default' ? 'active' : ''}`}
                        onClick={() => setActiveTab('default')}
                        title="Default"
                    >
                        <Clock size={18} />
                    </button>
                </div>
            </div>

            {activeTab === 'search' && (
                <form onSubmit={handleSearch} className="sticker-search-form">
                    <input 
                        type="text" 
                        placeholder="Search Giphy stickers..." 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        autoFocus
                    />
                </form>
            )}

            <div className="sticker-grid">
                {isLoading ? (
                    <div className="sticker-loading">
                        <Loader2 className="animate-spin" size={24} />
                    </div>
                ) : activeTab === 'saved' ? (
                    savedStickers.length > 0 ? (
                        savedStickers.map((s) => (
                            <img
                                key={s.id}
                                src={s.url}
                                alt="Saved Sticker"
                                className="sticker-item"
                                onClick={() => onSelect(s.url)}
                            />
                        ))
                    ) : (
                        <div className="sticker-empty">No saved stickers yet.</div>
                    )
                ) : stickers.length > 0 ? (
                    stickers.map((s) => (
                        <img
                            key={s.id}
                            src={s.url}
                            alt="Sticker"
                            className="sticker-item"
                            onClick={() => onSelect(s.url)}
                        />
                    ))
                ) : (
                    <div className="sticker-empty">No stickers found.</div>
                )}
            </div>
        </div>
    );
};

export default StickerPicker;
