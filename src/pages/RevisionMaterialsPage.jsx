import React, { useState, useEffect } from 'react';
import MainLayout from '../layouts/MainLayout';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import { Book, FileText, Video, Link as LinkIcon, Loader } from 'lucide-react';
import '../styles/RevisionMaterialsPage.css';

const RevisionMaterialsPage = () => {
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const { showToast } = useToast();

    useEffect(() => {
        fetchMaterials();
    }, []);

    const fetchMaterials = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/revision-materials');
            setMaterials(data);
        } catch (err) {
            console.log('Using local revision materials data');
            // Fallback mock data if API doesn't exist
            setMaterials([
                {
                    id: '1',
                    title: 'Mathematics Formulas',
                    type: 'document',
                    subject: 'Mathematics',
                    url: '/materials/math-formulas.pdf',
                    description: 'Complete collection of calculus and algebra formulas',
                },
                {
                    id: '2',
                    title: 'Physics Cheat Sheet',
                    type: 'document',
                    subject: 'Physics',
                    url: '/materials/physics-cheat-sheet.pdf',
                    description: 'Key physics concepts and equations',
                },
                {
                    id: '3',
                    title: 'Chemistry Periodic Table',
                    type: 'document',
                    subject: 'Chemistry',
                    url: '/materials/periodic-table.pdf',
                    description: 'Interactive periodic table with trends',
                },
                {
                    id: '4',
                    title: 'Biology Cell Structure',
                    type: 'video',
                    subject: 'Biology',
                    url: '/videos/cell-structure.mp4',
                    description: 'Detailed video explanation of cell organelles',
                },
                {
                    id: '5',
                    title: 'History Timeline',
                    type: 'link',
                    subject: 'History',
                    url: 'https://example.com/history-timeline',
                    description: 'Interactive timeline of world history',
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const filteredMaterials =
        filter === 'all'
            ? materials
            : materials.filter((m) => m.subject === filter || m.type === filter);

    const getTypeIcon = (type) => {
        switch (type) {
            case 'document':
                return <FileText size={20} />;
            case 'video':
                return <Video size={20} />;
            case 'link':
                return <LinkIcon size={20} />;
            default:
                return <Book size={20} />;
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'document':
                return '#3742fa';
            case 'video':
                return '#e74c3c';
            case 'link':
                return '#2ecc71';
            default:
                return '#9b59b6';
        }
    };

    const subjects = ['all', ...new Set(materials.map((m) => m.subject))];

    return (
        <div className="container revision-materials-page">
            <div className="materials-header">
                <h1>Revision Materials</h1>
                <p className="text-muted">Access curated study resources and past papers.</p>
            </div>

            {/* Filter Bar */}
            <div className="filter-bar">
                {subjects.map((subject) => (
                    <button
                        key={subject}
                        onClick={() => setFilter(subject)}
                        className={`filter-btn ${filter === subject ? 'active' : ''}`}
                    >
                        {subject === 'all' ? 'All Subjects' : subject}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="loader-container">
                    <Loader className="animate-spin" size={48} color="rgb(var(--primary))" />
                </div>
            ) : filteredMaterials.length === 0 ? (
                <div className="empty-state card">
                    <Book size={48} color="rgba(var(--primary), 0.3)" />
                    <h3>No materials found</h3>
                    <p>Try selecting a different filter or subject.</p>
                </div>
            ) : (
                <div className="materials-grid">
                    {filteredMaterials.map((material) => (
                        <div
                            key={material.id}
                            className="card material-card"
                        >
                            <div
                                className="type-icon-box"
                                style={{ backgroundColor: getTypeColor(material.type) }}
                            >
                                {getTypeIcon(material.type)}
                            </div>
                            <div className="material-info">
                                <span className="material-subject">{material.subject}</span>
                                <h3>{material.title}</h3>
                                <p className="material-desc">
                                    {material.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default RevisionMaterialsPage;
