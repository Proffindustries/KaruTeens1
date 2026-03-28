import React from 'react';

const EditPostModal = ({ show, onClose, post, onUpdate }) => {
    if (!show || !post) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '1000px' }}
            >
                <div className="modal-header">
                    <h3>Edit Post: {post.title}</h3>
                    <button className="close-btn" onClick={onClose}>
                        ×
                    </button>
                </div>
                <div className="modal-body">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            onUpdate();
                        }}
                    >
                        <div className="form-row">
                            <div className="form-group">
                                <label>Post Title</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    defaultValue={post.title}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Post Type</label>
                                <select
                                    className="form-input"
                                    defaultValue={post.post_type}
                                    required
                                >
                                    <option value="article">Article</option>
                                    <option value="blog">Blog</option>
                                    <option value="news">News</option>
                                    <option value="announcement">Announcement</option>
                                    <option value="tutorial">Tutorial</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Content</label>
                            <textarea
                                className="form-input"
                                rows="8"
                                defaultValue={post.content}
                                required
                            ></textarea>
                        </div>
                        <div className="form-group">
                            <label>Excerpt</label>
                            <textarea
                                className="form-input"
                                rows="3"
                                defaultValue={post.excerpt || ''}
                            ></textarea>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Category</label>
                                <select
                                    className="form-input"
                                    defaultValue={post.category}
                                    required
                                >
                                    <option value="Technology">Technology</option>
                                    <option value="Health">Health</option>
                                    <option value="News">News</option>
                                    <option value="Opinion">Opinion</option>
                                    <option value="Education">Education</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Tags</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    defaultValue={post.tags?.join(', ') || ''}
                                />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Language</label>
                                <select
                                    className="form-input"
                                    defaultValue={post.language}
                                    required
                                >
                                    <option value="en">English</option>
                                    <option value="sw">Swahili</option>
                                    <option value="fr">French</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Content Rating</label>
                                <select
                                    className="form-input"
                                    defaultValue={post.content_rating || 'G'}
                                >
                                    <option value="G">G - General</option>
                                    <option value="PG">PG - Parental Guidance</option>
                                    <option value="R">R - Restricted</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-section">
                            <h4>Media & Content</h4>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Featured Image URL</label>
                                    <input
                                        type="url"
                                        className="form-input"
                                        defaultValue={post.featured_image || ''}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Video URL</label>
                                    <input
                                        type="url"
                                        className="form-input"
                                        defaultValue={post.video_url || ''}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button type="button" className="btn-secondary" onClick={onClose}>
                                Cancel
                            </button>
                            <button type="submit" className="btn-primary">
                                Update Post
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EditPostModal;
