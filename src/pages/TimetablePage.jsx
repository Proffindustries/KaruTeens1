import React, { useState, useEffect } from 'react';
import { Calendar, Clock, BookOpen, MapPin, Plus, Bell, Edit2, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import '../styles/TimetablePage.css';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const TimetablePage = () => {
    const [timetable, setTimetable] = useState({});
    const [selectedDay, setSelectedDay] = useState('Monday');
    const [showAddModal, setShowAddModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch timetable data from API
    useEffect(() => {
        const fetchTimetable = async () => {
            setIsLoading(true);
            try {
                const { data } = await api.get('/timetable');
                setTimetable(data);
            } catch (error) {
                console.error('Failed to load timetable:', error);
                // Keep empty state, UI will show no classes
            } finally {
                setIsLoading(false);
            }
        };

        fetchTimetable();
    }, []);

    const today = days[new Date().getDay() - 1] || 'Monday';
    const currentClass = timetable[selectedDay]?.[0]; // Just for demo

    return (
        <div className="container timetable-page">
            <div className="timetable-header">
                <div>
                    <h1>
                        <Calendar size={32} /> My Timetable
                    </h1>
                    <p>Your weekly class schedule</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                    <Plus size={18} /> Add Class
                </button>
            </div>

            {/* Today Banner */}
            <div className="today-banner">
                <div className="today-info">
                    <span className="today-label">Today</span>
                    <h2>{today}</h2>
                    {currentClass && (
                        <p>
                            Next class: <strong>{currentClass.name}</strong> at {currentClass.time}
                        </p>
                    )}
                </div>
                <div className="today-actions">
                    <Link to="/study-rooms" className="btn btn-outline">
                        <Bell size={18} /> Set Reminder
                    </Link>
                </div>
            </div>

            {/* Day Tabs */}
            <div className="day-tabs">
                {days.map((day) => (
                    <button
                        key={day}
                        className={`day-tab ${selectedDay === day ? 'active' : ''} ${day === today ? 'today' : ''}`}
                        onClick={() => setSelectedDay(day)}
                    >
                        <span className="day-name">{day.slice(0, 3)}</span>
                        <span className="day-classes">{(timetable[day] || []).length} classes</span>
                    </button>
                ))}
            </div>

            {/* Classes List */}
            <div className="classes-list">
                {(timetable[selectedDay] || []).length === 0 ? (
                    <div className="empty-day">
                        <BookOpen size={48} />
                        <p>No classes scheduled</p>
                        <button className="btn btn-outline" onClick={() => setShowAddModal(true)}>
                            Add a class
                        </button>
                    </div>
                ) : (
                    (timetable[selectedDay] || []).map((cls, idx) => (
                        <div key={cls.id} className="class-card">
                            <div className="class-time">
                                <Clock size={16} />
                                <span>{cls.time}</span>
                            </div>
                            <div className="class-info">
                                <h3>{cls.name}</h3>
                                <span className="class-code">{cls.code}</span>
                                <div className="class-details">
                                    <span>
                                        <MapPin size={14} /> {cls.room}
                                    </span>
                                    <span>👨‍🏫 {cls.professor}</span>
                                </div>
                            </div>
                            <div className="class-actions">
                                <button className="icon-btn" title="Set reminder">
                                    <Bell size={18} />
                                </button>
                                <button className="icon-btn" title="Edit">
                                    <Edit2 size={18} />
                                </button>
                                <button className="icon-btn danger" title="Delete">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add Class Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal add-class-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Add New Class</h3>
                            <button className="icon-btn" onClick={() => setShowAddModal(false)}>
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Course Name</label>
                                <input type="text" placeholder="e.g. Calculus II" />
                            </div>
                            <div className="form-group">
                                <label>Course Code</label>
                                <input type="text" placeholder="e.g. MATH102" />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Day</label>
                                    <select>
                                        {days.map((d) => (
                                            <option key={d} value={d}>
                                                {d}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Time</label>
                                    <input type="text" placeholder="8:00 - 10:00" />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Room</label>
                                    <input type="text" placeholder="e.g. A101" />
                                </div>
                                <div className="form-group">
                                    <label>Professor</label>
                                    <input type="text" placeholder="Dr. Name" />
                                </div>
                            </div>
                            <button className="btn btn-primary btn-block">
                                <Plus size={18} /> Add Class
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TimetablePage;
