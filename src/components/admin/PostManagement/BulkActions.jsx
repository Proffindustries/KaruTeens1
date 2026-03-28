import React, { memo } from 'react';

const BulkActions = memo(({ selectedPosts, bulkAction, setBulkAction, handleBulkAction }) => {
    if (selectedPosts.length === 0) return null;

    return (
        <div className="bulk-actions">
            <div className="selection-info">{selectedPosts.length} posts selected</div>
            <div className="bulk-actions-controls">
                <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)}>
                    <option value="">Bulk Actions</option>
                    <option value="approve">Approve</option>
                    <option value="reject">Reject</option>
                    <option value="publish">Publish</option>
                    <option value="make_featured">Make Featured</option>
                    <option value="make_premium">Make Premium</option>
                    <option value="delete">Delete Posts</option>
                </select>
                <button className="btn-primary" onClick={handleBulkAction} disabled={!bulkAction}>
                    Apply Action
                </button>
            </div>
        </div>
    );
});

BulkActions.displayName = 'BulkActions';

export default BulkActions;
