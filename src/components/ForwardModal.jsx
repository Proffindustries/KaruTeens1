import React from 'react';
import { X } from 'lucide-react';
import Avatar from './Avatar.jsx';

const ForwardModal = ({
    showForwardModal,
    setShowForwardModal,
    messageToForward,
    chats,
    handleForwardSelect,
}) => {
    if (!showForwardModal) return null;

    return (
        <div className="modal-overlay">
            <div className="forward-modal">
                <div className="modal-header">
                    <h3>Forward Message</h3>
                    <button className="icon-btn" onClick={() => setShowForwardModal(false)}>
                        <X size={20} />
                    </button>
                </div>
                <div className="modal-body">
                    <p className="forward-preview">
                        Forwarding:{' '}
                        <i>
                            {messageToForward?.content?.substring(0, 50)}
                            {messageToForward?.content?.length > 50 ? '...' : ''}
                        </i>
                    </p>
                    <div className="forward-list">
                        {chats?.map((chat) => (
                            <div
                                key={chat.id}
                                className="forward-item"
                                onClick={() => handleForwardSelect(chat.id)}
                            >
                                <Avatar src={chat.avatar_url} name={chat.name} size="sm" />
                                <span>{chat.name}</span>
                                <button className="select-forward-btn">Send</button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForwardModal;
