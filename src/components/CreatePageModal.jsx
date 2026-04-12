import React, { useState, useRef } from 'react';
import { X, Layout, ImageIcon, ChevronRight, Globe, Shield, Sparkles, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCreatePage } from '../hooks/usePages';
import { useMediaUpload } from '../hooks/useMedia';
import { useUpload } from '../context/UploadContext';
import '../styles/CreatePageModal.css';

const CATEGORIES = [
    'Academic', 'Social', 'Entepreneurship', 'Department', 
    'Society', 'Sports', 'Entertainment', 'News', 'Other'
];

const CreatePageModal = ({ isOpen, onClose }) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: 'Academic',
        avatar_url: '',
        cover_url: ''
    });
    
    const avatarRef = useRef();
    const coverRef = useRef();
    const { mutate: createPage, isPending } = useCreatePage();
    const { uploadImage, isUploading } = useMediaUpload();
    const { addUpload, updateUploadProgress, completeUpload, failUpload } = useUpload();

    const handleFileChange = async (e, field) => {
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
            setFormData(prev => ({ ...prev, [field]: url }));
        } catch (err) {
            failUpload(uploadId, err);
            console.error('Upload failed', err);
        }
    };

    const handleSubmit = () => {
        createPage(formData, {
            onSuccess: (data) => {
                onClose();
                // Optionally navigate to the new page
            }
        });
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <motion.div 
                className="modal-content create-page-modal" 
                onClick={e => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
            >
                <div className="modal-header">
                    <div>
                        <h3>Create Your Page</h3>
                        <p>Share your vision with the campus community</p>
                    </div>
                    <button className="close-btn" onClick={onClose}><X size={24} /></button>
                </div>

                <div className="modal-body">
                    {step === 1 ? (
                        <div className="form-step">
                            <div className="form-group">
                                <label>Page Name</label>
                                <input 
                                    placeholder="e.g. Karu Tech Society" 
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Category</label>
                                <select 
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                >
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea 
                                    rows="4" 
                                    placeholder="What is your page about?"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <button 
                                className="btn btn-primary w-full mt-4" 
                                onClick={() => setStep(2)}
                                disabled={!formData.name || !formData.description}
                            >
                                Continue <ChevronRight size={18} />
                            </button>
                        </div>
                    ) : (
                        <div className="form-step">
                            <div className="branding-setup">
                                <div className="cover-upload" onClick={() => coverRef.current.click()}>
                                    {formData.cover_url ? <img src={formData.cover_url} alt="Cover" /> : <div className="placeholder"><ImageIcon /> Upload Cover Photo</div>}
                                    <input type="file" ref={coverRef} hidden onChange={e => handleFileChange(e, 'cover_url')} />
                                </div>
                                <div className="avatar-upload" onClick={() => avatarRef.current.click()}>
                                    {formData.avatar_url ? <img src={formData.avatar_url} alt="Avatar" /> : <div className="placeholder"><Layout /></div>}
                                    <input type="file" ref={avatarRef} hidden onChange={e => handleFileChange(e, 'avatar_url')} />
                                </div>
                            </div>
                            
                            <div className="benefits-card mt-6">
                                <h4><Sparkles size={16} /> Why create a page?</h4>
                                <ul>
                                    <li><Globe size={14} /> Reach all KaruTeens users</li>
                                    <li><Shield size={14} /> Only you can post and manage content</li>
                                    <li><Users size={14} /> Build a following for your organization</li>
                                </ul>
                            </div>

                            <div className="btn-group mt-8">
                                <button className="btn btn-outline" onClick={() => setStep(1)}>Back</button>
                                <button 
                                    className="btn btn-primary flex-1" 
                                    onClick={handleSubmit}
                                    disabled={isPending || isUploading}
                                >
                                    {isPending ? 'Creating...' : 'Launch Page'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default CreatePageModal;
