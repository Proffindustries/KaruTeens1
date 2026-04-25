import React, { useState } from 'react';
import { Search, Filter, Copy, Users } from 'lucide-react';
import api from '../../api/client';

const LibrarySearch = ({ onFork }) => {
    const [query, setQuery] = useState('');
    const [school, setSchool] = useState('');
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const handleSearch = async () => {
        setIsLoading(true);
        try {
            const { data } = await api.get('/timetable/search', {
                params: { query, school },
            });
            setResults(data);
        } catch (error) {
            console.error('Search failed', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="library-search">
            <div className="search-controls">
                <div className="search-input-wrapper">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search timetables (e.g. Computer Science)..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
                <select value={school} onChange={(e) => setSchool(e.target.value)}>
                    <option value="">All Schools</option>
                    <option value="UoN">University of Nairobi</option>
                    <option value="KU">Kenyatta University</option>
                    <option value="JKUAT">JKUAT</option>
                </select>
                <button className="btn btn-primary" onClick={handleSearch}>
                    Search
                </button>
            </div>

            <div className="search-results">
                {results.map((tt) => (
                    <div key={tt._id} className="library-tt-card">
                        <div className="tt-info">
                            <h4>{tt.name}</h4>
                            <p>
                                {tt.school} • {tt.programme}
                            </p>
                            <div className="tt-stats">
                                <span>
                                    <Users size={12} /> {tt.fork_count || 0} students use this
                                </span>
                            </div>
                        </div>
                        <button className="btn btn-outline btn-sm" onClick={() => onFork(tt._id)}>
                            <Copy size={14} /> Use Template
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LibrarySearch;
