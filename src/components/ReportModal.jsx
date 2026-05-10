import React, { useState } from 'react';
import {
    X,
    Flag,
    AlertTriangle,
    Ban,
    MessageCircle,
    ShieldAlert,
    Fingerprint,
    HelpCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReportPost } from '../hooks/useContent';
import { useToast } from '../context/ToastContext.jsx';
import '../styles/ReportModal.css';

const REASONS = [
    { value: 'spam', label: 'Spam', icon: Ban },
    { value: 'harassment', label: 'Harassment or bullying', icon: AlertTriangle },
    { value: 'inappropriate', label: 'Inappropriate content', icon: ShieldAlert },
    { value: 'abuse', label: 'Abuse', icon: Flag },
    { value: 'violence', label: 'Violence or threats', icon: AlertTriangle },
    { value: 'misinformation', label: 'Misinformation', icon: Fingerprint },
    { value: 'other', label: 'Other', icon: HelpCircle },
];

const ReportModal = ({ post, onClose }) => {
    const [selectedReason, setSelectedReason] = useState('');
    const [description, setDescription] = useState('');
    const [step, setStep] = useState('reason');
    const { mutate: reportPost, isPending } = useReportPost();
    const { showToast } = useToast();

    const handleSubmit = () => {
        if (!selectedReason) return;
        reportPost(
            { postId: post.id, reason: selectedReason, description: description || null },
            {
                onSuccess: () => {
                    showToast('Post reported successfully', 'success');
                    onClose();
                },
                onError: (err) => {
                    showToast(err?.response?.data?.error || 'Failed to report post', 'error');
                },
            },
        );
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="report-modal-overlay"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="report-modal-content"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="report-modal-header">
                        <h3>Report Post</h3>
                        <button className="report-close-btn" onClick={onClose}>
                            <X size={20} />
                        </button>
                    </div>

                    {step === 'reason' && (
                        <div className="report-step">
                            <p className="report-subtitle">Why are you reporting this post?</p>
                            <div className="report-reasons">
                                {REASONS.map((r) => {
                                    const Icon = r.icon;
                                    return (
                                        <button
                                            key={r.value}
                                            className={`report-reason-btn ${selectedReason === r.value ? 'selected' : ''}`}
                                            onClick={() => {
                                                setSelectedReason(r.value);
                                                setStep('detail');
                                            }}
                                        >
                                            <Icon size={20} />
                                            <span>{r.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {step === 'detail' && (
                        <div className="report-step">
                            <p className="report-subtitle">
                                Tell us more <small>(optional)</small>
                            </p>
                            <textarea
                                className="report-textarea"
                                placeholder="Provide additional details..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={4}
                            />
                            <div className="report-actions">
                                <button
                                    className="btn btn-outline"
                                    onClick={() => {
                                        setStep('reason');
                                        setSelectedReason('');
                                    }}
                                >
                                    Back
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleSubmit}
                                    disabled={isPending}
                                >
                                    {isPending ? 'Submitting...' : 'Submit Report'}
                                </button>
                            </div>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ReportModal;
