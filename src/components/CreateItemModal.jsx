import React, { useState, useRef } from 'react';
import { X, Upload, Coins, Tag, FileText, Image as ImageIcon, Shield, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/CreateItemModal.css';
import { useCreateItem } from '../hooks/useMarketplace.js';
import { useMediaUpload } from '../hooks/useMedia.js';

const CreateItemModal = ({ isOpen, onClose }) => {
    const [formData, setFormData] = useState({
        title: '',
        price: '',
        description: '',
        category: 'Electronics',
        condition: 'Used - Good',
        currency: 'Ksh'
    });
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [previews, setPreviews] = useState([]);
    const fileInputRef = useRef(null);

    const { mutate: createItem, isPending } = useCreateItem();
    const { uploadImage, isUploading } = useMediaUpload();
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    // Reset when closed
    React.useEffect(() => {
        if (!isOpen) {
            setFormData({
                title: '',
                price: '',
                description: '',
                category: 'Electronics',
                condition: 'Used - Good',
                currency: 'Ksh'
            });
            setSelectedFiles([]);
            setPreviews([]);
        } else {
            document.body.style.overflow = 'hidden';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        setSelectedFiles(prev => [...prev, ...files]);

        const newPreviews = files.map(file => ({
            url: URL.createObjectURL(file),
            name: file.name
        }));
        setPreviews(prev => [...prev, ...newPreviews]);
    };

    const removeFile = (index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
        setPreviews(prev => {
            const newPreviews = prev.filter((_, i) => i !== index);
            URL.revokeObjectURL(prev[index].url);
            return newPreviews;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        let mediaUrls = [];
        if (selectedFiles.length > 0) {
            // Upload images one by one (or Promise.all if supported)
            try {
                const uploadPromises = selectedFiles.map(file => uploadImage(file));
                mediaUrls = await Promise.all(uploadPromises);
            } catch (error) {
                console.error("Upload failed", error);
                return; // Stop on error
            }
        }

        createItem({
            ...formData,
            price: parseFloat(formData.price),
            images: mediaUrls
        }, {
            onSuccess: () => {
                onClose();
            }
        });
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="create-item-modal-overlay" onClick={onClose}>
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="create-item-modal"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="modal-header">
                        <h2>Sell an Item</h2>
                        <button className="close-btn" onClick={onClose}><X size={24} /></button>
                    </div>

                    {!user.is_verified ? (
                        <div className="verification-gate-overlay">
                            <div className="gate-content">
                                <Shield size={64} className="gate-shield" />
                                <h3>Verification Required</h3>
                                <p>To prevent fraud and ensure a safe marketplace, sellers must complete a one-time human verification.</p>

                                <div className="gate-benefits">
                                    <div className="benefit">
                                        <Check size={16} />
                                        <span>List unlimited items</span>
                                    </div>
                                    <div className="benefit">
                                        <Check size={16} />
                                        <span>Verified seller badge</span>
                                    </div>
                                    <div className="benefit">
                                        <Check size={16} />
                                        <span>Appear higher in searches</span>
                                    </div>
                                </div>

                                <button
                                    className="btn btn-primary btn-full"
                                    onClick={() => {
                                        onClose();
                                        window.location.href = '/verification';
                                    }}
                                >
                                    Verify My Account (Ksh 20)
                                </button>
                                <p className="micro-text" style={{ marginTop: '1rem', opacity: 0.6 }}>One-time fee for lifetime access.</p>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Item Title</label>
                                <input
                                    name="title"
                                    className="form-input"
                                    placeholder="e.g. Calculus Textbook"
                                    value={formData.title}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Price</label>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <select
                                            name="currency"
                                            className="form-select"
                                            style={{ width: '80px' }}
                                            value={formData.currency}
                                            onChange={handleInputChange}
                                        >
                                            <option>Ksh</option>
                                            <option>USD</option>
                                        </select>
                                        <input
                                            name="price"
                                            type="number"
                                            className="form-input"
                                            placeholder="0.00"
                                            value={formData.price}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Category</label>
                                    <select
                                        name="category"
                                        className="form-select"
                                        value={formData.category}
                                        onChange={handleInputChange}
                                    >
                                        <option>Electronics</option>
                                        <option>Books</option>
                                        <option>Clothing</option>
                                        <option>Furniture</option>
                                        <option>Notes</option>
                                        <option>Other</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Condition</label>
                                <select
                                    name="condition"
                                    className="form-select"
                                    value={formData.condition}
                                    onChange={handleInputChange}
                                >
                                    <option>New</option>
                                    <option>Like New</option>
                                    <option>Used - Good</option>
                                    <option>Used - Fair</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    name="description"
                                    className="form-textarea"
                                    rows="3"
                                    placeholder="Describe the item condition, features, reason for selling..."
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    required
                                ></textarea>
                            </div>

                            <div className="form-group">
                                <label>Photos</label>
                                <div
                                    className="image-upload-area"
                                    onClick={() => fileInputRef.current.click()}
                                >
                                    <Upload size={32} color="#666" />
                                    <p>Click to upload photos</p>
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    hidden
                                    multiple
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />

                                {previews.length > 0 && (
                                    <div className="image-previews">
                                        {previews.map((prev, idx) => (
                                            <div key={idx} className="preview-container">
                                                <img src={prev.url} alt="preview" className="preview-image" />
                                                <button
                                                    type="button"
                                                    className="remove-image-btn"
                                                    onClick={() => removeFile(idx)}
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit"
                                className="submit-btn"
                                disabled={isPending || isUploading}
                            >
                                {isUploading ? 'Uploading Images...' : isPending ? 'Listing Item...' : 'List Item'}
                            </button>
                        </form>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default CreateItemModal;
