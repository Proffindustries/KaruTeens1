import React, { useState } from 'react';
import {
    MapPin,
    Calendar,
    Edit2,
    Twitter,
    Instagram,
    Youtube,
    Video,
    Share2,
    Quote,
    User as UserIcon,
    CheckCircle,
    Zap,
    ShieldCheck,
    Flame,
    Trophy,
    Eye,
    Award,
    Star,
    Lock,
} from 'lucide-react';
import { motion } from 'framer-motion';
import PostCard from '../components/PostCard.jsx';
import { PostSkeleton, ProfileSkeleton } from '../components/Skeleton.jsx';
import AdComponent from '../components/AdComponent.jsx';
import '../styles/ProfilePage.css';

import { useParams } from 'react-router-dom';
import { useProfile, useUpdateProfile, useFollow, useUnfollow } from '../hooks/useUser.js';
import { useMediaUpload } from '../hooks/useMedia.js';
import { useUpload } from '../context/UploadContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Avatar from '../components/Avatar.jsx';
import { useGamification } from '../hooks/useGamification.js';
import { useInfiniteUserContent } from '../hooks/useInfiniteQueries.ts';

const ProfilePage = () => {
    const { username: urlUsername } = useParams();
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const targetUsername = urlUsername || currentUser.username;

    const { data: profileRes, isLoading, error } = useProfile(targetUsername);
    const { mutate: updateProfile, isPending: isUpdating } = useUpdateProfile();
    const { mutate: follow, isPending: isFollowingAction } = useFollow();
    const { mutate: unfollow, isPending: isUnfollowingAction } = useUnfollow();
    const { uploadImage, isUploading: isUploadingMedia } = useMediaUpload();
    const { addUpload, updateUploadProgress, completeUpload, failUpload } = useUpload();
    const { showToast } = useToast();
    const { data: gamificationData } = useGamification(targetUsername);
    const gamificationRes = gamificationData;

    // Fetch user's posts
    const { data: postsData } = useInfiniteUserContent(targetUsername, 'posts');
    const userPosts = postsData?.pages?.flatMap((page) => page) || [];

    const profile = profileRes?.profile || profileRes;
    const stats = {
        followers: profile?.follower_count || profileRes?.followers_count || 0,
        following: profile?.following_count || profileRes?.following_count || 0,
        isFollowing: profileRes?.is_following || false,
    };

    const avatarInputRef = React.useRef(null);
    const [isEditing, setIsEditing] = useState(false);

    const isOwnProfile = !urlUsername || urlUsername === currentUser.username;

    const handleAvatarClick = () => {
        if (isOwnProfile) {
            avatarInputRef.current.click();
        }
    };

    const handleAvatarChange = async (e) => {
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
            updateProfile({ avatar_url: url });
        } catch (err) {
            failUpload(uploadId, err);
            showToast('Avatar upload failed. Please try again.', 'error');
        }
    };

    const handleFollowToggle = () => {
        if (stats.isFollowing) {
            unfollow(targetUsername);
        } else {
            follow(targetUsername);
        }
    };

    const [editForm, setEditForm] = useState({
        bio: '',
        full_name: '',
        school: '',
        year_of_study: '',
        age: '',
        gender: '',
        is_locked: false,
        skills: '',
        interests: '',
        social_links: {
            instagram: '',
            tiktok: '',
            youtube: '',
            twitter: '',
            other: '',
        },
        quote: '',
        location: '',
    });

    // We'll set the form initial values when opening modal
    const openEditModal = () => {
        setEditForm({
            bio: profile?.bio || '',
            full_name: profile?.full_name || '',
            school: profile?.school || '',
            year_of_study: profile?.year_of_study?.toString() || '',
            age: profile?.age?.toString() || '',
            gender: profile?.gender || '',
            is_locked: profile?.is_locked || false,
            skills: profile?.skills?.join(', ') || '',
            interests: profile?.interests?.join(', ') || '',
            social_links: {
                instagram: profile?.social_links?.instagram || '',
                tiktok: profile?.social_links?.tiktok || '',
                youtube: profile?.social_links?.youtube || '',
                twitter: profile?.social_links?.twitter || '',
                other: profile?.social_links?.other || '',
            },
            quote: profile?.quote || '',
            location: profile?.location || '',
        });
        setIsEditing(true);
    };

    const handleUpdate = () => {
        updateProfile(
            {
                ...editForm,
                year_of_study: editForm.year_of_study ? parseInt(editForm.year_of_study) : null,
                age: editForm.age ? parseInt(editForm.age) : null,
                skills: editForm.skills ? editForm.skills.split(',').map(s => s.trim()) : [],
                interests: editForm.interests ? editForm.interests.split(',').map(i => i.trim()) : [],
            },
            {
                onSuccess: () => setIsEditing(false),
            },
        );
    };

    if (isLoading)
        return (
            <div className="container">
                <ProfileSkeleton />
            </div>
        );
    if (error)
        return (
            <div className="container error-container">
                <div className="error-content">
                    <h2>Unable to load profile</h2>
                    <p>Something went wrong while loading this profile.</p>
                    <button className="btn btn-primary" onClick={() => window.location.reload()}>
                        Try Again
                    </button>
                </div>
            </div>
        );
    if (!profile)
        return (
            <div className="container" style={{ padding: '2rem' }}>
                Profile not found
            </div>
        );

    const user = {
        name: profile.full_name || profile.username || 'New User',
        username: `@${profile.username}`,
        bio: profile.bio || 'No bio yet.',
        school: profile.school || 'Unspecified School',
        year: profile.year_of_study ? `Year ${profile.year_of_study}` : 'N/A',
        age: profile.age || 'N/A',
        gender: profile.gender || 'Unspecified',
        joined: profile.created_at
            ? new Date(profile.created_at).toLocaleDateString(undefined, {
                  month: 'long',
                  year: 'numeric',
              })
            : 'Recently',
        followers: stats.followers,
        following: stats.following,
        quote: profile.quote || 'Knowledge increases by sharing, not by saving.',
        socials: profile.social_links || {},
    };

    const isLocked = profile.is_locked && !isOwnProfile && !stats.isFollowing;

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
                        {isOwnProfile ? (
                            <button
                                className="btn btn-outline btn-sm"
                                onClick={openEditModal}
                                disabled={isUploadingMedia}
                            >
                                <Edit2 size={16} /> Edit Profile
                            </button>
                        ) : (
                            <button
                                className={`btn btn-sm ${stats.isFollowing ? 'btn-outline' : 'btn-primary'}`}
                                onClick={handleFollowToggle}
                                disabled={isFollowingAction || isUnfollowingAction}
                            >
                                {stats.isFollowing ? 'Following' : 'Follow'}
                            </button>
                        )}
                    </div>
                </div>

                <div className="profile-text-content">
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            flexWrap: 'wrap',
                        }}
                    >
                        <h1>{user.name}</h1>
                        {profile.is_verified && (
                            <CheckCircle
                                size={20}
                                color="#2ed573"
                                fill="#2ed573"
                                style={{ color: 'white' }}
                                title="Verified Student"
                            />
                        )}
                        {profile.is_premium && (
                            <Zap size={20} color="#f1c40f" fill="#f1c40f" title="Campus Pro" />
                        )}
                        {profile.is_locked && (
                            <ShieldCheck size={20} color="#747d8c" title="Locked Profile" />
                        )}
                    </div>
                    <p className="profile-username">
                        {user.username}
                        {profile.is_premium && <span className="premium-tag">PRO</span>}
                    </p>
                    <p className="profile-bio">{user.bio}</p>

                    <div className="profile-meta-grid">
                        {profile.location && (
                            <span>
                                <MapPin size={16} /> {profile.location}
                            </span>
                        )}
                        <span>
                            🎓 {user.school} • {user.year}
                        </span>
                        <span>
                            <Calendar size={16} /> Member
                        </span>
                    </div>

                    <div className="profile-stats">
                        <div>
                            <strong>{user.followers}</strong> <span>Followers</span>
                        </div>
                        <div>
                            <strong>{user.following}</strong> <span>Following</span>
                        </div>
                        {isOwnProfile && (
                            <div>
                                <strong>{gamificationRes?.profile_views || 0}</strong> <span>Views</span>
                            </div>
                        )}
                    </div>

                    {/* Gamification Stats */}
                    <div className="profile-gamification">
                        <div className="gamification-item points" title="KaruPoints">
                            <Star size={16} fill="#f1c40f" color="#f1c40f" />
                            <span>{(gamificationRes?.points || 0).toLocaleString()} pts</span>
                        </div>
                        {(gamificationRes?.streak || 0) > 0 && (
                            <div
                                className="gamification-item streak"
                                title={`${gamificationRes?.streak || 0} day streak! Best: ${gamificationRes?.longestStreak || 0}`}
                            >
                                <Flame size={16} fill="#e74c3c" color="#e74c3c" />
                                <span>{gamificationRes?.streak || 0}🔥</span>
                            </div>
                        )}
                        <div
                            className="gamification-item level"
                            title={`Level ${gamificationRes?.level || 0}`}
                        >
                            <Trophy size={16} fill="#9b59b6" color="#9b59b6" />
                            <span>Lvl {gamificationRes?.level || 0}</span>
                        </div>
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

            {/* Badges Section */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card badges-card"
            >
                <div className="badges-header">
                    <h3>
                        <Award size={20} /> Achievements
                    </h3>
                    <span className="badge-count">
                        {(gamificationRes?.badges || []).length} badges
                    </span>
                </div>
                <div className="badges-grid">
                    {(gamificationRes?.badges || []).map((badge) => (
                        <div key={badge.id} className="badge-item" title={badge.description}>
                            <span className="badge-icon">{badge.icon}</span>
                            <span className="badge-name">{badge.name}</span>
                        </div>
                    ))}
                    <div className="badge-item locked" title="Unlock more badges by engaging!">
                        <Lock size={16} />
                        <span>+{Math.max(5 - (gamificationRes?.badges?.length || 0), 0)} more</span>
                    </div>
                </div>
                <div className="level-progress">
                    <div className="level-info">
                        <span>Level {gamificationRes?.level || 0}</span>
                        <span>
                            {gamificationRes?.points || 0}/{gamificationRes?.next_level_points || 1000} pts
                        </span>
                    </div>
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{
                                width: `${Math.min(((gamificationRes?.points || 0) / (gamificationRes?.next_level_points || 1000)) * 100, 100)}%`,
                            }}
                        ></div>
                    </div>
                </div>
            </motion.div>

            {/* Content Tabs */}
            <div className="profile-content-grid">
                <div className="left-column">
                    <div className="card info-card">
                        <h3>About</h3>
                        {isLocked ? (
                            <div
                                className="locked-message"
                                style={{ textAlign: 'center', padding: '1rem' }}
                            >
                                <ShieldCheck
                                    size={32}
                                    style={{ marginBottom: '0.5rem', opacity: 0.5 }}
                                />
                                <p>This profile is locked. Follow to see full details.</p>
                            </div>
                        ) : (
                            <>
                                <ul>
                                    <li>
                                        <strong>Age:</strong> {user.age}
                                    </li>
                                    <li>
                                        <strong>Gender:</strong> {user.gender}
                                    </li>
                                    <li>
                                        <strong>School:</strong> {user.school}
                                    </li>
                                </ul>

                                {profile.skills?.length > 0 && (
                                    <div className="profile-tags-section">
                                        <h4>Skills</h4>
                                        <div className="tags-flex">
                                            {profile.skills.map((s, i) => <span key={i} className="skill-tag">{s}</span>)}
                                        </div>
                                    </div>
                                )}

                                {profile.interests?.length > 0 && (
                                    <div className="profile-tags-section">
                                        <h4>Interests</h4>
                                        <div className="tags-flex">
                                            {profile.interests.map((s, i) => <span key={i} className="interest-tag">{s}</span>)}
                                        </div>
                                    </div>
                                )}

                                <div className="social-links-profile">
                                    {user.socials.instagram && (
                                        <a
                                            href={`https://instagram.com/${user.socials.instagram}`}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            <Instagram size={20} />
                                        </a>
                                    )}
                                    {user.socials.twitter && (
                                        <a
                                            href={`https://twitter.com/${user.socials.twitter}`}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            <Twitter size={20} />
                                        </a>
                                    )}
                                    {user.socials.tiktok && (
                                        <a
                                            href={`https://tiktok.com/@${user.socials.tiktok}`}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            <Video size={20} />
                                        </a>
                                    )}
                                    {user.socials.youtube && (
                                        <a
                                            href={`https://youtube.com/@${user.socials.youtube}`}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            <Youtube size={20} />
                                        </a>
                                    )}
                                    {user.socials.other && (
                                        <a
                                            href={user.socials.other}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            <Share2 size={20} />
                                        </a>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="profile-ad-unit" style={{ marginTop: '1.5rem' }}>
                        <AdComponent page="profile" />
                    </div>
                </div>

                <div className="main-column">
                    <div className="posts-feed">
                        {isLocked ? (
                            <div
                                className="empty-state card"
                                style={{ padding: '3rem', textAlign: 'center' }}
                            >
                                <ShieldCheck
                                    size={48}
                                    style={{ marginBottom: '1rem', opacity: 0.2 }}
                                />
                                <h3>Locked Profile</h3>
                                <p>Follow this user to see their posts and interactions.</p>
                            </div>
                        ) : isLoading ? (
                            [1, 2].map((i) => <PostSkeleton key={i} />)
                        ) : userPosts?.length > 0 ? (
                            userPosts.map((post) => <PostCard key={post.id} post={post} />)
                        ) : (
                            <div
                                className="empty-state card"
                                style={{ padding: '3rem', textAlign: 'center' }}
                            >
                                <p>No posts by this user yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {isEditing && (
                <div className="modal-overlay" onClick={() => setIsEditing(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Edit Profile</h3>
                            <button className="close-btn" onClick={() => setIsEditing(false)}>
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <div
                                className="form-group"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    marginBottom: '1rem',
                                }}
                            >
                                <input
                                    type="checkbox"
                                    id="is_locked"
                                    checked={editForm.is_locked}
                                    onChange={(e) =>
                                        setEditForm({ ...editForm, is_locked: e.target.checked })
                                    }
                                />
                                <label htmlFor="is_locked" style={{ margin: 0 }}>
                                    Locked Profile (Only followers can see your details)
                                </label>
                            </div>
                            <div className="form-group">
                                <label>Full Name</label>
                                <input
                                    className="form-input"
                                    value={editForm.full_name}
                                    onChange={(e) =>
                                        setEditForm({ ...editForm, full_name: e.target.value })
                                    }
                                />
                            </div>
                            <div className="form-group">
                                <label>Bio</label>
                                <textarea
                                    className="form-input"
                                    rows="3"
                                    value={editForm.bio}
                                    onChange={(e) =>
                                        setEditForm({ ...editForm, bio: e.target.value })
                                    }
                                ></textarea>
                            </div>
                            <div className="form-group">
                                <label>Location</label>
                                <input
                                    className="form-input"
                                    placeholder="City, Country"
                                    value={editForm.location}
                                    onChange={(e) =>
                                        setEditForm({ ...editForm, location: e.target.value })
                                    }
                                />
                            </div>
                            <div className="form-group">
                                <label>School</label>
                                <input
                                    className="form-input"
                                    value={editForm.school}
                                    onChange={(e) =>
                                        setEditForm({ ...editForm, school: e.target.value })
                                    }
                                />
                            </div>
                            <div className="form-group">
                                <label>Year of Study</label>
                                <select
                                    className="form-input"
                                    value={editForm.year_of_study}
                                    onChange={(e) =>
                                        setEditForm({ ...editForm, year_of_study: e.target.value })
                                    }
                                >
                                    <option value="">Select Year</option>
                                    <option value="1">Year 1</option>
                                    <option value="2">Year 2</option>
                                    <option value="3">Year 3</option>
                                    <option value="4">Year 4</option>
                                    <option value="5">Year 5+</option>
                                    <option value="0">Alumni</option>
                                </select>
                            </div>
                            <div
                                className="form-row"
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '1rem',
                                }}
                            >
                                <div className="form-group">
                                    <label>Age</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={editForm.age}
                                        onChange={(e) =>
                                            setEditForm({ ...editForm, age: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Gender</label>
                                    <select
                                        className="form-input"
                                        value={editForm.gender}
                                        onChange={(e) =>
                                            setEditForm({ ...editForm, gender: e.target.value })
                                        }
                                    >
                                        <option value="">Select</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <h4>Social Links</h4>
                            <div className="form-group">
                                <label>Instagram (username)</label>
                                <input
                                    className="form-input"
                                    placeholder="@username"
                                    value={editForm.social_links.instagram}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            social_links: {
                                                ...editForm.social_links,
                                                instagram: e.target.value,
                                            },
                                        })
                                    }
                                />
                            </div>
                            <div className="form-group">
                                <label>TikTok (username)</label>
                                <input
                                    className="form-input"
                                    placeholder="@username"
                                    value={editForm.social_links.tiktok}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            social_links: {
                                                ...editForm.social_links,
                                                tiktok: e.target.value,
                                            },
                                        })
                                    }
                                />
                            </div>
                            <div className="form-group">
                                <label>Twitter (username)</label>
                                <input
                                    className="form-input"
                                    placeholder="@username"
                                    value={editForm.social_links.twitter}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            social_links: {
                                                ...editForm.social_links,
                                                twitter: e.target.value,
                                            },
                                        })
                                    }
                                />
                            </div>
                            <div className="form-group">
                                <label>YouTube (link or @handle)</label>
                                <input
                                    className="form-input"
                                    placeholder="@channel or URL"
                                    value={editForm.social_links.youtube}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            social_links: {
                                                ...editForm.social_links,
                                                youtube: e.target.value,
                                            },
                                        })
                                    }
                                />
                            </div>
                            <div className="form-group">
                                <label>Other Website/Link</label>
                                <input
                                    className="form-input"
                                    placeholder="https://..."
                                    value={editForm.social_links.other}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            social_links: {
                                                ...editForm.social_links,
                                                other: e.target.value,
                                            },
                                        })
                                    }
                                />
                            </div>
                            <div className="form-group">
                                <label>Profile Quote</label>
                                <input
                                    className="form-input"
                                    placeholder="A quote that defines you..."
                                    value={editForm.quote}
                                    onChange={(e) =>
                                        setEditForm({ ...editForm, quote: e.target.value })
                                    }
                                />
                            </div>

                            <div className="form-group">
                                <label>Skills (comma separated)</label>
                                <input
                                    className="form-input"
                                    placeholder="Coding, Design, Public Speaking..."
                                    value={editForm.skills}
                                    onChange={(e) =>
                                        setEditForm({ ...editForm, skills: e.target.value })
                                    }
                                />
                            </div>

                            <div className="form-group">
                                <label>Interests (comma separated)</label>
                                <input
                                    className="form-input"
                                    placeholder="Reading, Photography, Travel..."
                                    value={editForm.interests}
                                    onChange={(e) =>
                                        setEditForm({ ...editForm, interests: e.target.value })
                                    }
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
