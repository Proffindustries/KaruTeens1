import React, { useState } from 'react';
import { MapPin, Calendar, Edit2, Twitter, Instagram, Youtube, Video, Share2, Quote, User as UserIcon, CheckCircle, Zap, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import PostCard from '../components/PostCard.jsx';
import { PostSkeleton } from '../components/Skeleton.jsx';
import '../styles/ProfilePage.css'; // Creating this next

import { useParams } from 'react-router-dom';
import { useProfile, useUpdateProfile } from '../hooks/useUser.js';
import { useMediaUpload } from '../hooks/useMedia.js';
import Avatar from '../components/Avatar.jsx';

const ProfilePage = () => {
    const { username: urlUsername } = useParams();
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const targetUsername = urlUsername || currentUser.username;

    const { data: profile, isLoading, error } = useProfile(targetUsername);
    const { mutate: updateProfile, isPending: isUpdating } = useUpdateProfile();
    const { uploadImage, isUploading: isUploadingMedia } = useMediaUpload();

    const avatarInputRef = React.useRef(null);
    const [isEditing, setIsEditing] = useState(false);

    const handleAvatarClick = () => {
        if (isOwnProfile) {
            avatarInputRef.current.click();
        }
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const url = await uploadImage(file);
            updateProfile({ avatar_url: url });
        } catch (err) {
            console.error('Avatar upload failed:', err);
        }
    };

    // Disable body scroll when modal is open
    React.useEffect(() => {
        if (isEditing) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isEditing]);

    const [editForm, setEditForm] = useState({
        bio: '',
        full_name: '',
        school: '',
        year_of_study: '',
        age: '',
        gender: '',
        social_links: {
            instagram: '',
            tiktok: '',
            youtube: '',
            twitter: '',
            other: ''
        }
    });

    const isOwnProfile = !urlUsername || urlUsername === currentUser.username;

    // We'll set the form initial values when opening modal
    const openEditModal = () => {
        setEditForm({
            bio: profile?.bio || '',
            full_name: profile?.full_name || '',
            school: profile?.school || '',
            year_of_study: profile?.year_of_study || '',
            age: profile?.age || '',
            gender: profile?.gender || '',
            social_links: {
                instagram: profile?.social_links?.instagram || '',
                tiktok: profile?.social_links?.tiktok || '',
                youtube: profile?.social_links?.youtube || '',
                twitter: profile?.social_links?.twitter || '',
                other: profile?.social_links?.other || ''
            }
        });
        setIsEditing(true);
    };

    const handleUpdate = () => {
        updateProfile({
            ...editForm,
            year_of_study: editForm.year_of_study ? parseInt(editForm.year_of_study) : null,
            age: editForm.age ? parseInt(editForm.age) : null
        }, {
            onSuccess: () => setIsEditing(false)
        });
    };

    if (isLoading) return <div className="container">Loading profile...</div>;
    if (error) return <div className="container">Error: {error.message}</div>;
    if (!profile) return <div className="container">Profile not found</div>;

    // Use fetched data instead of dummy data
    const user = {
        name: profile.full_name || "New User",
        username: `@${profile.username}`,
        bio: profile.bio || "No bio yet.",
        school: profile.school || "Unspecified School",
        year: profile.year_of_study ? `Year ${profile.year_of_study}` : "N/A",
        age: profile.age || "N/A",
        gender: profile.gender || "Unspecified",
        joined: profile.created_at ? new Date(profile.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : "Recently",
        followers: 0,
        following: 0,
        quote: "Knowledge increases by sharing, not by saving.",
        socials: profile.social_links || {}
    };

    const userPosts = []; // Fetch posts by user handler next

    return (
        <div className="container profile-page">
            {/* Header / Cover */}
            <div className="profile-header-card">
                <div className="profile-cover"></div>
                <div className="profile-main-info">
                    <div
                        className={`profile-avatar-container ${isOwnProfile ? 'editable' : ''}`}
                        onClick={handleAvatarClick}
                    >
                        <Avatar
                            src={profile.avatar_url}
                            name={user.name}
                            className="profile-avatar-lg"
                        />
                        {isOwnProfile && (
                            <div className="avatar-edit-overlay">
                                <Edit2 size={24} />
                            </div>
                        )}
                        {isUploadingMedia && (
                            <div className="avatar-loading-overlay">
                                <div className="shimmer"></div>
                            </div>
                        )}
                        <input
                            type="file"
                            ref={avatarInputRef}
                            hidden
                            accept="image/*"
                            onChange={handleAvatarChange}
                        />
                    </div>
                    <div className="profile-actions">
                        {isOwnProfile && (
                            <button className="btn btn-outline btn-sm" onClick={openEditModal} disabled={isUploadingMedia}>
                                <Edit2 size={16} /> Edit Profile
                            </button>
                        )}
                    </div>
                </div>

                <div className="profile-text-content">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <h1>{user.name}</h1>
                        {profile.is_verified && <CheckCircle size={20} color="#2ed573" fill="#2ed573" style={{ color: 'white' }} title="Verified Student" />}
                        {profile.is_premium && <Zap size={20} color="#f1c40f" fill="#f1c40f" title="Campus Pro" />}
                    </div>
                    <p className="profile-username">
                        {user.username}
                        {profile.is_premium && <span className="premium-tag">PRO</span>}
                    </p>
                    <p className="profile-bio">{user.bio}</p>

                    <div className="profile-meta-grid">
                        <span><MapPin size={16} /> Kenya</span>
                        <span>🎓 {user.school} • {user.year}</span>
                        <span><Calendar size={16} /> Member</span>
                    </div>

                    <div className="profile-stats">
                        <div><strong>{user.followers}</strong> <span>Followers</span></div>
                        <div><strong>{user.following}</strong> <span>Following</span></div>
                    </div>
                </div>
            </div>

            {/* Quote of the Semester */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card quote-card"
            >
                <Quote size={32} className="quote-icon" />
                <p>"{user.quote}"</p>
            </motion.div>

            {/* Content Tabs */}
            <div className="profile-content-grid">
                <div className="left-column">
                    <div className="card info-card">
                        <h3>About</h3>
                        <ul>
                            <li><strong>Age:</strong> {user.age}</li>
                            <li><strong>Gender:</strong> {user.gender}</li>
                            <li><strong>School:</strong> {user.school}</li>
                        </ul>
                        <div className="social-links-profile">
                            {user.socials.instagram && <a href={`https://instagram.com/${user.socials.instagram}`} target="_blank" rel="noreferrer"><Instagram size={20} /></a>}
                            {user.socials.twitter && <a href={`https://twitter.com/${user.socials.twitter}`} target="_blank" rel="noreferrer"><Twitter size={20} /></a>}
                            {user.socials.tiktok && <a href={`https://tiktok.com/@${user.socials.tiktok}`} target="_blank" rel="noreferrer"><Video size={20} /></a>}
                            {user.socials.youtube && <a href={`https://youtube.com/@${user.socials.youtube}`} target="_blank" rel="noreferrer"><Youtube size={20} /></a>}
                            {user.socials.other && <a href={user.socials.other} target="_blank" rel="noreferrer"><Share2 size={20} /></a>}
                        </div>
                    </div>
                </div>

                <div className="main-column">
                    <div className="posts-feed">
                        {isLoading ? (
                            [1, 2].map(i => <PostSkeleton key={i} />)
                        ) : userPosts?.length > 0 ? (
                            userPosts.map(post => (
                                <PostCard key={post.id} post={post} />
                            ))
                        ) : (
                            <div className="empty-state card" style={{ padding: '3rem', textAlign: 'center' }}>
                                <p>No posts by this user yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {isEditing && (
                <div className="modal-overlay" onClick={() => setIsEditing(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Edit Profile</h3>
                            <button className="close-btn" onClick={() => setIsEditing(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Full Name</label>
                                <input
                                    className="form-input"
                                    value={editForm.full_name}
                                    onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Bio</label>
                                <textarea
                                    className="form-input"
                                    rows="3"
                                    value={editForm.bio}
                                    onChange={e => setEditForm({ ...editForm, bio: e.target.value })}
                                ></textarea>
                            </div>
                            <div className="form-group">
                                <label>School</label>
                                <input
                                    className="form-input"
                                    value={editForm.school}
                                    onChange={e => setEditForm({ ...editForm, school: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Year of Study</label>
                                <select
                                    className="form-input"
                                    value={editForm.year_of_study}
                                    onChange={e => setEditForm({ ...editForm, year_of_study: e.target.value })}
                                >
                                    <option value="">Select Year</option>
                                    <option value="1">Year 1</option>
                                    <option value="2">Year 2</option>
                                    <option value="3">Year 3</option>
                                    <option value="4">Year 4</option>
                                </select>
                            </div>
                            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group">
                                    <label>Age</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={editForm.age}
                                        onChange={e => setEditForm({ ...editForm, age: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Gender</label>
                                    <select
                                        className="form-input"
                                        value={editForm.gender}
                                        onChange={e => setEditForm({ ...editForm, gender: e.target.value })}
                                    >
                                        <option value="">Select</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Instagram (username)</label>
                                <input
                                    className="form-input"
                                    placeholder="@username"
                                    value={editForm.social_links.instagram}
                                    onChange={e => setEditForm({ ...editForm, social_links: { ...editForm.social_links, instagram: e.target.value } })}
                                />
                            </div>
                            <div className="form-group">
                                <label>TikTok (username)</label>
                                <input
                                    className="form-input"
                                    placeholder="@username"
                                    value={editForm.social_links.tiktok}
                                    onChange={e => setEditForm({ ...editForm, social_links: { ...editForm.social_links, tiktok: e.target.value } })}
                                />
                            </div>
                            <div className="form-group">
                                <label>YouTube (handle)</label>
                                <input
                                    className="form-input"
                                    placeholder="@handle"
                                    value={editForm.social_links.youtube}
                                    onChange={e => setEditForm({ ...editForm, social_links: { ...editForm.social_links, youtube: e.target.value } })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Twitter (username)</label>
                                <input
                                    className="form-input"
                                    placeholder="@username"
                                    value={editForm.social_links.twitter}
                                    onChange={e => setEditForm({ ...editForm, social_links: { ...editForm.social_links, twitter: e.target.value } })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Other Link (URL)</label>
                                <input
                                    className="form-input"
                                    placeholder="https://..."
                                    value={editForm.social_links.other}
                                    onChange={e => setEditForm({ ...editForm, social_links: { ...editForm.social_links, other: e.target.value } })}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn btn-primary btn-full"
                                onClick={handleUpdate}
                                disabled={isUpdating}
                            >
                                {isUpdating ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfilePage;
