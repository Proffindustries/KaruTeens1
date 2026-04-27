import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import useDebounce from '../hooks/useDebounce';
import ChatRow from '../components/ChatRow.jsx';
import ForwardModal from '../components/ForwardModal.jsx';
import GroupModal from '../components/GroupModal.jsx';
import PollModal from '../components/PollModal.jsx';
import ContactModal from '../components/ContactModal.jsx';
import FilePreviewModal from '../components/FilePreviewModal.jsx';
import GroupInfoModal from '../components/GroupInfoModal.jsx';
import {
    Search,
    Send,
    Loader2,
    Paperclip,
    Phone,
    Video,
    MoreVertical,
    File as FileIcon,
    X,
    Reply,
    Mic,
    Square,
    Play,
    Pause,
    Smile,
    Forward,
    Trash,
    Check,
    CheckCheck,
    Lock,
    Users,
    Plus,
    BarChart2,
    MapPin,
    ArrowLeft,
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import '../styles/MessagesPage.css';
import { shouldBlur } from '../utils/contentFilters.js';
import api from '../api/client';
import {
    useChats,
    useChatMessages,
    useSendMessage,
    useCreateChat,
    useReactMessage,
    useMarkRead,
    useDeleteMessage,
    useCreateGroup,
    useForwardMessage,
    useVotePoll,
    useMarkViewed,
    useAddParticipants,
    useRemoveParticipant,
    useLeaveGroup,
    useMuteChat,
    useBlockUser,
    useSetDisappearing,
    useUpdateGroup,
    useToggleAdmin,
} from '../hooks/useMessages.js';
import GifPicker from '../components/GifPicker.jsx';
import { IncomingCallModal, ActiveCallScreen, CallingScreen } from '../components/CallUI.jsx';
import { useWebRTC } from '../hooks/useWebRTC.js';

import { useAbly } from '../context/AblyContext.jsx';
import { useQueryClient } from '@tanstack/react-query';

import { useMediaUpload } from '../hooks/useMedia.js';
import { useEncryption } from '../hooks/useEncryption.js';
import { useToast } from '../context/ToastContext.jsx';
import Avatar from '../components/Avatar.jsx';
import MapPreview from '../components/MapPreview.jsx';
import safeLocalStorage from '../utils/storage.js';

const COMMON_EMOJIS = ['❤️', '😂', '😮', '😢', '🔥', '👍'];
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

const STICKERS = [
    { id: 's1', url: 'https://cdn-icons-png.flaticon.com/512/4721/4721215.png' },
    { id: 's2', url: 'https://cdn-icons-png.flaticon.com/512/4721/4721183.png' },
    { id: 's3', url: 'https://cdn-icons-png.flaticon.com/512/4721/4721197.png' },
    { id: 's4', url: 'https://cdn-icons-png.flaticon.com/512/4721/4721200.png' },
    { id: 's5', url: 'https://cdn-icons-png.flaticon.com/512/4721/4721192.png' },
    { id: 's6', url: 'https://cdn-icons-png.flaticon.com/512/4721/4721188.png' },
];

const ContactMessage = ({ contact, onCreateChat }) => {
    if (!contact) return null;

    return (
        <div className="contact-message-card" onClick={(e) => e.stopPropagation()}>
            <Avatar src={contact.avatar_url} name={contact.username} className="contact-avatar" />
            <div className="contact-info">
                <span className="contact-name">{contact.full_name || contact.username}</span>
                <span className="contact-username">@{contact.username}</span>
            </div>
            <button className="message-contact-btn" onClick={() => onCreateChat(contact.username)}>
                Message
            </button>
        </div>
    );
};

const LinkPreview = ({ url }) => {
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPreview = async () => {
            try {
                const { data } = await api.get(`/messages/preview?url=${encodeURIComponent(url)}`);
                setPreview(data);
            } catch (err) {
                setPreview(null);
            } finally {
                setLoading(false);
            }
        };
        fetchPreview();
    }, [url]);

    if (loading) return null;
    if (!preview || (!preview.title && !preview.image)) return null;

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="link-preview-card"
            onClick={(e) => e.stopPropagation()}
        >
            {preview.image && (
                <div className="preview-image">
                    <img
                        src={preview.image}
                        alt=""
                        onError={(e) => (e.target.style.display = 'none')}
                    />
                </div>
            )}
            <div className="preview-info">
                {preview.title && <div className="preview-title">{preview.title}</div>}
                {preview.description && <div className="preview-desc">{preview.description}</div>}
                <div className="preview-host">{new URL(url).hostname}</div>
            </div>
        </a>
    );
};

