import React, { useState, useEffect, useCallback } from 'react';
import {
    Calendar,
    Clock,
    BookOpen,
    MapPin,
    Plus,
    Bell,
    Edit2,
    Trash2,
    Copy,
    Layout,
    Check,
    X,
    Loader,
    AlertCircle,
    Save,
    ArrowRight,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../hooks/useAuth';
import '../styles/TimetablePage.css';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const TimetablePage = () => {
    const { showToast } = useToast();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [timetables, setTimetables] = useState([]);
    const [selectedTimetable, setSelectedTimetable] = useState(null);
    const [selectedDay, setSelectedDay] = useState('Monday');
    const [isLoading, setIsLoading] = useState(true);

    const [showAddModal, setShowAddModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form states
    const [newTimetableName, setNewTimetableName] = useState('');
    const [isTemplate, setIsTemplate] = useState(false);
    const [newClass, setNewClass] = useState({
        title: '',
        course_code: '',
        day: 'Monday',
        start_time: '08:00',
        end_time: '10:00',
        room: '',
        professor: '',
    });

    const fetchTimetables = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data } = await api.get('/timetable');
            setTimetables(data);
            if (data.length > 0) {
                // Prefer personal timetable over template if available
                const personal = data.find((t) => !t.is_template);
                setSelectedTimetable(personal || data[0]);
            }
        } catch (error) {
            showToast('Failed to load timetables', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchTimetables();
    }, [fetchTimetables]);

    const handleCreateTimetable = async () => {
        if (!newTimetableName.trim()) {
            showToast('Please enter a name', 'error');
            return;
        }
        setIsSubmitting(true);
        try {
            const { data } = await api.post('/timetable', {
                name: newTimetableName,
                is_template: isTemplate,
                classes: [],
            });
            showToast('Timetable created!', 'success');
            await fetchTimetables();
            setShowCreateModal(false);
            setNewTimetableName('');
        } catch (error) {
            showToast('Failed to create timetable', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCopyTemplate = async (templateId) => {
        setIsSubmitting(true);
        try {
            const { data } = await api.post(`/timetable/${templateId}/copy`);
            showToast('Template copied to your timetables!', 'success');
            await fetchTimetables();
        } catch (error) {
            showToast('Failed to copy template', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddClass = async () => {
        if (!newClass.title || !newClass.start_time) {
            showToast('Please fill required fields', 'error');
            return;
        }
        if (!selectedTimetable) return;

        setIsSubmitting(true);
        const updatedClasses = [
            ...(selectedTimetable.classes || []),
            { ...newClass, id: Math.random().toString(36).substr(2, 9) },
        ];

        try {
            await api.put(`/timetable/${selectedTimetable._id}`, {
                classes: updatedClasses,
            });
            showToast('Class added!', 'success');
            setSelectedTimetable({ ...selectedTimetable, classes: updatedClasses });
            setShowAddModal(false);
            setNewClass({
                title: '',
                course_code: '',
                day: 'Monday',
                start_time: '08:00',
                end_time: '10:00',
                room: '',
                professor: '',
            });
        } catch (error) {
            showToast('Failed to add class', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteClass = async (classId) => {
        if (!selectedTimetable) return;
        const updatedClasses = selectedTimetable.classes.filter((c) => c.id !== classId);
        try {
            await api.put(`/timetable/${selectedTimetable._id}`, {
                classes: updatedClasses,
            });
            setSelectedTimetable({ ...selectedTimetable, classes: updatedClasses });
            showToast('Class removed', 'success');
        } catch (error) {
            showToast('Failed to remove class', 'error');
        }
    };

    const today = days[new Date().getDay() - 1] || 'Monday';

    const getClassesForDay = (day) => {
        if (!selectedTimetable) return [];
        return (selectedTimetable.classes || [])
            .filter((c) => c.day === day)
            .sort((a, b) => a.start_time.localeCompare(b.start_time));
    };

    const currentDayClasses = getClassesForDay(selectedDay);

    if (isLoading)
        return (
            <div className="container flex-center" style={{ minHeight: '60vh' }}>
                <Loader size={48} className="spin-anim" />
            </div>
        );

    return (
        <div className="container timetable-page">
            <div className="timetable-header">
                <div>
                    <h1>
                        <Calendar size={32} /> My Timetable
                    </h1>
                    <p>Manage your weekly academic schedule</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn btn-outline" onClick={() => setShowCreateModal(true)}>
                        <Layout size={18} /> New Timetable
                    </button>
                    {selectedTimetable && !selectedTimetable.is_template && (
                        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                            <Plus size={18} /> Add Class
                        </button>
                    )}
                </div>
            </div>

            {/* Timetable Selector / Template Copy Section */}
            <div className="timetables-bar">
                <h3>Select Timetable:</h3>
                <div className="timetables-list-horizontal">
                    {timetables.map((t) => (
                        <div
                            key={t._id}
                            className={`timetable-item-small ${selectedTimetable?._id === t._id ? 'active' : ''}`}
                            onClick={() => setSelectedTimetable(t)}
                        >
                            {t.is_template ? <Copy size={14} /> : <Calendar size={14} />}
                            <span>{t.name}</span>
                            {t.is_template && (
                                <button
                                    className="copy-btn-hint"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopyTemplate(t._id);
                                    }}
                                >
                                    <Plus size={12} /> Use
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {selectedTimetable?.is_template && (
                <div className="template-warning">
                    <AlertCircle size={20} />
                    <p>
                        You are viewing a <strong>Template</strong>. To edit it, first click "Use"
                        to create your own copy.
                    </p>
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleCopyTemplate(selectedTimetable._id)}
                    >
                        Copy to My Timetables
                    </button>
                </div>
            )}

            {/* Today Banner */}
            <div className="today-banner">
                <div className="today-info">
                    <span className="today-label">Status</span>
                    <h2>{selectedTimetable?.name || 'No Timetable Selected'}</h2>
                    {selectedTimetable && (
                        <p>{selectedTimetable.classes?.length || 0} total classes scheduled</p>
                    )}
                </div>
                <div className="today-actions">
                    <Link to="/study-rooms" className="btn btn-outline">
                        <ArrowRight size={18} /> Study Rooms
                    </Link>
                </div>
            </div>

            {/* Day Tabs */}
            <div className="day-tabs">
                {days.map((day) => {
                    const count = getClassesForDay(day).length;
                    return (
                        <button
                            key={day}
                            className={`day-tab ${selectedDay === day ? 'active' : ''} ${day === today ? 'today' : ''}`}
                            onClick={() => setSelectedDay(day)}
                        >
                            <span className="day-name">{day.slice(0, 3)}</span>
                            <span className="day-classes">
                                {count} {count === 1 ? 'class' : 'classes'}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Classes List */}
            <div className="classes-list">
                {currentDayClasses.length === 0 ? (
                    <div className="empty-day">
                        <BookOpen size={48} />
                        <p>No classes scheduled for {selectedDay}</p>
                        {selectedTimetable && !selectedTimetable.is_template && (
                            <button
                                className="btn btn-outline"
                                onClick={() => setShowAddModal(true)}
                            >
                                Add a class
                            </button>
                        )}
                    </div>
                ) : (
                    currentDayClasses.map((cls) => (
                        <div key={cls.id} className="class-card">
                            <div className="class-time">
                                <Clock size={16} />
                                <span>
                                    {cls.start_time} - {cls.end_time}
                                </span>
                            </div>
                            <div className="class-info">
                                <h3>{cls.title}</h3>
                                {cls.course_code && (
                                    <span className="class-code">{cls.course_code}</span>
                                )}
                                <div className="class-details">
                                    {cls.room && (
                                        <span>
                                            <MapPin size={14} /> {cls.room}
                                        </span>
                                    )}
                                    {cls.professor && <span>👨‍🏫 {cls.professor}</span>}
                                </div>
                            </div>
                            {!selectedTimetable.is_template && (
                                <div className="class-actions">
                                    <button
                                        className="icon-btn danger"
                                        title="Delete"
                                        onClick={() => handleDeleteClass(cls.id)}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Create Timetable Modal */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal add-class-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Create New Timetable</h3>
                            <button className="icon-btn" onClick={() => setShowCreateModal(false)}>
                                <X />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Timetable Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Semester 2 Schedule"
                                    value={newTimetableName}
                                    onChange={(e) => setNewTimetableName(e.target.value)}
                                />
                            </div>
                            {user?.role === 'admin' && (
                                <div className="form-group flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="isTemplate"
                                        checked={isTemplate}
                                        onChange={(e) => setIsTemplate(e.target.checked)}
                                    />
                                    <label htmlFor="isTemplate">
                                        Save as Template (Admin only)
                                    </label>
                                </div>
                            )}
                            <button
                                className="btn btn-primary btn-block"
                                onClick={handleCreateTimetable}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <Loader className="spin-anim" />
                                ) : (
                                    'Create Timetable'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Class Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal add-class-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Add Class to {selectedTimetable?.name}</h3>
                            <button className="icon-btn" onClick={() => setShowAddModal(false)}>
                                <X />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Course Title*</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Calculus II"
                                    value={newClass.title}
                                    onChange={(e) =>
                                        setNewClass({ ...newClass, title: e.target.value })
                                    }
                                />
                            </div>
                            <div className="form-group">
                                <label>Course Code</label>
                                <input
                                    type="text"
                                    placeholder="e.g. MATH102"
                                    value={newClass.course_code}
                                    onChange={(e) =>
                                        setNewClass({ ...newClass, course_code: e.target.value })
                                    }
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Day</label>
                                    <select
                                        value={newClass.day}
                                        onChange={(e) =>
                                            setNewClass({ ...newClass, day: e.target.value })
                                        }
                                    >
                                        {days.map((d) => (
                                            <option key={d} value={d}>
                                                {d}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Start Time</label>
                                    <input
                                        type="time"
                                        value={newClass.start_time}
                                        onChange={(e) =>
                                            setNewClass({ ...newClass, start_time: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="form-group">
                                    <label>End Time</label>
                                    <input
                                        type="time"
                                        value={newClass.end_time}
                                        onChange={(e) =>
                                            setNewClass({ ...newClass, end_time: e.target.value })
                                        }
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Room</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. A101"
                                        value={newClass.room}
                                        onChange={(e) =>
                                            setNewClass({ ...newClass, room: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Professor</label>
                                    <input
                                        type="text"
                                        placeholder="Dr. Name"
                                        value={newClass.professor}
                                        onChange={(e) =>
                                            setNewClass({ ...newClass, professor: e.target.value })
                                        }
                                    />
                                </div>
                            </div>
                            <button
                                className="btn btn-primary btn-block"
                                onClick={handleAddClass}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <Loader className="spin-anim" />
                                ) : (
                                    <>
                                        <Plus size={18} /> Add to Timetable
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TimetablePage;
