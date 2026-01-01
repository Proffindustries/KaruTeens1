import React, { useState } from 'react';
import { Calendar, MapPin, Clock, Search, PlusCircle, Users, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import '../styles/GroupsPage.css';
import { useEvents, useCreateEvent } from '../hooks/useEvents';
import { useToast } from '../context/ToastContext';

const EventsPage = () => {
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const { data: events, isLoading } = useEvents({ category: categoryFilter, upcoming: true });
    const navigate = useNavigate();

    const categories = ['all', 'Academic', 'Social', 'Sports', 'Cultural', 'Career', 'Other'];

    return (
        <div className="container groups-page">
            <div className="page-header">
                <div className="header-text">
                    <h1>Campus Events</h1>
                    <p>Discover what's happening around you.</p>
                </div>
                <div className="header-action">
                    <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                        <PlusCircle size={18} /> Add Event
                    </button>
                </div>
            </div>

            {/* Category Filter */}
            <div className="categories-scroll" style={{ marginBottom: '1.5rem' }}>
                {categories.map(cat => (
                    <button
                        key={cat}
                        className={`cat-pill ${categoryFilter === cat ? 'active' : ''}`}
                        onClick={() => setCategoryFilter(cat)}
                    >
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div className="loading-state">
                    <Loader size={48} className="spin-anim" />
                    <p>Loading events...</p>
                </div>
            ) : (
                <div className="events-list">
                    {events && events.length > 0 ? (
                        events.map(event => (
                            <motion.div
                                key={event.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                className="card event-card-horiz"
                                onClick={() => navigate(`/events/${event.id}`)}
                                style={{ cursor: 'pointer' }}
                            >
                                <img
                                    src={event.image_url || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=600"}
                                    alt={event.title}
                                    className="event-img"
                                />
                                <div className="event-details">
                                    <div className="event-date-badge">
                                        <strong>{new Date(event.start_datetime).getDate()}</strong>
                                        <span>{new Date(event.start_datetime).toLocaleString('default', { month: 'short' })}</span>
                                    </div>
                                    <div className="event-info">
                                        <h3>{event.title}</h3>
                                        <div className="event-meta">
                                            <span><Clock size={14} /> {new Date(event.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            <span><MapPin size={14} /> {event.location}</span>
                                        </div>
                                        <div className="event-meta" style={{ marginTop: '0.5rem' }}>
                                            <span><Users size={14} /> {event.attendee_count} attending</span>
                                            <span className="category-badge">{event.category}</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <div className="empty-state">
                            <Calendar size={64} color="#ccc" />
                            <p>No upcoming events in this category</p>
                            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                                Create the First Event
                            </button>
                        </div>
                    )}
                </div>
            )}

            {showCreateModal && (
                <CreateEventModal
                    isOpen={showCreateModal}
                    onClose={() => setShowCreateModal(false)}
                />
            )}
        </div>
    );
};

const CreateEventModal = ({ isOpen, onClose }) => {
    const { mutate: createEvent, isPending } = useCreateEvent();
    const { showToast } = useToast();
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        location: '',
        start_datetime: '',
        end_datetime: '',
        category: 'Social',
        image_url: '',
        max_attendees: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();

        const eventData = {
            ...formData,
            start_datetime: new Date(formData.start_datetime).toISOString(),
            end_datetime: new Date(formData.end_datetime).toISOString(),
            max_attendees: formData.max_attendees ? parseInt(formData.max_attendees) : null
        };

        createEvent(eventData, {
            onSuccess: () => {
                showToast('Event created successfully!', 'success');
                onClose();
            },
            onError: (err) => {
                showToast(err.response?.data?.error || 'Failed to create event', 'error');
            }
        });
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                <div className="modal-header">
                    <h3>Create Campus Event</h3>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>
                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="form-group">
                        <label>Event Title</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="e.g. Freshers Night 2024"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Description</label>
                        <textarea
                            className="form-input"
                            rows="3"
                            placeholder="Tell students what this event is about..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label>Start Date & Time</label>
                            <input
                                type="datetime-local"
                                className="form-input"
                                value={formData.start_datetime}
                                onChange={(e) => setFormData({ ...formData, start_datetime: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>End Date & Time</label>
                            <input
                                type="datetime-local"
                                className="form-input"
                                value={formData.end_datetime}
                                onChange={(e) => setFormData({ ...formData, end_datetime: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Location</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="e.g. Main Hall, Student Center"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label>Category</label>
                            <select
                                className="form-select"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            >
                                <option>Social</option>
                                <option>Academic</option>
                                <option>Sports</option>
                                <option>Cultural</option>
                                <option>Career</option>
                                <option>Other</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Max Attendees (Optional)</label>
                            <input
                                type="number"
                                className="form-input"
                                placeholder="No limit"
                                value={formData.max_attendees}
                                onChange={(e) => setFormData({ ...formData, max_attendees: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Event Image URL (Optional)</label>
                        <input
                            type="url"
                            className="form-input"
                            placeholder="https://..."
                            value={formData.image_url}
                            onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                        />
                    </div>

                    <button type="submit" className="btn btn-primary btn-full" disabled={isPending}>
                        {isPending ? 'Creating...' : 'Create Event'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default EventsPage;