const VoiceNotePlayer = ({ url }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef(null);

    // Stable heights for the waveform to prevent jitter
    const [waveHeights] = useState(() => [...Array(15)].map(() => 5 + Math.random() * 15));

    const togglePlay = () => {
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const onTimeUpdate = () => {
        setCurrentTime(audioRef.current.currentTime);
    };

    const onLoadedMetadata = () => {
        setDuration(audioRef.current.duration);
    };

    const formatTime = (time) => {
        if (!time || isNaN(time)) return '0:00';
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="voice-note-player">
            <audio
                ref={audioRef}
                src={url}
                onTimeUpdate={onTimeUpdate}
                onLoadedMetadata={onLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
            />
            <button
                className="play-pause-btn"
                onClick={(e) => {
                    e.stopPropagation();
                    togglePlay();
                }}
            >
                {isPlaying ? (
                    <Pause size={12} fill="currentColor" />
                ) : (
                    <Play size={12} fill="currentColor" />
                )}
            </button>
            <div className="waveform">
                {waveHeights.map((h, i) => {
                    const progress = (currentTime / (duration || 1)) * 15;
                    const isActive = i <= progress;
                    return (
                        <div
                            key={i}
                            className={`wave-bar ${isActive ? 'active' : ''}`}
                            style={{ height: `${h}px` }}
                        />
                    );
                })}
            </div>
            <span className="voice-note-time">
                {formatTime(isPlaying ? currentTime : duration)}
            </span>
        </div>
    );
};

const DecryptedText = ({
    content,
    encryptedContent,
    iv,
    participantPublicKey,
    decryptFromSender,
    isDeleted,
}) => {
    const [decrypted, setDecrypted] = useState(content);
    const [isDecrypting, setIsDecrypting] = useState(!!encryptedContent && !isDeleted);

    useEffect(() => {
        if (!isDeleted && encryptedContent && iv && participantPublicKey) {
            decryptFromSender(encryptedContent, iv, participantPublicKey).then((text) => {
                setDecrypted(text);
                setIsDecrypting(false);
            });
        }
    }, [encryptedContent, iv, participantPublicKey, isDeleted, decryptFromSender]);

    if (isDeleted)
        return (
            <p className="deleted-text">
                <i>This message was deleted</i>
            </p>
        );
    if (isDecrypting)
        return (
            <p className="decrypting-text">
                <i>
                    <Lock size={10} /> Decrypting...
                </i>
            </p>
        );

    const links = decrypted?.match(URL_REGEX);

    return (
        <>
            <p>{decrypted}</p>
            {links?.map((link, idx) => (
                <LinkPreview key={idx} url={link} />
            ))}
        </>
    );
};
const PollMessage = ({ poll, messageId, onVote }) => {
    if (!poll) return null;

    return (
        <div className="poll-container" onClick={(e) => e.stopPropagation()}>
            <h4 className="poll-question">{poll.question}</h4>
            <div className="poll-options">
                {poll.options.map((opt, idx) => {
                    const percentage =
                        poll.total_votes > 0 ? Math.round((opt.count / poll.total_votes) * 100) : 0;
                    return (
                        <div
                            key={idx}
                            className={`poll-option ${opt.me_voted ? 'voted' : ''}`}
                            onClick={() => onVote({ messageId, optionIndex: idx })}
                        >
                            <div
                                className="poll-option-bg"
                                style={{ width: `${percentage}%` }}
                            ></div>
                            <div className="poll-option-content">
                                <span className="poll-option-text">{opt.text}</span>
                                <span className="poll-option-percentage">{percentage}%</span>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="poll-footer">
                <span>{poll.total_votes} votes</span>
                {poll.is_multiple && <span className="poll-badge">Multiple Choice</span>}
            </div>
        </div>
    );
};

const LocationMessage = ({ location }) => {
    if (!location) return null;
    return <MapPreview location={location} />;
};

const MessagesPage = () => {
    const [selectedChatId, setSelectedChatId] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [messageInput, setMessageInput] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 300);
    const [replyingTo, setReplyingTo] = useState(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [showLocationMenu, setShowLocationMenu] = useState(false);
    const [containerHeight, setContainerHeight] = useState(window.innerHeight - 250);
    const user = JSON.parse(safeLocalStorage.getItem('user') || '{}');
    const { showToast } = useToast();

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
            setContainerHeight(window.innerHeight - 250);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Voice Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);

    // Cleanup timer and media recorder on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
                mediaRecorderRef.current = null;
            }
        };
    }, []);

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const location = useLocation();

    const { data: chats, isLoading: isLoadingChats } = useChats();
    const { data: messages, isLoading: isLoadingMessages } = useChatMessages(selectedChatId);
    
    useEffect(() => {
        console.log("MessagesPage Debug - selectedChatId:", selectedChatId);
        console.log("MessagesPage Debug - messages data:", messages);
    }, [selectedChatId, messages]);

    const { mutate: sendMessage } = useSendMessage(selectedChatId);
    const { mutate: reactMessage } = useReactMessage(selectedChatId);
    const { mutate: markRead } = useMarkRead(selectedChatId);
    const { mutate: deleteMessage } = useDeleteMessage(selectedChatId);
    const { mutate: createChat } = useCreateChat();
    const { mutate: createGroup, isPending: isCreatingGroup } = useCreateGroup();
    const { mutate: forwardMessage } = useForwardMessage();
    const { mutate: votePoll } = useVotePoll(selectedChatId);
    const { mutate: markViewed } = useMarkViewed(selectedChatId);
    const { mutate: addParticipants } = useAddParticipants(selectedChatId);
    const { mutate: removeParticipant } = useRemoveParticipant(selectedChatId);
    const { mutate: leaveGroup } = useLeaveGroup(selectedChatId);
    const { mutate: muteChat } = useMuteChat();
    const { mutate: blockUser } = useBlockUser();
    const { mutate: setDisappearing } = useSetDisappearing(selectedChatId);
    const { mutate: updateGroup } = useUpdateGroup(selectedChatId);
    const { mutate: toggleAdmin } = useToggleAdmin(selectedChatId);

    const { isReady: isEncryptionReady, encryptForRecipient, decryptFromSender } = useEncryption();

    // WebRTC Integration
    const currentUser = JSON.parse(safeLocalStorage.getItem('user'));
    const handleWebRTCMessage = useCallback(
        (type, data) => {
            // Ignore messages not intended for this user (multi-tab safety)
            if (data.to && data.to !== currentUser?.user_id) {
                return;
            }

            switch (type) {
                case 'call-offer': {
                    const caller = {
                        user_id: data.from,
                        username: data.callerUsername || 'Unknown',
                    };
                    setWebRTCState((prev) => ({
                        ...prev,
                        remoteUser: caller,
                        callType: data.callType,
                    }));
                    setWebRTCState((prev) => ({ ...prev, callState: 'ringing' }));
                    setIncomingCallData({ offer: data.offer, caller, callType: data.callType });
                    break;
                }
                case 'call-answer':
                    webRTCRef.current?.handleAnswer(data.answer);
                    break;
                case 'ice-candidate':
                    webRTCRef.current?.handleIceCandidate(data.candidate);
                    break;
            }
        },
        [currentUser?.user_id],
    );

    const queryClient = useQueryClient();
    const { ably, presenceData } = useAbly();

    // Subscribe to real-time messages via Ably
    useEffect(() => {
        if (!ably || !selectedChatId) return;

        const channel = ably.channels.get(`chat:${selectedChatId}`);
        const subscription = (msg) => {
            queryClient.setQueryData(['messages', selectedChatId], (old) => {
                const messages = old || [];
                if (messages.find((m) => m.id === msg.data.id)) return messages;
                return [...messages, msg.data];
            });
            // Also invalidate chats to update the last message in sidebar
            queryClient.invalidateQueries({ queryKey: ['chats'] });
        };

        channel.subscribe('new_message', subscription);
        return () => channel.unsubscribe('new_message', subscription);
    }, [ably, selectedChatId, queryClient]);

    const webRTCRef = useRef(null);
    const [webRTCState, setWebRTCState] = useState({
        callState: 'idle',
        callType: null,
        remoteUser: null,
    });
    const [incomingCallData, setIncomingCallData] = useState(null);

    // Signaling object for useWebRTC
    const signaling = useMemo(() => {
        if (!ably || !selectedChatId) return null;
        const channel = ably.channels.get(`chat:${selectedChatId}:webrtc`);
        return {
            send: (message) => {
                try {
                    const parsed = JSON.parse(message);
                    const eventType = parsed.type; // 'call-offer', 'call-answer', 'ice-candidate'
                    channel.publish(eventType, parsed.data);
                } catch (err) {
                    console.error('Failed to parse signaling message', err);
                }
            },
        };
    }, [ably, selectedChatId]);

    // Subscribe to WebRTC signaling events via Ably
    useEffect(() => {
        if (!ably || !selectedChatId) return;

        const channel = ably.channels.get(`chat:${selectedChatId}:webrtc`);

        const handleOffer = (msg) => handleWebRTCMessage('call-offer', msg.data);
        const handleAnswer = (msg) => handleWebRTCMessage('call-answer', msg.data);
        const handleIce = (msg) => handleWebRTCMessage('ice-candidate', msg.data);

        channel.subscribe('call-offer', handleOffer);
        channel.subscribe('call-answer', handleAnswer);
        channel.subscribe('ice-candidate', handleIce);

        return () => {
            channel.unsubscribe('call-offer', handleOffer);
            channel.unsubscribe('call-answer', handleAnswer);
            channel.unsubscribe('ice-candidate', handleIce);
        };
    }, [ably, selectedChatId, handleWebRTCMessage]);

    const webRTC = useWebRTC(signaling, currentUser?.id);
    webRTCRef.current = webRTC;

    const [activeEmojiPicker, setActiveEmojiPicker] = useState(null);
    const [activeDeleteMenu, setActiveDeleteMenu] = useState(null);
    const [showChatSearch, setShowChatSearch] = useState(false);
    const [chatSearchQuery, setChatSearchQuery] = useState('');
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [groupParticipants, setGroupParticipants] = useState('');
    const [showForwardModal, setShowForwardModal] = useState(false);
    const [messageToForward, setMessageToForward] = useState(null);
    const [showPollModal, setShowPollModal] = useState(false);
    const [pollQuestion, setPollQuestion] = useState('');
    const [pollOptions, setPollOptions] = useState(['', '']);
    const [pollIsMultiple, setPollIsMultiple] = useState(false);
    const [showContactModal, setShowContactModal] = useState(false);
    const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [showGifPicker, setShowGifPicker] = useState(false);
    const [showStickerPicker, setShowStickerPicker] = useState(false);
    const [showChatMenu, setShowChatMenu] = useState(false);
    const [editGroupName, setEditGroupName] = useState('');
    const [editGroupAvatar, setEditGroupAvatar] = useState('');
    const [isEditingGroup, setIsEditingGroup] = useState(false);
    const [newParticipants, setNewParticipants] = useState('');
    const [selectedUploadFile, setSelectedUploadFile] = useState(null);
    const [isViewOnceUpload, setIsViewOnceUpload] = useState(false);
    const [viewedMediaUrl, setViewedMediaUrl] = useState(null);
    const { uploadFile, uploadImage } = useMediaUpload();
    const [showInputMenu, setShowInputMenu] = useState(false);
    const [revealedNsfwMessages, setRevealedNsfwMessages] = useState(new Set());

    // Handle "Contact Seller" or direct navigation
    useEffect(() => {
        if (location.state?.recipientUsername) {
            createChat(location.state.recipientUsername, {
                onSuccess: (data) => {
                    setSelectedChatId(data.id);
                    window.history.replaceState({}, document.title);
                },
            });
        }
    }, [location.state, createChat]);

    // Select first chat by default if none selected and chats exist (Desktop only)
    useEffect(() => {
        const isMobile = window.innerWidth < 768;
        if (
            !isMobile &&
            !selectedChatId &&
            chats?.length > 0 &&
            !location.state?.recipientUsername
        ) {
            setSelectedChatId(chats[0].id);
        }
    }, [chats, selectedChatId, location.state]);

    const memoizedMarkRead = useCallback((id) => markRead(id), [markRead]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

        // Mark last message as read if it's from context user
        if (messages?.length > 0) {
            const lastMsg = messages[messages.length - 1];
            if (!lastMsg.is_me && !lastMsg.read_at) {
                memoizedMarkRead(lastMsg.id);
            }
        }
    }, [messages, selectedChatId, memoizedMarkRead]);

    const handleSearch = (e) => {
        if (e.key === 'Enter' && searchQuery.trim()) {
            setIsSearching(true);
            createChat(searchQuery.trim(), {
                onSuccess: (data) => {
                    setSelectedChatId(data.id);
                    setSearchQuery('');
                },
                onSettled: () => {
                    setIsSearching(false);
                },
            });
        }
    };

    const uploadProcessRef = useRef(null);
    uploadProcessRef.current = async (file) => {
        setIsUploading(true);
        try {
            let type = 'file';
            if (file.type.startsWith('image/')) type = 'image';
            else if (file.type.startsWith('video/')) type = 'video';
            else if (file.type.startsWith('audio/')) type = 'audio';
            else if (file.type.includes('pdf')) type = 'pdf';

            let url;
            if (type === 'image') {
                url = await uploadImage(file, (p) => setUploadProgress(p));
            } else {
                url = await uploadFile(file, (p) => setUploadProgress(p));
            }

            sendMessage({
                content: file.name,
                attachment_url: url,
                attachment_type: type,
                reply_to_id: replyingTo?.id,
            });
            setReplyingTo(null);
        } catch (error) {
            console.error('Upload failed', error);
            showToast('Failed to send message', 'error');
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setSelectedUploadFile(file);
    };

    const confirmUpload = async () => {
        if (!selectedUploadFile) return;
        const file = selectedUploadFile;
        setSelectedUploadFile(null);
        setIsUploading(true);
        try {
            let type = 'file';
            if (file.type.startsWith('image/')) type = 'image';
            else if (file.type.startsWith('video/')) type = 'video';
            else if (file.type.startsWith('audio/')) type = 'audio';
            else if (file.type.includes('pdf')) type = 'pdf';

            let url;
            if (type === 'image') {
                url = await uploadImage(file, (p) => setUploadProgress(p));
            } else {
                url = await uploadFile(file, (p) => setUploadProgress(p));
            }

            sendMessage({
                content: file.name,
                attachment_url: url,
                attachment_type: type,
                reply_to_id: replyingTo?.id,
                is_view_once: isViewOnceUpload,
            });
            setReplyingTo(null);
            setIsViewOnceUpload(false);
        } catch (error) {
            console.error('Upload failed', error);
            showToast('Failed to send message', 'error');
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSend = async () => {
        if (!messageInput.trim() || isSending) return;
        setIsSending(true);

        if (
            messageInput.toLowerCase().includes('congratulations') ||
            messageInput.toLowerCase().includes('happy birthday') ||
            messageInput.includes('🎉')
        ) {
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 4000);
        }

        const selectedChat = chats?.find((c) => c.id === selectedChatId);
        const recipientPublicKey = selectedChat?.participant?.public_key;

        const cleanup = () => {
            setMessageInput('');
            setReplyingTo(null);
            setIsSending(false);
        };

        if (isEncryptionReady && recipientPublicKey) {
            const encrypted = await encryptForRecipient(messageInput, recipientPublicKey);
            if (encrypted) {
                sendMessage(
                    {
                        content: '[Encrypted Message]',
                        encrypted_content: encrypted.content,
                        encryption_iv: encrypted.iv,
                        reply_to_id: replyingTo?.id,
                    },
                    { onSettled: cleanup },
                );
            } else {
                // Fallback to plain if encryption fails for some reason
                sendMessage(
                    { content: messageInput, reply_to_id: replyingTo?.id },
                    { onSettled: cleanup },
                );
            }
        } else {
            sendMessage(
                { content: messageInput, reply_to_id: replyingTo?.id },
                { onSettled: cleanup },
            );
        }
    };

    const handleForwardSelect = (targetChatId) => {
        if (!messageToForward) return;
        forwardMessage({
            chatId: targetChatId,
            content: messageToForward.content,
            attachment_url: messageToForward.attachment_url,
            attachment_type: messageToForward.attachment_type,
        });
        setShowForwardModal(false);
        setMessageToForward(null);
    };

    const handleCreateGroup = () => {
        if (!groupName.trim() || !groupParticipants.trim()) return;
        const usernames = groupParticipants
            .split(',')
            .map((u) => u.trim())
            .filter((u) => u);
        createGroup(
            { name: groupName, participants: usernames },
            {
                onSuccess: (data) => {
                    setSelectedChatId(data.id);
                    setShowGroupModal(false);
                    setGroupName('');
                    setGroupParticipants('');
                },
            },
        );
    };

    const handleGifSelect = (gifUrl) => {
        sendMessage({
            content: 'Sent a GIF',
            attachment_url: gifUrl,
            attachment_type: 'gif',
        });
        setShowGifPicker(false);
    };

    const handleCreatePoll = () => {
        if (!pollQuestion.trim() || pollOptions.filter((o) => o.trim()).length < 2) return;
        sendMessage({
            content: `📊 Poll: ${pollQuestion}`,
            poll: {
                question: pollQuestion,
                options: pollOptions.filter((o) => o.trim()),
                is_multiple: pollIsMultiple,
            },
        });
        setShowPollModal(false);
        setPollQuestion('');
        setPollOptions(['', '']);
        setPollIsMultiple(false);
    };

    const handleShareLocation = (isLive = false) => {
        if (!navigator.geolocation) {
            showToast('Geolocation is not supported by your browser', 'error');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                sendMessage({
                    content: isLive ? '📡 Shared live location' : '📍 Shared a location',
                    location: {
                        latitude,
                        longitude,
                        label: isLive ? 'Live Location' : 'Current Location',
                        is_live: isLive,
                        duration_minutes: isLive ? 60 : null,
                    },
                });
                setShowLocationMenu(false);
                setShowInputMenu(false);
            },
            (error) => {
                console.error('Error getting location', error);
                showToast('Could not get your location. Please check permissions.', 'error');
            },
        );
    };

    const handleShareContact = (targetUser) => {
        sendMessage({
            content: `👤 Contact: ${targetUser.username}`,
            contact: {
                username: targetUser.username,
                full_name: targetUser.full_name,
                avatar_url: targetUser.avatar_url,
            },
        });
        setShowContactModal(false);
    };

    const handleAddParticipants = () => {
        if (!newParticipants.trim()) return;
        const usernames = newParticipants
            .split(',')
            .map((u) => u.trim())
            .filter((u) => u);
        addParticipants(usernames, {
            onSuccess: () => {
                setNewParticipants('');
            },
        });
    };

    const handleRemoveParticipant = (username) => {
        if (window.confirm(`Are you sure you want to remove ${username}?`)) {
            removeParticipant(username);
        }
    };

    const handleLeaveGroup = () => {
        if (window.confirm('Are you sure you want to leave this group?')) {
            leaveGroup(null, {
                onSuccess: () => {
                    setSelectedChatId(null);
                    setShowGroupInfoModal(false);
                },
            });
        }
    };

    const startRecording = async () => {
        let stream = null;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : 'audio/webm';

            const recorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            recorder.onstop = async () => {
                // Ensure tracks are stopped immediately
                if (stream) {
                    stream.getTracks().forEach((track) => track.stop());
                }

                const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
                const file = new File([audioBlob], 'voice_note.webm', { type: mimeType });

                if (uploadProcessRef.current) {
                    await uploadProcessRef.current(file);
                }
            };

            recorder.start(1000);
            setIsRecording(true);
            setRecordingDuration(0);
            timerRef.current = setInterval(() => {
                setRecordingDuration((prev) => prev + 1);
            }, 1000);
        } catch (err) {
            console.error('Mic access failed', err);
            showToast('Microphone access denied', 'error');
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
            }
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    };

    const formatDuration = (s) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatLastSeen = (lastSeen) => {
        if (!lastSeen) return null;
        const date = new Date(lastSeen);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 1000 / 60);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
        return date.toLocaleDateString();
    };

    const renderMedia = (msg) => {
        const {
            attachment_url: url,
            attachment_type: type,
            is_view_once,
            viewed_at,
            is_me,
            id,
        } = msg;
        if (is_view_once && viewed_at && !is_me) {
            return (
                <div className="view-once-placeholder viewed">
                    <CheckCheck size={16} />
                    <span>Opened</span>
                </div>
            );
        }

        if (is_view_once && !is_me) {
            return (
                <div
                    className="view-once-placeholder"
                    onClick={() => {
                        setViewedMediaUrl({ url, type, id });
                        markViewed(id);
                    }}
                >
                    <Play size={16} />
                    <span>View Private Media</span>
                </div>
            );
        }

        // Stickers
        if (type === 'sticker') {
            return (
                <div className="msg-media-container sticker-container">
                    <img
                        src={url}
                        alt="Sticker"
                        style={{ width: '120px', height: '120px', objectFit: 'contain' }}
                    />
                </div>
            );
        }

        const isImage =
            type === 'image' || type === 'gif' || url.match(/\.(jpeg|jpg|gif|png|webp)$/i);
        const isVideo = type === 'video' || url.match(/\.(mp4|webm)$/i);
        const isAudio = type === 'audio' || url.match(/\.(mp3|wav|ogg|oog|m4a|webm)$/i);
        const isPDF = url.toLowerCase().endsWith('.pdf') || type === 'pdf';

        const isNsfw = shouldBlur(msg) && !revealedNsfwMessages.has(id);

        if (isImage) {
            return (
                <div className={`msg-media-container ${isNsfw ? 'nsfw-blurred' : ''}`}>
                    <img src={url} alt="attachment" />
                    {isNsfw && (
                        <div
                            className="nsfw-overlay"
                            onClick={() => setRevealedNsfwMessages((prev) => new Set(prev).add(id))}
                        >
                            <Shield size={20} />
                            <span>Sensitive</span>
                        </div>
                    )}
                </div>
            );
        }

        // Prioritize audio check (fixes voice_note.webm which has type='audio' but matches video regex)
        if (isAudio) return <VoiceNotePlayer url={url} />;
        if (isVideo)
            return (
                <div className={`msg-media-container ${isNsfw ? 'nsfw-blurred' : ''}`}>
                    <video src={url} controls={!isNsfw} />
                    {isNsfw && (
                        <div
                            className="nsfw-overlay"
                            onClick={() => setRevealedNsfwMessages((prev) => new Set(prev).add(id))}
                        >
                            <Lock size={20} />
                            <span>Sensitive</span>
                        </div>
                    )}
                </div>
            );

        // Inline PDF or Doc Viewer
        const viewerUrl = isPDF
            ? url
            : `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;

        return (
            <div className="inline-doc-viewer">
                <div className="doc-preview-container">
                    <iframe src={viewerUrl} title="Document Preview" className="inline-iframe" />
                </div>
                <div className="doc-footer">
                    <div className={`doc-icon ${isPDF ? 'pdf' : ''}`}>
                        <FileIcon size={12} />
                    </div>
                    <span className="doc-name">{isPDF ? 'PDF Document' : 'Document'}</span>
                    <a href={url} download className="doc-download-link">
                        Save
                    </a>
                </div>
            </div>
        );
    };

    const selectedChat = chats?.find((c) => c.id === selectedChatId);

    return (
        <div className="container messages-page">
            <div className={`messages-layout card ${selectedChatId ? 'chat-active' : ''}`}>
                {/* Sidebar */}
                {showConfetti && (
                    <div className="confetti-overlay">
                        <div className="confetti-piece"></div>
                        <div className="confetti-piece"></div>
                        <div className="confetti-piece"></div>
                        <div className="confetti-piece"></div>
                        <div className="confetti-piece"></div>
                        <div className="confetti-piece"></div>
                        <div className="confetti-piece"></div>
                        <div className="confetti-piece"></div>
                        <div className="confetti-piece"></div>
                        <div className="confetti-piece"></div>
                    </div>
                )}
                <div className={`msg-sidebar ${selectedChatId && isMobile ? 'hidden' : ''}`}>
                    <div className="msg-header">
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '1rem',
                            }}
                        >
                            <h2 style={{ margin: 0 }}>Messages</h2>
                            <Avatar src={user.avatar_url} name={user.username} size="sm" />
                        </div>
                        <div className="search-bar">
                            <div className="search-input-wrapper">
                                <Search
                                    size={16}
                                    className={`search-icon ${isSearching ? 'pulsing' : ''}`}
                                />
                                <input
                                    type="text"
                                    placeholder={isSearching ? 'Searching...' : 'Search users...'}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={handleSearch}
                                />
                            </div>
                            <button
                                className="new-group-btn"
                                onClick={() => setShowGroupModal(true)}
                                title="New Group"
                            >
                                <Users size={18} />
                            </button>
                        </div>
                    </div>
                    <div className="chat-list">
                        {isLoadingChats ? (
                            <div style={{ padding: '1rem', textAlign: 'center' }}>Loading...</div>
                        ) : chats?.length === 0 ? (
                            <div style={{ padding: '1.5rem', textAlign: 'center', color: '#666' }}>
                                <p>No chats found.</p>
                                <small>Search a username to start a chat</small>
                            </div>
                        ) : (
                            <div
                                className="chats-list"
                                style={{ display: 'flex', flexDirection: 'column' }}
                            >
                                {(chats || []).map((chat) => (
                                    <ChatRow
                                        key={chat.id}
                                        data={{
                                            chats: chats || [],
                                            presenceData,
                                            selectedChatId,
                                            setSelectedChatId,
                                        }}
                                        index={chats?.indexOf(chat) || 0}
                                        style={{}}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                <div className={`msg-main ${!selectedChatId && isMobile ? 'hidden' : ''}`}>
                    {!selectedChatId ? (
                        <div className="no-chat-selected">
                            <div style={{ textAlign: 'center', color: '#666' }}>
                                <h3>Select a conversation</h3>
                                <p>Use the search bar to find users by username</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="chat-area-header">
                                <button
                                    className="mobile-chat-back-btn"
                                    onClick={() => setSelectedChatId(null)}
                                >
                                    <ArrowLeft size={20} />
                                </button>
                                <div className="chat-user-profile">
                                    <div className="avatar-wrapper">
                                        <Avatar
                                            src={selectedChat?.avatar_url}
                                            name={selectedChat?.name}
                                            size={42}
                                        />
                                        {!selectedChat?.is_group &&
                                            selectedChat?.participant?.is_online && (
                                                <div className="online-indicator"></div>
                                            )}
                                    </div>
                                    <div
                                        className="user-status-info"
                                        onClick={() =>
                                            selectedChat?.is_group && setShowGroupInfoModal(true)
                                        }
                                        style={{
                                            cursor: selectedChat?.is_group ? 'pointer' : 'default',
                                        }}
                                    >
                                        <h3>{selectedChat?.name}</h3>
                                        <span
                                            className={`status-text ${!selectedChat?.is_group && selectedChat?.participant?.is_online ? 'online' : ''}`}
                                        >
                                            {selectedChat?.is_group
                                                ? 'Group Chat'
                                                : selectedChat?.participant?.is_online
                                                  ? 'Online'
                                                  : selectedChat?.participant?.last_seen
                                                    ? `Last seen ${formatLastSeen(selectedChat.participant.last_seen)}`
                                                    : 'Offline'}
                                        </span>
                                    </div>
                                    {!selectedChat?.is_group &&
                                        selectedChat?.participant?.public_key && (
                                            <div className="e2ee-tag">
                                                <Lock size={10} /> <span>E2EE</span>
                                            </div>
                                        )}
                                </div>
                                <div className="chat-actions">
                                    {showChatSearch && (
                                        <input
                                            type="text"
                                            className="chat-search-input"
                                            placeholder="Search in chat..."
                                            value={chatSearchQuery}
                                            onChange={(e) => setChatSearchQuery(e.target.value)}
                                            autoFocus
                                        />
                                    )}
                                    <button
                                        className={`icon-btn ${showChatSearch ? 'active' : ''}`}
                                        onClick={() => {
                                            setShowChatSearch(!showChatSearch);
                                            setChatSearchQuery('');
                                        }}
                                    >
                                        <Search size={18} />
                                    </button>
                                    <button
                                        className="icon-btn"
                                        onClick={() =>
                                            webRTC.startCall(selectedChat.participant, 'voice')
                                        }
                                        disabled={!selectedChat?.participant}
                                        title="Voice Call"
                                    >
                                        <Phone size={20} />
                                    </button>
                                    <button
                                        className="icon-btn"
                                        onClick={() =>
                                            webRTC.startCall(selectedChat.participant, 'video')
                                        }
                                        disabled={!selectedChat?.participant}
                                        title="Video Call"
                                    >
                                        <Video size={20} />
                                    </button>
                                    <button
                                        className="icon-btn"
                                        onClick={() => setShowChatMenu(!showChatMenu)}
                                    >
                                        <MoreVertical size={20} />
                                    </button>

                                    {showChatMenu && selectedChat && (
                                        <div className="chat-settings-dropdown">
                                            <button
                                                onClick={() => {
                                                    muteChat({
                                                        chatId: selectedChat.id,
                                                        mute: !selectedChat.is_muted,
                                                    });
                                                    setShowChatMenu(false);
                                                }}
                                            >
                                                {selectedChat.is_muted ? 'Unmute' : 'Mute'}{' '}
                                                Notifications
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const dur = prompt(
                                                        'Set disappearing duration (in seconds, e.g. 86400 for 24h) or 0 to disable:',
                                                        selectedChat.disappearing_duration || 0,
                                                    );
                                                    if (dur !== null)
                                                        setDisappearing(parseInt(dur) || null);
                                                    setShowChatMenu(false);
                                                }}
                                            >
                                                Disappearing Messages
                                            </button>
                                            {!selectedChat.is_group && (
                                                <button
                                                    onClick={() => {
                                                        blockUser({
                                                            userId: selectedChat.participant
                                                                ?.user_id,
                                                            block: true,
                                                        });
                                                        setShowChatMenu(false);
                                                    }}
                                                    className="danger-btn"
                                                >
                                                    Block User
                                                </button>
                                            )}
                                            {selectedChat.is_group && (
                                                <button
                                                    onClick={() => {
                                                        setShowGroupInfoModal(true);
                                                        setShowChatMenu(false);
                                                    }}
                                                >
                                                    Group Info
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="chat-messages">
                                {isLoadingMessages ? (
                                    <div style={{ textAlign: 'center' }}>Loading...</div>
                                ) : (
                                    messages
                                        ?.filter(
                                            (m) =>
                                                !chatSearchQuery ||
                                                m.content
                                                    ?.toLowerCase()
                                                    .includes(chatSearchQuery.toLowerCase()),
                                        )
                                        .map((msg) => (
                                            <div
                                                key={msg.id}
                                                className={`message-row ${msg.is_me ? 'sent' : 'received'} ${msg.is_deleted ? 'is-deleted' : ''}`}
                                            >
                                                <div className="message-bubble">
                                                    {!msg.is_deleted && !msg.is_system && (
                                                        <div
                                                            className={`message-actions-hover ${activeEmojiPicker === msg.id || activeDeleteMenu === msg.id ? 'force-visible' : ''}`}
                                                        >
                                                            <button
                                                                className="hover-action-btn"
                                                                onClick={() =>
                                                                    setActiveEmojiPicker(
                                                                        activeEmojiPicker === msg.id
                                                                            ? null
                                                                            : msg.id,
                                                                    )
                                                                }
                                                            >
                                                                <Smile size={16} />
                                                            </button>
                                                            <button
                                                                className="hover-action-btn"
                                                                onClick={() =>
                                                                    setReplyingTo({
                                                                        id: msg.id,
                                                                        content: msg.content,
                                                                        username: msg.is_me
                                                                            ? 'You'
                                                                            : msg.sender_username,
                                                                    })
                                                                }
                                                            >
                                                                <Reply size={16} />
                                                            </button>
                                                            <button
                                                                className="hover-action-btn"
                                                                onClick={() => {
                                                                    setMessageToForward(msg);
                                                                    setShowForwardModal(true);
                                                                }}
                                                            >
                                                                <Forward size={16} />
                                                            </button>
                                                            <button
                                                                className="hover-action-btn"
                                                                onClick={() =>
                                                                    setActiveDeleteMenu(
                                                                        activeDeleteMenu === msg.id
                                                                            ? null
                                                                            : msg.id,
                                                                    )
                                                                }
                                                            >
                                                                <Trash size={16} />
                                                            </button>

                                                            {activeEmojiPicker === msg.id && (
                                                                <div className="emoji-picker-mini">
                                                                    {COMMON_EMOJIS.map((emoji) => (
                                                                        <span
                                                                            key={emoji}
                                                                            onClick={() => {
                                                                                reactMessage({
                                                                                    messageId:
                                                                                        msg.id,
                                                                                    emoji,
                                                                                });
                                                                                setActiveEmojiPicker(
                                                                                    null,
                                                                                );
                                                                            }}
                                                                        >
                                                                            {emoji}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {activeDeleteMenu === msg.id && (
                                                                <div className="delete-menu-mini">
                                                                    <button
                                                                        onClick={() => {
                                                                            deleteMessage({
                                                                                messageId: msg.id,
                                                                                mode: 'me',
                                                                            });
                                                                            setActiveDeleteMenu(
                                                                                null,
                                                                            );
                                                                        }}
                                                                    >
                                                                        Delete for me
                                                                    </button>
                                                                    {msg.is_me && (
                                                                        <button
                                                                            onClick={() => {
                                                                                deleteMessage({
                                                                                    messageId:
                                                                                        msg.id,
                                                                                    mode: 'everyone',
                                                                                });
                                                                                setActiveDeleteMenu(
                                                                                    null,
                                                                                );
                                                                            }}
                                                                        >
                                                                            Delete for everyone
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {msg.is_system && (
                                                        <div className="system-msg-badge">
                                                            <Shield size={10} /> SYSTEM MESSAGE
                                                        </div>
                                                    )}

                                                    {msg.reply_to && !msg.is_deleted && (
                                                        <div className="reply-indicator">
                                                            <strong>{msg.reply_to.username}</strong>
                                                            <p>{msg.reply_to.content || 'Media'}</p>
                                                        </div>
                                                    )}

                                                    <div className="msg-content-wrapper">
                                                        <DecryptedText
                                                            content={msg.content}
                                                            encryptedContent={msg.encrypted_content}
                                                            iv={msg.encryption_iv}
                                                            participantPublicKey={
                                                                selectedChat?.participant
                                                                    ?.public_key
                                                            }
                                                            decryptFromSender={decryptFromSender}
                                                            isDeleted={msg.is_deleted}
                                                        />
                                                        {!msg.is_deleted &&
                                                            msg.attachment_url &&
                                                            renderMedia(msg)}
                                                        {!msg.is_deleted && msg.poll && (
                                                            <PollMessage
                                                                poll={msg.poll}
                                                                messageId={msg.id}
                                                                onVote={votePoll}
                                                            />
                                                        )}
                                                        {!msg.is_deleted && msg.location && (
                                                            <LocationMessage
                                                                location={msg.location}
                                                            />
                                                        )}
                                                        {!msg.is_deleted && msg.contact && (
                                                            <ContactMessage
                                                                contact={msg.contact}
                                                                onCreateChat={(username) =>
                                                                    createChat(username, {
                                                                        onSuccess: (data) =>
                                                                            setSelectedChatId(
                                                                                data.id,
                                                                            ),
                                                                    })
                                                                }
                                                            />
                                                        )}
                                                    </div>

                                                    <div className="msg-footer">
                                                        <span className="msg-time">
                                                            {new Date(
                                                                msg.created_at,
                                                            ).toLocaleTimeString([], {
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                            })}
                                                        </span>
                                                        {msg.is_me && (
                                                            <span
                                                                className={`msg-status ${msg.read_at ? 'read' : ''}`}
                                                            >
                                                                {msg.read_at ? (
                                                                    <CheckCheck size={12} />
                                                                ) : (
                                                                    <Check size={12} />
                                                                )}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {msg.reactions?.length > 0 &&
                                                        !msg.is_deleted && (
                                                            <div className="reactions-display">
                                                                {msg.reactions.map((r) => (
                                                                    <div
                                                                        key={r.emoji}
                                                                        className={`reaction-tag ${r.me_reacted ? 'mine' : ''}`}
                                                                        onClick={() =>
                                                                            reactMessage({
                                                                                messageId: msg.id,
                                                                                emoji: r.emoji,
                                                                            })
                                                                        }
                                                                    >
                                                                        {r.emoji}{' '}
                                                                        <span>
                                                                            {r.count > 1
                                                                                ? r.count
                                                                                : ''}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                </div>
                                            </div>
                                        ))
                                )}
                                {isUploading && (
                                    <div className="message-row sent">
                                        <div className="sending-indicator">
                                            <span>Sending media... {uploadProgress}%</span>
                                            <div className="progress-bar-container">
                                                <div
                                                    className="progress-bar-fill"
                                                    style={{ width: `${uploadProgress}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="chat-input-area-container">
                                {selectedChat?.name === 'System' ? (
                                    <div className="system-no-reply">
                                        <Lock size={14} /> This is a system chat. You cannot reply
                                        to these messages.
                                    </div>
                                ) : (
                                    <>
                                        {replyingTo && (
                                            <div className="reply-preview">
                                                <div className="reply-info">
                                                    <strong>{replyingTo.username}</strong>
                                                    <p>{replyingTo.content || 'Media'}</p>
                                                </div>
                                                <button
                                                    className="icon-btn"
                                                    onClick={() => setReplyingTo(null)}
                                                    style={{ padding: '2px' }}
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        )}

                                        <div className="chat-input-area">
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                style={{ display: 'none' }}
                                                onChange={handleFileUpload}
                                            />

                                            {isRecording ? (
                                                <div className="voice-recording-overlay">
                                                    <div className="recording-pulse"></div>
                                                    <span>
                                                        Recording...{' '}
                                                        {formatDuration(recordingDuration)}
                                                    </span>
                                                    <button
                                                        className="icon-btn"
                                                        style={{ marginLeft: 'auto', color: 'red' }}
                                                        onClick={stopRecording}
                                                    >
                                                        <Square size={20} fill="red" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div
                                                        className="input-left-controls"
                                                        style={{
                                                            display: 'flex',
                                                            gap: '0.5rem',
                                                            alignItems: 'center',
                                                        }}
                                                    >
                                                        <div
                                                            className="input-more-menu-wrapper"
                                                            style={{ position: 'relative' }}
                                                        >
                                                            <button
                                                                className={`icon-btn ${showInputMenu ? 'active' : ''}`}
                                                                onClick={() =>
                                                                    setShowInputMenu(!showInputMenu)
                                                                }
                                                                disabled={isUploading}
                                                            >
                                                                <MoreVertical size={20} />
                                                            </button>
                                                            {showInputMenu && (
                                                                <div className="input-more-menu">
                                                                    <button
                                                                        onClick={() => {
                                                                            setShowGifPicker(
                                                                                !showGifPicker,
                                                                            );
                                                                            setShowStickerPicker(
                                                                                false,
                                                                            );
                                                                            setShowInputMenu(false);
                                                                        }}
                                                                    >
                                                                        <div className="menu-icon-label-mini">
                                                                            GIF
                                                                        </div>{' '}
                                                                        <span>GIF</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            setShowStickerPicker(
                                                                                !showStickerPicker,
                                                                            );
                                                                            setShowGifPicker(false);
                                                                            setShowInputMenu(false);
                                                                        }}
                                                                    >
                                                                        <Smile size={18} />{' '}
                                                                        <span>Stickers</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            fileInputRef.current?.click();
                                                                            setShowInputMenu(false);
                                                                        }}
                                                                    >
                                                                        <Paperclip size={18} />{' '}
                                                                        <span>File</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            setShowPollModal(true);
                                                                            setShowInputMenu(false);
                                                                        }}
                                                                    >
                                                                        <BarChart2 size={18} />{' '}
                                                                        <span>Poll</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            handleShareLocation();
                                                                            setShowInputMenu(false);
                                                                        }}
                                                                    >
                                                                        <MapPin size={18} />{' '}
                                                                        <span>Location</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            setShowContactModal(
                                                                                true,
                                                                            );
                                                                            setShowInputMenu(false);
                                                                        }}
                                                                    >
                                                                        <Users size={18} />{' '}
                                                                        <span>Contact</span>
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <button
                                                            className={`icon-btn ${isRecording ? 'recording-active' : ''}`}
                                                            onClick={startRecording}
                                                            disabled={isUploading}
                                                            title="Record Voice"
                                                        >
                                                            <Mic size={20} />
                                                        </button>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        placeholder="Type message..."
                                                        value={messageInput}
                                                        onChange={(e) =>
                                                            setMessageInput(e.target.value)
                                                        }
                                                        onKeyDown={(e) =>
                                                            e.key === 'Enter' && handleSend()
                                                        }
                                                        disabled={isUploading}
                                                    />
                                                    <button
                                                        className="send-btn"
                                                        onClick={handleSend}
                                                        disabled={
                                                            isUploading ||
                                                            isSending ||
                                                            !messageInput.trim()
                                                        }
                                                    >
                                                        {isSending ? (
                                                            <Loader2
                                                                className="animate-spin"
                                                                size={20}
                                                            />
                                                        ) : (
                                                            <Send size={20} />
                                                        )}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                            {showGifPicker && (
                                <GifPicker
                                    onSelect={handleGifSelect}
                                    onClose={() => setShowGifPicker(false)}
                                />
                            )}
                            {showStickerPicker && (
                                <div className="sticker-picker-mini">
                                    {STICKERS.map((s) => (
                                        <img
                                            key={s.id}
                                            src={s.url}
                                            alt="Sticker"
                                            onClick={() => {
                                                sendMessage({
                                                    content: 'Sticker',
                                                    attachment_url: s.url,
                                                    attachment_type: 'sticker',
                                                });
                                                setShowStickerPicker(false);
                                            }}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            <ForwardModal
                showForwardModal={showForwardModal}
                setShowForwardModal={setShowForwardModal}
                messageToForward={messageToForward}
                chats={chats}
                handleForwardSelect={handleForwardSelect}
            />

            <GroupModal
                showGroupModal={showGroupModal}
                setShowGroupModal={setShowGroupModal}
                groupName={groupName}
                setGroupName={setGroupName}
                groupParticipants={groupParticipants}
                setGroupParticipants={setGroupParticipants}
                handleCreateGroup={handleCreateGroup}
                isCreatingGroup={isCreatingGroup}
            />

            <PollModal
                showPollModal={showPollModal}
                setShowPollModal={setShowPollModal}
                pollQuestion={pollQuestion}
                setPollQuestion={setPollQuestion}
                pollOptions={pollOptions}
                setPollOptions={setPollOptions}
                pollIsMultiple={pollIsMultiple}
                setPollIsMultiple={setPollIsMultiple}
                handleCreatePoll={handleCreatePoll}
            />

            <ContactModal
                showContactModal={showContactModal}
                setShowContactModal={setShowContactModal}
                chats={chats}
                handleShareContact={handleShareContact}
            />

            <FilePreviewModal
                selectedUploadFile={selectedUploadFile}
                setSelectedUploadFile={setSelectedUploadFile}
                isViewOnceUpload={isViewOnceUpload}
                setIsViewOnceUpload={setIsViewOnceUpload}
                confirmUpload={confirmUpload}
            />

            {viewedMediaUrl && (
                <div className="full-screen-overlay" onClick={() => setViewedMediaUrl(null)}>
                    <div className="media-viewer-container" onClick={(e) => e.stopPropagation()}>
                        <button className="close-viewer" onClick={() => setViewedMediaUrl(null)}>
                            <X size={24} />
                        </button>
                        {viewedMediaUrl.type === 'image' ? (
                            <img src={viewedMediaUrl.url} alt="View Once" />
                        ) : viewedMediaUrl.type === 'video' ? (
                            <video src={viewedMediaUrl.url} controls autoPlay />
                        ) : (
                            <div className="generic-file-view">
                                <FileIcon size={64} />
                                <p>File View</p>
                                <a href={viewedMediaUrl.url} download className="create-btn">
                                    Download
                                </a>
                            </div>
                        )}
                        <p className="viewer-hint">Close now - this media will disappear!</p>
                    </div>
                </div>
            )}
            <GroupInfoModal
                showGroupInfoModal={showGroupInfoModal}
                selectedChat={selectedChat}
                setShowGroupInfoModal={setShowGroupInfoModal}
                isEditingGroup={isEditingGroup}
                setIsEditingGroup={setIsEditingGroup}
                editGroupName={editGroupName}
                setEditGroupName={setEditGroupName}
                editGroupAvatar={editGroupAvatar}
                setEditGroupAvatar={setEditGroupAvatar}
                updateGroup={updateGroup}
                toggleAdmin={toggleAdmin}
                handleRemoveParticipant={handleRemoveParticipant}
                newParticipants={newParticipants}
                setNewParticipants={setNewParticipants}
                handleAddParticipants={handleAddParticipants}
                handleLeaveGroup={handleLeaveGroup}
            />

            {/* Call UI */}
            {webRTC.callState === 'ringing' && incomingCallData && (
                <IncomingCallModal
                    caller={incomingCallData.caller}
                    callType={incomingCallData.callType}
                    onAccept={() => {
                        webRTC.answerCall(
                            incomingCallData.offer,
                            incomingCallData.caller,
                            incomingCallData.callType,
                        );
                        setIncomingCallData(null);
                    }}
                    onReject={() => {
                        webRTC.rejectCall();
                        setIncomingCallData(null);
                    }}
                />
            )}

            {webRTC.callState === 'calling' && webRTC.remoteUser && (
                <CallingScreen
                    remoteUser={webRTC.remoteUser}
                    callType={webRTC.callType}
                    onCancel={webRTC.endCall}
                />
            )}

            {webRTC.callState === 'active' && webRTC.remoteUser && (
                <ActiveCallScreen
                    callType={webRTC.callType}
                    remoteUser={webRTC.remoteUser}
                    localStream={webRTC.localStream}
                    remoteStream={webRTC.remoteStream}
                    isMuted={webRTC.isMuted}
                    isVideoOff={webRTC.isVideoOff}
                    callDuration={webRTC.callDuration}
                    onToggleMute={webRTC.toggleMute}
                    onToggleVideo={webRTC.toggleVideo}
                    onEndCall={webRTC.endCall}
                />
            )}
        </div>
    );
};

export default MessagesPage;
