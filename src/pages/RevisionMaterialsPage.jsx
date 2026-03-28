import React, { useState, useEffect } from 'react';
import MainLayout from '../layouts/MainLayout';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import { Book, FileText, Video, Link as LinkIcon, Loader } from 'lucide-react';

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
            const { data } = await api.get('/api/revision-materials');
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
        <MainLayout>
            <div className="p-6 max-w-6xl mx-auto">
                <h1 className="text-2xl font-bold mb-6">Revision Materials</h1>

                {/* Filter Bar */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {subjects.map((subject) => (
                        <button
                            key={subject}
                            onClick={() => setFilter(subject)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                                filter === subject
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            {subject === 'all' ? 'All Subjects' : subject}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex justify-center items-center py-12">
                        <Loader className="animate-spin" size={48} />
                    </div>
                ) : filteredMaterials.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <Book size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No revision materials found</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredMaterials.map((material) => (
                            <div
                                key={material.id}
                                className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow cursor-pointer"
                            >
                                <div className="flex items-start gap-3">
                                    <div
                                        className="p-2 rounded-lg text-white flex-shrink-0"
                                        style={{ backgroundColor: getTypeColor(material.type) }}
                                    >
                                        {getTypeIcon(material.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-gray-900 truncate">
                                            {material.title}
                                        </h3>
                                        <p className="text-sm text-gray-500 mb-2">
                                            {material.subject}
                                        </p>
                                        <p className="text-sm text-gray-600 line-clamp-2">
                                            {material.description}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </MainLayout>
    );
};

export default RevisionMaterialsPage;
