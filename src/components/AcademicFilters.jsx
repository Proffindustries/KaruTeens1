import React from 'react';
import { SCHOOLS, YEARS } from '../data/academicData';
import { Filter, Search } from 'lucide-react';
import '../styles/AcademicFilters.css';

const AcademicFilters = ({ filters, setFilters, categories, onSearch }) => {
  const selectedSchool = SCHOOLS.find(s => s.id === filters.school);

  return (
    <div className="academic-filters card">
      <div className="filters-header">
        <Filter size={18} />
        <span>Filter Resources</span>
      </div>
      
      <div className="filters-grid">
        {/* Search Bar */}
        <div className="filter-group full-width">
          <label>Search Title</label>
          <div className="search-input">
            <Search size={16} />
            <input 
              type="text" 
              placeholder="e.g. Calculus I CAT 2" 
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
            />
          </div>
        </div>

        {/* School Filter */}
        <div className="filter-group">
          <label>School</label>
          <select 
            value={filters.school}
            onChange={(e) => setFilters({...filters, school: e.target.value, programme: 'all'})}
          >
            <option value="all">All Schools</option>
            {SCHOOLS.map(school => (
              <option key={school.id} value={school.id}>{school.id}</option>
            ))}
          </select>
        </div>

        {/* Programme Filter */}
        <div className="filter-group">
          <label>Programme</label>
          <select 
            value={filters.programme}
            onChange={(e) => setFilters({...filters, programme: e.target.value})}
            disabled={filters.school === 'all'}
          >
            <option value="all">All Programmes</option>
            {selectedSchool?.programmes.map(prog => (
              <option key={prog} value={prog}>{prog}</option>
            ))}
          </select>
        </div>

        {/* Year Filter */}
        <div className="filter-group">
          <label>Year</label>
          <select 
            value={filters.year}
            onChange={(e) => setFilters({...filters, year: e.target.value})}
          >
            <option value="all">All Years</option>
            {YEARS.map(year => (
              <option key={year} value={year}>Year {year}</option>
            ))}
          </select>
        </div>

        {/* Category Filter */}
        <div className="filter-group">
          <label>Category</label>
          <select 
            value={filters.category}
            onChange={(e) => setFilters({...filters, category: e.target.value})}
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>
      
      <button className="btn btn-primary search-btn" onClick={onSearch}>
        Apply Filters
      </button>
    </div>
  );
};

export default AcademicFilters;
