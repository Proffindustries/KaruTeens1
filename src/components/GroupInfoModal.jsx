import React from 'react';
import { X } from 'lucide-react';
import Avatar from './Avatar.jsx';
import { useMediaUpload } from '../hooks/useMedia';
import { useUpload } from '../context/UploadContext';
import { useToast } from '../context/ToastContext';
import safeLocalStorage from '../utils/storage.js';

const GroupInfoModal = ({
    showGroupInfoModal,
    selectedChat,
    setShowGroupInfoModal,
    isEditingGroup,
    setIsEditingGroup,
    editGroupName,
    setEditGroupName,
    editGroupAvatar,
    setEditGroupAvatar,
    updateGroup,
    toggleAdmin,
    handleRemoveParticipant,
    newParticipants,
    setNewParticipants,
    handleAddParticipants,
    handleLeaveGroup,
}) => {
    const { uploadImage } = useMediaUpload();
    const { addUpload, updateUploadProgress, completeUpload, failUpload } = useUpload();
    const fileInputRef = React.useRef(null);
    const [isUploading, setIsUploading] = React.useState(false);
    const { showToast } = useToast();

    if (!showGroupInfoModal || !selectedChat) return null;

    const currentUser = JSON.parse(safeLocalStorage.getItem('user'));
    const isCurrentUserAdmin = selectedChat.admins?.includes(currentUser?.id);

    return (
        <div className="modal-overlay">
            <div className="group-info-modal">
                <div className="modal-header">
                    <h3>Group Info</h3>
                    <button
                        className="icon-btn"
                        onClick={() => {
                            setShowGroupInfoModal(false);
                            setIsEditingGroup(false);
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="modal-body">
                    <div className="group-info-header">
                        {isEditingGroup ? (
                            <div className="edit-group-form">
                                <input
                                    type="text"
                                    placeholder="Group Name"
                                    value={editGroupName}
                                    onChange={(e) => setEditGroupName(e.target.value)}
                                />
                                <div
                                    style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                                >
                                    <button
                                        type="button"
                                        className="btn btn-outline"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                    >
                                        {isUploading ? 'Uploading...' : 'Upload Avatar'}
                                    </button>
                                    {editGroupAvatar && (
                                        <span style={{ color: '#00b894', fontSize: '0.9rem' }}>
                                            Image Attached
                                        </span>
                                    )}
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        hidden
                                        accept="image/*"
                                        onChange={async (e) => {
                                            const file = e.target.files[0];
                                            if (!file) return;
                                            const uploadId = addUpload({
                                                fileName: file.name,
                                                fileSize: file.size,
                                                type: 'image',
                                            });
                                            try {
                                                const url = await uploadImage(file, (p, l) =>
                                                    updateUploadProgress(uploadId, p, l),
                                                );
                                                completeUpload(uploadId, { url });
                                                setEditGroupAvatar(url);
                                            } catch (err) {
                                                failUpload(uploadId, err);
                                                showToast('Image upload failed', 'error');
                                            } finally {
                                                setIsUploading(false);
                                            }
                                        }}
                                    />
                                </div>
                                <div className="edit-actions">
                                    <button
                                        className="save-btn"
                                        onClick={() => {
                                            updateGroup({
                                                name: editGroupName,
                                                avatar_url: editGroupAvatar,
                                            });
                                            setIsEditingGroup(false);
                                        }}
                                    >
                                        Save
                                    </button>
                                    <button
                                        className="cancel-btn"
                                        onClick={() => setIsEditingGroup(false)}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <Avatar
                                    src={selectedChat.avatar_url}
                                    name={selectedChat.name}
                                    className="large-avatar"
                                    size="3xl"
                                />
                                <div className="group-title-row">
                                    <h2>{selectedChat.name}</h2>
                                    {selectedChat.admins?.includes(currentUser?.id) && (
                                        <button
                                            className="edit-icon-btn"
                                            onClick={() => {
                                                setEditGroupName(selectedChat.name);
                                                setEditGroupAvatar(selectedChat.avatar_url || '');
                                                setIsEditingGroup(true);
                                            }}
                                        >
                                            Edit
                                        </button>
                                    )}
                                </div>
                                <span>
                                    {selectedChat.group_participants?.length || 0} participants
                                </span>
                            </>
                        )}
                    </div>

                    <div className="participants-section">
                        <h4>Participants</h4>
                        <div className="participants-list">
                            {selectedChat.group_participants?.map((participant) => {
                                const isParticipantAdmin = selectedChat.admins?.includes(
                                    participant.user_id,
                                );
                                return (
                                    <div
                                        key={participant.user_id || participant.username}
                                        className="participant-item"
                                    >
                                        <div className="p-info">
                                            <Avatar
                                                src={participant.avatar_url}
                                                name={participant.username}
                                                size="sm"
                                            />
                                            <div className="p-name-col">
                                                <span>{participant.username}</span>
                                                {isParticipantAdmin && (
                                                    <span className="admin-tag">Admin</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="p-actions">
                                            {isCurrentUserAdmin &&
                                                participant.username !== currentUser?.username && (
                                                    <>
                                                        <button
                                                            className="toggle-admin-btn"
                                                            onClick={() =>
                                                                toggleAdmin(participant.username)
                                                            }
                                                        >
                                                            {isParticipantAdmin
                                                                ? 'Demote'
                                                                : 'Promote'}
                                                        </button>
                                                        <button
                                                            className="remove-p-btn"
                                                            onClick={() =>
                                                                handleRemoveParticipant(
                                                                    participant.username,
                                                                )
                                                            }
                                                        >
                                                            Remove
                                                        </button>
                                                    </>
                                                )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {isCurrentUserAdmin && (
                        <div className="add-participants-section">
                            <h4>Add Participants</h4>
                            <div className="add-p-input">
                                <input
                                    type="text"
                                    placeholder="Enter usernames, comma separated"
                                    value={newParticipants}
                                    onChange={(e) => setNewParticipants(e.target.value)}
                                />
                                <button className="create-btn" onClick={handleAddParticipants}>
                                    Add
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="group-actions-section">
                        <button className="leave-group-btn" onClick={handleLeaveGroup}>
                            Leave Group
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GroupInfoModal;
