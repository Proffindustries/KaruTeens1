import React from 'react';
import { X } from 'lucide-react';
import Avatar from './Avatar.jsx';

const ContactModal = ({ showContactModal, setShowContactModal, chats, handleShareContact }) => {
    if (!showContactModal) return null;

    return (
        <div className="modal-overlay">
            <div className="contact-modal">
                <div className="modal-header">
                    <h3>Share Contact</h3>
                    <button className="icon-btn" onClick={() => setShowContactModal(false)}>
                        <X size={20} />
                    </button>
                </div>
                <div className="modal-body">
                    <p className="modal-instruction">
                        Select a person to share their contact information.
                    </p>
                    <div className="contact-list">
                        {chats
                            ?.filter((c) => !c.is_group)
                            .map((chat) => (
                                <div
                                    key={chat.id}
                                    className="contact-item"
                                    onClick={() => handleShareContact(chat.participant)}
                                >
                                    <Avatar src={chat.avatar_url} name={chat.name} size="sm" />
                                    <span>{chat.name}</span>
                                    <button className="select-contact-btn">Share</button>
                                </div>
                            ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContactModal;
