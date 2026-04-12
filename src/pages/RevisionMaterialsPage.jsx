import React, { useState, useEffect } from 'react';
import MainLayout from '../layouts/MainLayout';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import { Book, FileText, Video, Link as LinkIcon, Loader } from 'lucide-react';
import AcademicFilters from '../components/AcademicFilters';
import '../styles/RevisionMaterialsPage.css';

const REVISION_CATEGORIES = ['CAT', 'Exam', 'Past Paper'];

const RevisionMaterialsPage = () => {
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
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
    }, []);

    const fetchMaterials = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filters.search) params.append('search', filters.search);
            if (filters.school !== 'all') params.append('school', filters.school);
            if (filters.programme !== 'all') params.append('programme', filters.programme);
            if (filters.year !== 'all') params.append('year', filters.year);
            if (filters.category !== 'all') params.append('category', filters.category);

            const { data } = await api.get(`/revision-materials?${params.toString()}`);
            const filteredData = data.filter(item => REVISION_CATEGORIES.includes(item.category) || (!item.category));
            setMaterials(filteredData);
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

    return (
        <div className="container revision-materials-page">
            <div className="materials-header">
                <h1>Revision Materials</h1>
                <p className="text-muted">Access curated study resources and past papers.</p>
            </div>

            <AcademicFilters
                filters={filters}
                setFilters={setFilters}
                categories={REVISION_CATEGORIES}
                onSearch={fetchMaterials}
            />

            {loading ? (
                <div className="loader-container">
                    <Loader className="animate-spin" size={48} color="rgb(var(--primary))" />
                </div>
            ) : materials.length === 0 ? (
                <div className="empty-state card">
                    <Book size={48} color="rgba(var(--primary), 0.3)" />
                    <h3>No materials found</h3>
                    <p>Try refining your search or filter criteria.</p>
                </div>
            ) : (
                <div className="materials-grid">
                    {materials.map((material) => (
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
