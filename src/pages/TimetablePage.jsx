import { parseICS } from '../utils/icsParser';
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
    FileText,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../hooks/useAuth';
import TimetableGrid from '../components/Timetable/TimetableGrid';
import AttendanceCheckIn from '../components/Timetable/AttendanceCheckIn';
import ExamModeView from '../components/Timetable/ExamModeView';
import LibrarySearch from '../components/Timetable/LibrarySearch';
import ClassDetailsModal from '../components/Timetable/ClassDetailsModal';
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
    const [showClassDetailsModal, setShowClassDetailsModal] = useState(false);
    const [activeClass, setActiveClass] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [notifiedClasses, setNotifiedClasses] = useState(new Set());

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

    // Push Notifications / Class Alarms (Check every minute)
    useEffect(() => {
        if (!selectedTimetable) return;
        const interval = setInterval(() => {
            const now = new Date();
            const currentDayString = days[now.getDay() - 1] || 'Sunday';
            const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            
            const classes = Array.isArray(selectedTimetable.classes) ? selectedTimetable.classes : [];
            classes.forEach(cls => {
                if (cls.day === currentDayString) {
                    const [startH, startM] = cls.start_time.split(':').map(Number);
                    const classTimeParams = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startH, startM, 0).getTime();
                    const nowTimeParams = now.getTime();
                    
                    const diffMins = Math.round((classTimeParams - nowTimeParams) / 60000);
                    
                    // Alert 15 minutes before
                    if (diffMins === 15 && !notifiedClasses.has(cls.id)) {
                        showToast(`⏳ Up next: ${cls.title} in ${cls.room || 'TBA'} at ${cls.start_time}`, 'info');
                        
                        // Use native Notifications if permitted
                        if (Notification.permission === 'granted') {
                            new Notification(`Up Next: ${cls.title}`, {
                                body: `Starts in 15 mins at ${cls.start_time} - Room ${cls.room || 'TBA'}`,
                                icon: '/favicon.ico'
                            });
                        }
                        
                        setNotifiedClasses(prev => new Set(prev).add(cls.id));
                    }
                }
            });
        }, 60000); // run every minute
        
        // Request permission on mount
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }

        return () => clearInterval(interval);
    }, [selectedTimetable, notifiedClasses, showToast]);

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
            showToast('Timetable added to your collection!', 'success');
            await fetchTimetables();
        } catch (error) {
            showToast('Failed to copy timetable', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleMergeTemplate = async (templateId) => {
        const personalTimetables = timetables.filter(t => !t.is_template);
        if (personalTimetables.length === 0) {
            showToast('You don\'t have a personal timetable to merge into. Creating a new one instead.', 'info');
            return handleCopyTemplate(templateId);
        }

        // For simplicity, merge into the currently selected one if it's personal,
        // otherwise merge into the first personal one.
        const target = (!selectedTimetable || selectedTimetable.is_template) 
            ? personalTimetables[0] 
            : selectedTimetable;

        if (window.confirm(`Merge lessons from this template into "${target.name}"?`)) {
            setIsSubmitting(true);
            try {
                await api.post(`/timetable/${templateId}/merge/${target._id}`);
                showToast(`Lessons merged into ${target.name}!`, 'success');
                await fetchTimetables();
            } catch (error) {
                showToast('Failed to merge lessons', 'error');
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const handleCopyOrMerge = (templateId) => {
        const choice = window.confirm("Do you want to create a NEW timetable from this (OK) or MERGE its lessons into your current timetable (Cancel)?");
        if (choice) {
            handleCopyTemplate(templateId);
        } else {
            handleMergeTemplate(templateId);
        }
    };

    const handleAddClass = async () => {
        // If current is template, we can't add to it directly
        let targetId = selectedTimetable?._id;
        
        if (!selectedTimetable) {
            showToast('Please select or create a timetable first', 'error');
            return;
        }

        if (selectedTimetable.is_template) {
            // Find a personal one or ask to create
            const personal = timetables.find(t => !t.is_template);
            if (personal) {
                targetId = personal._id;
                showToast(`Adding to your personal timetable: ${personal.name}`, 'info');
            } else {
                showToast('Please create a personal timetable before adding lessons', 'error');
                setShowCreateModal(true);
                setShowAddModal(false);
                return;
            }
        }

        setIsSubmitting(true);
        try {
            await api.post(`/timetable/${targetId}/classes`, {
                ...newClass,
                id: Date.now().toString(),
            });
            showToast('Lesson added!', 'success');
            await fetchTimetables();
            setShowAddModal(false);
            setNewClass({
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
        } catch (e) {
            showToast('Failed to add lesson', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateClassLocal = (updatedClass) => {
        // Optimistic UI update for tasks
        const updatedTimetables = timetables.map(t => {
            if (t._id === selectedTimetable._id) {
                const updatedClasses = t.classes.map(c => c.id === updatedClass.id ? updatedClass : c);
                return { ...t, classes: updatedClasses };
            }
            return t;
        });
        setTimetables(updatedTimetables);
        setSelectedTimetable(updatedTimetables.find(t => t._id === selectedTimetable._id));
    };

    const handleDeleteClass = async (classId) => {
        if (!selectedTimetable) return;
        try {
            await api.delete(`/timetable/${selectedTimetable._id}/classes/${classId}`);
            showToast('Lesson removed', 'success');
            await fetchTimetables();
        } catch (e) {
            showToast('Failed to remove lesson', 'error');
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file || !selectedTimetable) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            const events = parseICS(event.target.result);
            for (const cls of events) {
                await api.post(`/timetable/${selectedTimetable._id}/classes`, cls);
            }
            await fetchTimetables();
            showToast('Timetable imported!', 'success');
        };
        reader.readAsText(file);
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

    const hasClash = React.useMemo(() => {
        if (!selectedTimetable || newClass.is_exam) return null;
        const dayClasses = getClassesForDay(newClass.day);
        
        const newStart = parseInt(newClass.start_time.replace(':', ''));
        const newEnd = parseInt(newClass.end_time.replace(':', ''));
        
        const clash = dayClasses.find(c => {
            const s = parseInt(c.start_time.replace(':', ''));
            const e = parseInt(c.end_time.replace(':', ''));
            // Overlaps if it starts before the existing class ends AND ends after the existing class starts
            return newStart < e && newEnd > s;
        });
        
        return clash;
    }, [selectedTimetable, newClass]);

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
                    <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                        <Plus size={18} /> Add Lesson
                    </button>
                    {selectedTimetable && !selectedTimetable.is_template && (
                        <>
                            <label className="btn btn-outline" style={{ cursor: 'pointer' }}>
                                <FileText size={18} /> Import ICS
                                <input
                                    type="file"
                                    accept=".ics"
                                    onChange={handleFileUpload}
                                    hidden
                                />
                            </label>
                        </>
                    )}
                </div>
            </div>
{/* Today Banner */}
            {selectedTimetable?.is_template && (
                <div className="template-warning">
                    <AlertCircle size={20} />
                    <p>
                        You are viewing a <strong>Template</strong>. To edit it, first click "Use"
                        to create your own copy.
                    </p>
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleCopyOrMerge(selectedTimetable._id)}
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
                <LibrarySearch onFork={handleCopyOrMerge} />
            ) : viewMode === 'exam' ? (
                <ExamModeView exams={(selectedTimetable?.classes || []).filter((c) => c.is_exam)} />
            ) : viewMode === 'grid' ? (
                <TimetableGrid
                    classes={selectedTimetable?.classes || []}
                    onClassClick={(cls) => {
                        setActiveClass(cls);
                        setShowClassDetailsModal(true);
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
                            currentDayClasses.map((cls) => {
                                const activeTasks = cls.tasks ? cls.tasks.filter(t => !t.completed).length : 0;
                                return (
                                <div key={cls.id} className="class-card" style={{ cursor: 'pointer' }} onClick={() => { setActiveClass(cls); setShowClassDetailsModal(true); }}>
                                    <div className="class-time">
                                        <Clock size={16} />
                                        <span>
                                            {cls.start_time} - {cls.end_time}
                                        </span>
                                    </div>
                                    <div className="class-info">
                                        <h3>{cls.title}</h3>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            {cls.course_code && (
                                                <span className="class-code">{cls.course_code}</span>
                                            )}
                                            {activeTasks > 0 && (
                                                <span className="badge warning" style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '10px' }}>
                                                    {activeTasks} tasks due
                                                </span>
                                            )}
                                        </div>
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
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveClass(cls);
                                                    setShowAttendanceModal(true);
                                                }}
                                            >
                                                <Check size={18} />
                                            </button>
                                            <button
                                                className="icon-btn warning"
                                                title="Report Issue"
                                                onClick={(e) => { e.stopPropagation(); handleReportIssue(cls); }}
                                            >
                                                <AlertCircle size={18} />
                                            </button>
                                            <button
                                                className="icon-btn danger"
                                                title="Delete"
                                                onClick={(e) => { e.stopPropagation(); handleDeleteClass(cls.id); }}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )})
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
                            
                            {hasClash && (
                                <div className="info-alert danger" style={{ background: 'rgba(var(--danger), 0.1)', color: 'rgb(var(--danger))', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <AlertCircle size={16} /> 
                                    <strong>Time Conflict:</strong> This overlaps with {hasClash.title} ({hasClash.start_time} - {hasClash.end_time}).
                                </div>
                            )}

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

            {/* Class Details / Tasks / Social Modal */}
            {showClassDetailsModal && activeClass && (
                <ClassDetailsModal
                    classItem={activeClass}
                    onClose={() => setShowClassDetailsModal(false)}
                    onUpdate={handleUpdateClassLocal}
                />
            )}
        </div>
    );
};

export default TimetablePage;
