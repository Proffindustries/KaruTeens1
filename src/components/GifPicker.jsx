import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import '../styles/GifPicker.css';

const GifPicker = ({ onSelect, onClose }) => {
    const [search, setSearch] = useState('');
    const [gifs, setGifs] = useState([]);
    const [loading, setLoading] = useState(false);

    // GIPHY Beta API key (often used for public demos/learning)
    const GIPHY_API_KEY = 'dc6zaTOxFJmzC';

    const fetchGifs = async (query = '') => {
        setLoading(true);
        try {
            const endpoint = query
                ? `https://api.giphy.com/1/gifs/search?api_key=${GIPHY_API_KEY}&q=${query}&limit=20`
                : `https://api.giphy.com/1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20`;

            const response = await fetch(endpoint);
            const data = await response.json();
            setGifs(data.data || []);
        } catch (error) {
            console.error("Error fetching GIFs:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGifs();
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        fetchGifs(search);
    };

    return (
        <div className="gif-picker-overlay">
            <div className="gif-picker-container">
                <div className="gif-picker-header">
                    <h3>Select GIF</h3>
                    <button className="icon-btn" onClick={onClose}><X size={20} /></button>
                </div>

                <form className="gif-search-form" onSubmit={handleSearch}>
                    <input
                        type="text"
                        placeholder="Search GIPHY..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <button type="submit" className="icon-btn"><Search size={18} /></button>
                </form>

                <div className="gif-results-grid">
                    {loading ? (
                        <div className="gif-loading">Loading...</div>
                    ) : (
                        gifs.map(gif => (
                            <div key={gif.id} className="gif-item" onClick={() => onSelect(gif.images.fixed_height.url)}>
                                <img src={gif.images.fixed_height.url} alt={gif.title} loading="lazy" />
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default GifPicker;
