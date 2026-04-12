import React from 'react';
import { Search, PlusCircle, Loader } from 'lucide-react';
import AdComponent from './AdComponent.jsx';
import '../styles/ListPage.css';

const ListPage = React.memo(
    ({
        title,
        subtitle,
        actionText,
        categories,
        isLoading,
        data,
        renderItem,
        renderEmptyState,
        renderCreateModal,
        onSearch,
        searchQuery,
        onCategoryChange,
        categoryFilter,
        showCreateModal,
        setShowCreateModal,
    }) => {
        return (
            <div className="container">
                <div className="page-header">
                    <div className="header-text">
                        <h1>{title}</h1>
                        <p>{subtitle}</p>
                    </div>
                    <div className="header-action">
                        <button
                            className="btn btn-primary"
                            onClick={() => setShowCreateModal(true)}
                        >
                            <PlusCircle size={18} /> {actionText}
                        </button>
                    </div>
                </div>

                {onSearch && (
                    <div className="search-bar-lg">
                        <Search size={20} />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => onSearch(e.target.value)}
                        />
                    </div>
                )}

                {categories && (
                    <div className="categories-scroll" style={{ marginBottom: '1.5rem' }}>
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                className={`cat-pill ${categoryFilter === cat ? 'active' : ''}`}
                                onClick={() => onCategoryChange(cat)}
                            >
                                {cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </button>
                        ))}
                    </div>
                )}

                {isLoading ? (
                    <div className="loading-state">
                        <Loader size={48} className="spin-anim" />
                        <p>Loading...</p>
                    </div>
                ) : (
                    <div className="items-grid">
                        {data && data.length > 0
                            ? data.map((item, index) => (
                                <React.Fragment key={item.id || index}>
                                    {renderItem(item)}
                                    {index > 0 && (index + 1) % 6 === 0 && (
                                        <div className="list-ad-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '150px' }}>
                                            <AdComponent />
                                        </div>
                                    )}
                                </React.Fragment>
                            ))
                            : renderEmptyState}
                    </div>
                )}

                {showCreateModal && renderCreateModal}
            </div>
        );
    },
);

export default ListPage;
