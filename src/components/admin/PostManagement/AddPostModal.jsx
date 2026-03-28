import React from 'react';

const AddPostModal = ({ show, onClose, onSave }) => {
    if (!show) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '1000px' }}
            >
                <div className="modal-header">
                    <h3>Add New Post</h3>
                    <button className="close-btn" onClick={onClose}>
                        ×
                    </button>
                </div>
                <div className="modal-body">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            onSave();
                        }}
                    >
                        <div className="form-row">
                            <div className="form-group">
                                <label>Post Title *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Enter post title"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Post Type *</label>
                                <select className="form-input" required>
                                    <option value="">Select post type</option>
                                    <option value="article">Article</option>
                                    <option value="blog">Blog</option>
                                    <option value="news">News</option>
                                    <option value="announcement">Announcement</option>
                                    <option value="tutorial">Tutorial</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Content *</label>
                            <textarea
                                className="form-input"
                                rows="8"
                                placeholder="Enter post content"
                                required
                            ></textarea>
                        </div>
                        <div className="form-group">
                            <label>Excerpt (Optional)</label>
                            <textarea
                                className="form-input"
                                rows="3"
                                placeholder="Enter post excerpt"
                            ></textarea>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Category *</label>
                                <select className="form-input" required>
                                    <option value="">Select category</option>
                                    <option value="Technology">Technology</option>
                                    <option value="Health">Health</option>
                                    <option value="News">News</option>
                                    <option value="Opinion">Opinion</option>
                                    <option value="Education">Education</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Tags (comma-separated)</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="tag1, tag2, tag3"
                                />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Language *</label>
                                <select className="form-input" required>
                                    <option value="en">English</option>
                                    <option value="sw">Swahili</option>
                                    <option value="fr">French</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Content Rating</label>
                                <select className="form-input">
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
                                        placeholder="Enter featured image URL"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Video URL (Optional)</label>
                                    <input
                                        type="url"
                                        className="form-input"
                                        placeholder="Enter video URL"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="form-section">
                            <h4>SEO Settings</h4>
                            <div className="form-group">
                                <label>SEO Title</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Enter SEO title"
                                />
                            </div>
                            <div className="form-group">
                                <label>SEO Description</label>
                                <textarea
                                    className="form-input"
                                    rows="3"
                                    placeholder="Enter SEO description"
                                ></textarea>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button type="button" className="btn-secondary" onClick={onClose}>
                                Cancel
                            </button>
                            <button type="submit" className="btn-primary">
                                Create Post
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddPostModal;
