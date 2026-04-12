import React, { useState, useEffect } from 'react';
import { FileText, Lock, Eye, Download, AlertOctagon, RefreshCw } from 'lucide-react';
import api from '../api/client';
import { useToast } from '../context/ToastContext.jsx';
import AcademicFilters from '../components/AcademicFilters';
import '../styles/RecallPage.css';

const RECALL_CATEGORIES = ['Notes', 'Other Resources'];

const RecallPage = () => {
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewingDoc, setViewingDoc] = useState(null);
    const [fullContent, setFullContent] = useState(null);
    const { showToast } = useToast();

    const [filters, setFilters] = useState({
        search: '',
        school: 'all',
        programme: 'all',
        year: 'all',
        category: 'all',
    });

    useEffect(() => {
        fetchMaterials();
    }, [showToast]);

    const fetchMaterials = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.search) params.append('search', filters.search);
            if (filters.school !== 'all') params.append('school', filters.school);
            if (filters.programme !== 'all') params.append('programme', filters.programme);
            if (filters.year !== 'all') params.append('year', filters.year);
            if (filters.category !== 'all') params.append('category', filters.category);

            const { data } = await api.get(`/revision-materials?${params.toString()}`);
            const filteredData = data.filter(item => RECALL_CATEGORIES.includes(item.category) || (!item.category));
            setMaterials(filteredData);
        } catch (error) {
            console.error('Failed to fetch revision materials:', error);
            showToast('Failed to load revision materials. Please try again later.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleUnlock = (id) => {
        // Logic to trigger payment modal would go here
        showToast('Payment Gateway: Please pay Ksh 5 to unlock this document.', 'info');
    };

    const handleView = async (material) => {
        setViewingDoc(material);
        setFullContent(null);
        try {
            const { data } = await api.get(`/revision-materials/${material.id}`);
            if (data.is_locked && !data.has_purchased) {
                // Keep showing restricted view
            } else {
                setFullContent(data);
            }
        } catch (error) {
            console.error('Failed to fetch material details:', error);
            showToast('Failed to load material details. Please try again later.', 'error');
        }
    };

    if (loading) {
        return (
            <div className="container recall-page loading">
                <RefreshCw className="spin" size={48} />
                <p>Loading revision materials...</p>
            </div>
        );
    }

    return (
        <div className="container recall-page">
            <div className="recall-header">
                <h1>Recall - Notes & Resources</h1>
                <p>Access high-quality notes and other study resources.</p>
            </div>

            <AcademicFilters
                filters={filters}
                setFilters={setFilters}
                categories={RECALL_CATEGORIES}
                onSearch={fetchMaterials}
            />

            <div className="materials-grid">
                {materials.map((item) => (
                    <div key={item.id} className="card material-card">
                        <div className={`material-icon ${item.category.toLowerCase()}`}>
                            <FileText size={32} />
                            <span className="doc-type">{item.category}</span>
                        </div>
                        <div className="material-info">
                            <h3>{item.title}</h3>
                            <span className="course-badge">{item.course_code}</span>
                        </div>
                        <div className="material-action">
                            {item.is_locked ? (
                                <button
                                    className="btn btn-primary btn-sm btn-full"
                                    onClick={() => handleUnlock(item.id)}
                                >
                                    <Lock size={14} /> Unlock (Ksh {item.price})
                                </button>
                            ) : (
                                <button
                                    className="btn btn-outline btn-sm btn-full"
                                    onClick={() => handleView(item)}
                                >
                                    <Eye size={14} /> View
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Document Viewer Overlay */}
            {viewingDoc && (
                <div className="doc-viewer-overlay">
                    <div className="doc-viewer-content no-screenshot">
                        <div className="doc-header">
                            <h3>{viewingDoc.title}</h3>
                            <button
                                className="close-btn"
                                onClick={() => {
                                    setViewingDoc(null);
                                    setFullContent(null);
                                }}
                            >
                                ×
                            </button>
                        </div>
                        <div className="doc-body">
                            {fullContent ? (
                                <div className="pdf-page">
                                    <h1>
                                        {fullContent.course_code} - {fullContent.category}
                                    </h1>
                                    <p>Document content is now unlocked.</p>
                                    <div className="doc-iframe-container">
                                        {/* In a real app, this would be a PDF viewer */}
                                        <div className="material-content-preview">
                                            <p>Viewing: {fullContent.title}</p>
                                            <a
                                                href={fullContent.file_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn btn-primary"
                                            >
                                                <Download size={16} /> Download PDF
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="pdf-page">
                                    <h1>
                                        {viewingDoc.course_code} - {viewingDoc.category}
                                    </h1>
                                    <p>This is a preview of the document.</p>
                                    <div className="watermark">KARUTEENS PREVIEW</div>
                                    <p>
                                        Purchase this document to view the full content and download
                                        it.
                                    </p>
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => handleUnlock(viewingDoc.id)}
                                    >
                                        Unlock Full Access (Ksh {viewingDoc.price})
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="doc-footer">
                            <div className="security-warning">
                                <AlertOctagon size={16} />
                                <span>Screenshotting is disabled for this document.</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RecallPage;
