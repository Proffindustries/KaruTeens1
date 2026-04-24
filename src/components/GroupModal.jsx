import React from 'react';
import { X, Plus } from 'lucide-react';

const GroupModal = ({
    showGroupModal,
    setShowGroupModal,
    groupName,
    setGroupName,
    groupParticipants,
    setGroupParticipants,
    handleCreateGroup,
    isCreatingGroup,
}) => {
    if (!showGroupModal) return null;

    return (
        <div className="modal-overlay">
            <div className="group-modal">
                <div className="modal-header">
                    <h3>Create New Group</h3>
                    <button className="icon-btn" onClick={() => setShowGroupModal(false)}>
                        <X size={20} />
                    </button>
                </div>
                <div className="modal-body">
                    <div className="form-group">
                        <label>Group Name</label>
                        <input
                            type="text"
                            placeholder="Enter group name..."
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Participants (usernames, comma separated)</label>
                        <textarea
                            placeholder="e.g. john, jane, alex"
                            value={groupParticipants}
                            onChange={(e) => setGroupParticipants(e.target.value)}
                        />
                    </div>
                    <button
                        className="create-btn"
                        onClick={handleCreateGroup}
                        disabled={isCreatingGroup}
                    >
                        <Plus size={18} /> {isCreatingGroup ? 'Creating...' : 'Create Group'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GroupModal;
