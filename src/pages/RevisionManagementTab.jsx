import React, { useState, useEffect } from 'react';
import { FileText, Plus, Search, RefreshCw, Trash2, Edit, CheckSquare, Square } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import api from '../api/client';
import { SCHOOLS, YEARS } from '../data/academicData';

const CATEGORIES = ['CAT', 'Exam', 'Past Paper', 'Notes', 'Other Resources'];

const RevisionManagementTab = () => {
    const [materials, setMaterials] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [filters, setFilters] = useState({ search: '' });
    const { showToast } = useToast();

    const [formData, setFormData] = useState({
        title: '',
        course_code: '',
        category: CATEGORIES[0],
        material_type: 'document',
        school: SCHOOLS[0]?.id || '',
        programme: SCHOOLS[0]?.programmes[0] || '',
        year: 1,
        file_url: '',
        price: 0,
        is_locked: false,
    });

    const loadMaterials = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const { data } = await api.get('/revision-materials');
            setMaterials(data);
        } catch (error) {
            console.error('Failed to load materials:', error);
            showToast('Failed to load materials', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        loadMaterials();
    }, [loadMaterials]);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api.post('/revision-materials', {
                ...formData,
                year: Number(formData.year),
                price: Number(formData.price),
            });
            showToast('Material uploaded successfully!', 'success');
            setShowAddModal(false);
            loadMaterials();
        } catch (error) {
            showToast('Failed to upload material', 'error');
        }
    };

    return (
        <div className="revision-management-tab">
            <div
                className="tab-header"
                style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}
            >
                <div className="header-left">
                    <h2>Revision Materials Management</h2>
                    <p>Manage past papers, CATs, notes, and other learning resources.</p>
                </div>
                <div className="header-actions">
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowAddModal(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 1rem',
                            background: 'var(--primary-color)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                        }}
                    >
                        <Plus size={18} />
                        Add Material
                    </button>
                </div>
            </div>

            <div className="filters-section" style={{ marginBottom: '20px' }}>
                <div
                    className="search-box"
                    style={{
                        display: 'flex',
                        background: 'white',
                        padding: '0.5rem 1rem',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        alignItems: 'center',
                    }}
                >
                    <Search size={20} style={{ color: '#888', marginRight: '10px' }} />
                    <input
                        type="text"
                        placeholder="Search materials..."
                        value={filters.search}
                        onChange={(e) => setFilters({ search: e.target.value })}
                        style={{ border: 'none', outline: 'none', flex: 1 }}
                    />
                </div>
            </div>

            <div className="materials-table-container">
                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <RefreshCw className="spin" size={32} />
                        <p>Loading...</p>
                    </div>
                ) : (
                    <table
                        style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}
                    >
                        <thead>
                            <tr style={{ background: '#f5f6fa', borderBottom: '1px solid #eee' }}>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Title</th>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Course</th>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Category</th>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>School</th>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Price</th>
                                <th style={{ padding: '1rem', textAlign: 'center' }}>Locked</th>
                            </tr>
                        </thead>
                        <tbody>
                            {materials
                                .filter((m) =>
                                    m.title.toLowerCase().includes(filters.search.toLowerCase()),
                                )
                                .map((material) => (
                                    <tr
                                        key={material.id}
                                        style={{ borderBottom: '1px solid #eee' }}
                                    >
                                        <td style={{ padding: '1rem' }}>{material.title}</td>
                                        <td style={{ padding: '1rem' }}>{material.course_code}</td>
                                        <td style={{ padding: '1rem' }}>{material.category}</td>
                                        <td style={{ padding: '1rem' }}>{material.school}</td>
                                        <td style={{ padding: '1rem' }}>Ksh {material.price}</td>
                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                            {material.is_locked ? (
                                                <CheckSquare size={16} color="green" />
                                            ) : (
                                                <Square size={16} color="gray" />
                                            )}
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                )}
            </div>

            {showAddModal && (
                <div
                    className="modal-overlay"
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                    }}
                >
                    <div
                        className="modal-content"
                        style={{
                            background: 'white',
                            padding: '2rem',
                            borderRadius: '8px',
                            width: '90%',
                            maxWidth: '600px',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                        }}
                    >
                        <h3 style={{ marginBottom: '1.5rem' }}>Upload Revision Material</h3>
                        <form onSubmit={handleCreate}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                                    Title
                                </label>
                                <input
                                    required
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) =>
                                        setFormData({ ...formData, title: e.target.value })
                                    }
                                    style={{
                                        width: '100%',
                                        padding: '0.5rem',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                                        Course Code
                                    </label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.course_code}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                course_code: e.target.value,
                                            })
                                        }
                                        style={{
                                            width: '100%',
                                            padding: '0.5rem',
                                            border: '1px solid #ddd',
                                            borderRadius: '4px',
                                        }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                                        Category
                                    </label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) =>
                                            setFormData({ ...formData, category: e.target.value })
                                        }
                                        style={{
                                            width: '100%',
                                            padding: '0.5rem',
                                            border: '1px solid #ddd',
                                            borderRadius: '4px',
                                        }}
                                    >
                                        {CATEGORIES.map((c) => (
                                            <option key={c} value={c}>
                                                {c}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                                        School
                                    </label>
                                    <select
                                        value={formData.school}
                                        onChange={(e) => {
                                            const school = SCHOOLS.find(
                                                (s) => s.id === e.target.value,
                                            );
                                            setFormData({
                                                ...formData,
                                                school: e.target.value,
                                                programme: school?.programmes[0] || '',
                                            });
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '0.5rem',
                                            border: '1px solid #ddd',
                                            borderRadius: '4px',
                                        }}
                                    >
                                        {SCHOOLS.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.id}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                                        Programme
                                    </label>
                                    <select
                                        value={formData.programme}
                                        onChange={(e) =>
                                            setFormData({ ...formData, programme: e.target.value })
                                        }
                                        style={{
                                            width: '100%',
                                            padding: '0.5rem',
                                            border: '1px solid #ddd',
                                            borderRadius: '4px',
                                        }}
                                    >
                                        {(
                                            SCHOOLS.find((s) => s.id === formData.school)
                                                ?.programmes || []
                                        ).map((p) => (
                                            <option key={p} value={p}>
                                                {p}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                                        Year
                                    </label>
                                    <select
                                        value={formData.year}
                                        onChange={(e) =>
                                            setFormData({ ...formData, year: e.target.value })
                                        }
                                        style={{
                                            width: '100%',
                                            padding: '0.5rem',
                                            border: '1px solid #ddd',
                                            borderRadius: '4px',
                                        }}
                                    >
                                        {YEARS.map((y) => (
                                            <option key={y} value={y}>
                                                Year {y}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                                        File URL / Drive Link
                                    </label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.file_url}
                                        onChange={(e) =>
                                            setFormData({ ...formData, file_url: e.target.value })
                                        }
                                        style={{
                                            width: '100%',
                                            padding: '0.5rem',
                                            border: '1px solid #ddd',
                                            borderRadius: '4px',
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                                        Price (Ksh)
                                    </label>
                                    <input
                                        required
                                        type="number"
                                        min="0"
                                        value={formData.price}
                                        onChange={(e) =>
                                            setFormData({ ...formData, price: e.target.value })
                                        }
                                        style={{
                                            width: '100%',
                                            padding: '0.5rem',
                                            border: '1px solid #ddd',
                                            borderRadius: '4px',
                                        }}
                                    />
                                </div>
                                <div
                                    style={{
                                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'flex-end',
                                        paddingBottom: '0.5rem',
                                    }}
                                >
                                    <label
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={formData.is_locked}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    is_locked: e.target.checked,
                                                })
                                            }
                                        />
                                        Require Payment to Unlock
                                    </label>
                                </div>
                            </div>

                            <div
                                style={{
                                    marginTop: '2rem',
                                    display: 'flex',
                                    justifyContent: 'flex-end',
                                    gap: '1rem',
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        background: '#ccc',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        padding: '0.5rem 1rem',
                                        background: 'var(--primary-color)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Upload Resource
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RevisionManagementTab;
