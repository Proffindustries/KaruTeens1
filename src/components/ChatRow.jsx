import React from 'react';
import Avatar from '../components/Avatar.jsx';
import { Users } from 'lucide-react';

const ChatRow = React.memo(({ index, style, data }) => {
    const { chats, presenceData, selectedChatId, setSelectedChatId } = data;
    const chat = chats[index];

    if (!chat) return null;

    const isOnline = presenceData[chat.participant?.id || ''];

    return (
        <div
            style={style}
            key={chat.id}
            className={`chat-item ${selectedChatId === chat.id ? 'active' : ''}`}
            onClick={() => {
                setSelectedChatId(chat.id);
            }}
        >
            <div className="chat-avatar-container">
                <Avatar src={chat.avatar_url} name={chat.name || 'Group'} className="chat-avatar" />
                {chat.type === 'private' && isOnline && <div className="online-indicator"></div>}
                {chat.is_group && (
                    <div className="group-badge">
                        <Users size={8} />
                    </div>
                )}
            </div>
            <div className="chat-info">
                <div className="chat-info-header">
                    <h4>{chat.name}</h4>
                    <span className="last-time">
                        {new Date(chat.last_message_time).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </span>
                </div>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <p className="last-message">
                        {chat.is_group && chat.last_message_sender
                            ? `${chat.last_message_sender}: `
                            : ''}
                        {chat.last_message || 'No messages yet'}
                    </p>
                    {chat.unread_count > 0 && (
                        <div className="unread-badge">{chat.unread_count}</div>
                    )}
                </div>
            </div>
        </div>
    );
});

export default ChatRow;
