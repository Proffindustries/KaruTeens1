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
    Grid,
    List,
    ShieldAlert,
    Search as SearchIcon,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../hooks/useAuth';
import TimetableGrid from '../components/Timetable/TimetableGrid';
import AttendanceCheckIn from '../components/Timetable/AttendanceCheckIn';
import ExamModeView from '../components/Timetable/ExamModeView';
import LibrarySearch from '../components/Timetable/LibrarySearch';
import '../styles/TimetablePage.css';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const TimetablePage = () => {
    const { showToast } = useToast();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [timetables, setTimetables] = useState([]);
    const [selectedTimetable, setSelectedTimetable] = useState(null);
    const [selectedDay, setSelectedDay] = useState('Monday');
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState('list'); // list, grid, exam, library

    const [showAddModal, setShowAddModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAttendanceModal, setShowAttendanceModal] = useState(false);
    const [activeClass, setActiveClass] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form states
    const [newTimetableName, setNewTimetableName] = useState('');
    const [isTemplate, setIsTemplate] = useState(false);
    const [isPublic, setIsPublic] = useState(false);
    const [newClass, setNewClass] = useState({
        title: '',
        course_code: '',
        day: 'Monday',
        start_time: '08:00',
        end_time: '10:00',
        room: '',
        professor: '',
        is_exam: false,
        date: '',
    });

    const fetchTimetables = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data } = await api.get('/timetable');
            setTimetables(Array.isArray(data) ? data : []);
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
                is_public: isPublic,
                classes: [],
            });
            showToast('Timetable created!', 'success');
            await fetchTimetables();
            setShowCreateModal(false);
            setNewTimetableName('');
            setIsPublic(false);
        } catch (error) {
            showToast('Failed to create timetable', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLogAttendance = async (status, notes) => {
        if (!activeClass || !selectedTimetable) return;
        try {
            await api.post('/timetable/attendance', {
                timetable_id: selectedTimetable._id,
                class_id: activeClass.id,
                date: new Date().toISOString().split('T')[0],
                status,
                notes,
            });
            showToast('Attendance logged!', 'success');
            setShowAttendanceModal(false);
        } catch (error) {
            showToast('Failed to log attendance', 'error');
        }
    };

    const handleReportIssue = async (classItem) => {
        const report_type = window.prompt(
            'What is wrong? (cancelled, room_changed, other)',
            'cancelled',
        );
        if (!report_type) return;

        try {
            await api.post('/timetable/report', {
                timetable_id: selectedTimetable._id,
                class_id: classItem.id,
                report_type,
            });
            showToast('Report submitted!', 'success');
            // Refresh to see update reliability score
            await fetchTimetables();
        } catch (error) {
            showToast('Failed to submit report', 'error');
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

    const handleDeleteTimetable = async (timetableId) => {
        if (!window.confirm('Are you sure you want to delete this timetable?')) return;

        setIsSubmitting(true);
        try {
            await api.delete(`/timetable/${timetableId}`);
            showToast('Timetable deleted!', 'success');
            await fetchTimetables();
            if (selectedTimetable?._id === timetableId) {
                setSelectedTimetable(null);
            }
        } catch (error) {
            showToast('Failed to delete timetable', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const today = days[new Date().getDay() - 1] || 'Monday';

    const getClassesForDay = (day) => {
        if (!selectedTimetable) return [];
        const classes = Array.isArray(selectedTimetable.classes) ? selectedTimetable.classes : [];
        return classes
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
                    {(Array.isArray(timetables) ? timetables : []).map((t) => (
                        <div
                            key={t._id}
                            className={`timetable-item-small ${selectedTimetable?._id === t._id ? 'active' : ''}`}
                            onClick={() => setSelectedTimetable(t)}
                        >
                            {t.is_template ? <Copy size={14} /> : <Calendar size={14} />}
                            <span>{t.name}</span>
                            <div
                                className="timetable-item-actions"
                                style={{ display: 'flex', gap: '4px' }}
                            >
                                {t.is_template ? (
                                    <button
                                        className="copy-btn-hint"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleCopyTemplate(t._id);
                                        }}
                                    >
                                        <Plus size={12} /> Use
                                    </button>
                                ) : (
                                    <button
                                        className="icon-btn danger btn-xs"
                                        style={{ padding: '2px', color: '#ff4757' }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteTimetable(t._id);
                                        }}
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                )}
                            </div>
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

            {/* View Mode Switcher */}
            <div className="view-mode-tabs">
                <button
                    className={`view-tab ${viewMode === 'list' ? 'active' : ''}`}
                    onClick={() => setViewMode('list')}
                >
                    <List size={18} /> List
                </button>
                <button
                    className={`view-tab ${viewMode === 'grid' ? 'active' : ''}`}
                    onClick={() => setViewMode('grid')}
                >
                    <Grid size={18} /> Grid
                </button>
                <button
                    className={`view-tab ${viewMode === 'exam' ? 'active' : ''}`}
                    onClick={() => setViewMode('exam')}
                >
                    <ShieldAlert size={18} /> Exam Mode
                </button>
                <button
                    className={`view-tab ${viewMode === 'library' ? 'active' : ''}`}
                    onClick={() => setViewMode('library')}
                >
                    <SearchIcon size={18} /> Library
                </button>
            </div>

            {viewMode === 'library' ? (
                <LibrarySearch onFork={handleCopyTemplate} />
            ) : viewMode === 'exam' ? (
                <ExamModeView exams={(selectedTimetable?.classes || []).filter((c) => c.is_exam)} />
            ) : viewMode === 'grid' ? (
                <TimetableGrid
                    classes={selectedTimetable?.classes || []}
                    onClassClick={(cls) => {
                        setActiveClass(cls);
                    }}
                    onAttendanceClick={(cls) => {
                        setActiveClass(cls);
                        setShowAttendanceModal(true);
                    }}
                    onReportClick={handleReportIssue}
                />
            ) : (
                <>
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
                                                className="icon-btn"
                                                title="Check-in"
                                                onClick={() => {
                                                    setActiveClass(cls);
                                                    setShowAttendanceModal(true);
                                                }}
                                            >
                                                <Check size={18} />
                                            </button>
                                            <button
                                                className="icon-btn warning"
                                                title="Report Issue"
                                                onClick={() => handleReportIssue(cls)}
                                            >
                                                <AlertCircle size={18} />
                                            </button>
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
                </>
            )}

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
                            <div className="form-group flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isPublic"
                                    checked={isPublic}
                                    onChange={(e) => setIsPublic(e.target.checked)}
                                />
                                <label htmlFor="isPublic">
                                    Make Public (Other students can find and use this)
                                </label>
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
                            <h3>Add to {selectedTimetable?.name}</h3>
                            <button className="icon-btn" onClick={() => setShowAddModal(false)}>
                                <X />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group flex items-center gap-2 mb-4">
                                <input
                                    type="checkbox"
                                    id="is_exam"
                                    checked={newClass.is_exam}
                                    onChange={(e) =>
                                        setNewClass({ ...newClass, is_exam: e.target.checked })
                                    }
                                />
                                <label htmlFor="is_exam">This is an Exam</label>
                            </div>
                            <div className="form-group">
                                <label>{newClass.is_exam ? 'Exam Title*' : 'Course Title*'}</label>
                                <input
                                    type="text"
                                    placeholder={
                                        newClass.is_exam
                                            ? 'e.g. Calculus II Final'
                                            : 'e.g. Calculus II'
                                    }
                                    value={newClass.title}
                                    onChange={(e) =>
                                        setNewClass({ ...newClass, title: e.target.value })
                                    }
                                />
                            </div>
                            {newClass.is_exam ? (
                                <div className="form-group">
                                    <label>Exam Date*</label>
                                    <input
                                        type="date"
                                        value={newClass.date}
                                        onChange={(e) =>
                                            setNewClass({ ...newClass, date: e.target.value })
                                        }
                                    />
                                </div>
                            ) : (
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
                            )}
                            <div className="form-row">
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

            {/* Attendance Modal */}
            {showAttendanceModal && activeClass && (
                <div className="modal-overlay" onClick={() => setShowAttendanceModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <AttendanceCheckIn
                            classItem={activeClass}
                            onLog={handleLogAttendance}
                            onCancel={() => setShowAttendanceModal(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default TimetablePage;
