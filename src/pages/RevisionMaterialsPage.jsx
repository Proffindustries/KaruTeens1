import React, { useState, useEffect } from 'react';
import MainLayout from '../layouts/MainLayout';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import { Book, FileText, Video, Link as LinkIcon, Loader } from 'lucide-react';
import AcademicFilters from '../components/AcademicFilters';
import { MaterialSkeleton } from '../components/Skeleton';
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

    const fetchMaterials = React.useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filters.search) params.append('search', filters.search);
            if (filters.school !== 'all') params.append('school', filters.school);
            if (filters.programme !== 'all') params.append('programme', filters.programme);
            if (filters.year !== 'all') params.append('year', filters.year);
            if (filters.category !== 'all') params.append('category', filters.category);

            const { data } = await api.get(`/revision-materials?${params.toString()}`);
            const filteredData = data.filter(
                (item) => REVISION_CATEGORIES.includes(item.category) || !item.category,
            );
            setMaterials(filteredData);
        } catch (err) {
            console.log('Using local revision materials data');
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
    }, [filters]);

    useEffect(() => {
        fetchMaterials();
    }, [fetchMaterials]);

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
                <div className="materials-grid">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <MaterialSkeleton key={i} />
                    ))}
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
                        <div key={material.id} className="card material-card">
                            <div
                                className="type-icon-box"
                                style={{ backgroundColor: getTypeColor(material.type) }}
                            >
                                {getTypeIcon(material.type)}
                            </div>
                            <div className="material-info">
                                <span className="material-subject">{material.subject}</span>
                                <h3>{material.title}</h3>
                                <p className="material-desc">{material.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <section className="materials-faq card shadow-sm mt-12 p-8">
                <div className="section-title mb-6">
                    <h2 className="text-2xl font-bold">About Our Resources</h2>
                    <p className="text-muted">High-quality, peer-reviewed academic materials.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                    <div>
                        <h4 className="font-bold text-primary mb-2">
                            How are these materials curated?
                        </h4>
                        <p className="text-sm">
                            Our platform leverages a community-driven curation model. Materials are
                            uploaded by verified students and reviewed by student representatives
                            from respective departments to ensure accuracy and relevance to current
                            syllabi at Karatina University.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-bold text-secondary mb-2">
                            Can I contribute my own notes?
                        </h4>
                        <p className="text-sm">
                            Absolutely! KaruTeens thrives on peer cooperation. You can submit your
                            revision materials through the 'Contribute' button. Once reviewed, your
                            materials will be available to thousands of peers, and you'll earn
                            community points.
                        </p>
                    </div>
                </div>
                <div className="mt-8 pt-8 border-t border-gray-100 text-center">
                    <button className="btn btn-outline">Submit Your Materials</button>
                </div>
            </section>
        </div>
    );
};

export default RevisionMaterialsPage;
