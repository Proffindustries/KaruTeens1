import React, { useState, useEffect, useMemo } from 'react';
import {
    Calendar,
    Plus,
    Edit,
    Trash2,
    Eye,
    EyeOff,
    Download,
    Upload,
    RefreshCw,
    Search,
    Filter,
    Clock,
    MapPin,
    Users,
    UserCheck,
    UserPlus,
    UserMinus,
    CheckCircle,
    XCircle,
    TrendingUp,
    BarChart3,
    FileSpreadsheet,
    ExternalLink,
    Copy,
    Share2,
    Tag,
    Globe,
    Video,
    Building,
    DollarSign,
    Star,
    AlertTriangle,
    MessageSquare,
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    Repeat,
    Zap,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

const EventManagementTab = () => {
    const [events, setEvents] = useState([]);
    const [filters, setFilters] = useState({
        status: 'all',
        category: 'all',
        location_type: 'all',
        event_type: 'all',
        search: '',
        sortBy: 'start_datetime',
        sortOrder: 'asc',
    });

    const [selectedEvents, setSelectedEvents] = useState([]);
    const [bulkAction, setBulkAction] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showCalendarView, setShowCalendarView] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const { showToast } = useToast();

    // Fetch events from API
    useEffect(() => {
        let isMounted = true;

        const loadEvents = async () => {
            setIsLoading(true);
            try {
                const { data } = await api.get('/events');
                if (isMounted) {
                    setEvents(data);
                }
            } catch (error) {
                console.error('Failed to load events:', error);
                if (isMounted) {
                    showToast('Failed to load events. Please try again later.', 'error');
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        loadEvents();

        return () => {
            isMounted = false;
        };
    }, []);

    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const handleBulkAction = () => {
        if (selectedEvents.length === 0) {
            showToast('Please select events first', 'warning');
            return;
        }

        if (bulkAction === 'publish') {
            setEvents((prev) =>
                prev.map((e) =>
                    selectedEvents.includes(e.id) ? { ...e, status: 'published' } : e,
                ),
            );
            setSelectedEvents([]);
            setBulkAction('');
            showToast('Events published', 'success');
        } else if (bulkAction === 'cancel') {
            setEvents((prev) =>
                prev.map((e) =>
                    selectedEvents.includes(e.id) ? { ...e, status: 'cancelled' } : e,
                ),
            );
            setSelectedEvents([]);
            setBulkAction('');
            showToast('Events cancelled', 'info');
        } else if (bulkAction === 'make_public') {
            setEvents((prev) =>
                prev.map((e) =>
                    selectedEvents.includes(e.id) ? { ...e, event_type: 'public' } : e,
                ),
            );
            setSelectedEvents([]);
            setBulkAction('');
            showToast('Events made public', 'success');
        } else if (bulkAction === 'make_private') {
            setEvents((prev) =>
                prev.map((e) =>
                    selectedEvents.includes(e.id) ? { ...e, event_type: 'private' } : e,
                ),
            );
            setSelectedEvents([]);
            setBulkAction('');
            showToast('Events made private', 'success');
        } else if (bulkAction === 'delete') {
            if (confirm(`Delete ${selectedEvents.length} events? This action cannot be undone.`)) {
                setEvents((prev) => prev.filter((e) => !selectedEvents.includes(e.id)));
                setSelectedEvents([]);
                setBulkAction('');
                showToast('Events deleted', 'success');
            }
        }
    };

    const handlePublishEvent = (eventId) => {
        setEvents((prev) =>
            prev.map((e) => (e.id === eventId ? { ...e, status: 'published' } : e)),
        );
        showToast('Event published', 'success');
    };

    const handleCancelEvent = (eventId) => {
        setEvents((prev) =>
            prev.map((e) => (e.id === eventId ? { ...e, status: 'cancelled' } : e)),
        );
        showToast('Event cancelled', 'info');
    };

    const handleDeleteEvent = (eventId) => {
        if (confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
            setEvents((prev) => prev.filter((e) => e.id !== eventId));
            showToast('Event deleted', 'success');
        }
    };

    const toggleEventSelection = (eventId) => {
        setSelectedEvents((prev) =>
            prev.includes(eventId) ? prev.filter((id) => id !== eventId) : [...prev, eventId],
        );
    };

    const selectAllEvents = () => {
        if (selectedEvents.length === events.length) {
            setSelectedEvents([]);
        } else {
            setSelectedEvents(events.map((e) => e.id));
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'published':
                return { color: 'green', text: 'Published', icon: <CheckCircle size={14} /> };
            case 'draft':
                return { color: 'orange', text: 'Draft', icon: <Clock size={14} /> };
            case 'cancelled':
                return { color: 'red', text: 'Cancelled', icon: <XCircle size={14} /> };
            case 'completed':
                return { color: 'blue', text: 'Completed', icon: <TrendingUp size={14} /> };
            default:
                return { color: 'gray', text: status, icon: <AlertTriangle size={14} /> };
        }
    };

    const getLocationTypeBadge = (locationType) => {
        switch (locationType) {
            case 'physical':
                return { color: 'blue', text: 'Physical', icon: <Building size={14} /> };
            case 'virtual':
                return { color: 'purple', text: 'Virtual', icon: <Video size={14} /> };
            case 'hybrid':
                return { color: 'green', text: 'Hybrid', icon: <Globe size={14} /> };
            default:
                return { color: 'gray', text: locationType, icon: <AlertTriangle size={14} /> };
        }
    };

    const getEventTypeBadge = (eventType) => {
        switch (eventType) {
            case 'public':
                return { color: 'blue', text: 'Public', icon: <Globe size={14} /> };
            case 'private':
                return { color: 'purple', text: 'Private', icon: <EyeOff size={14} /> };
            case 'invite_only':
                return { color: 'orange', text: 'Invite Only', icon: <UserPlus size={14} /> };
            default:
                return { color: 'gray', text: eventType, icon: <AlertTriangle size={14} /> };
        }
    };

    const getDaysUntilEvent = (startDate) => {
        const now = new Date();
        const eventDate = new Date(startDate);
        const diffTime = eventDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const formatCurrency = (amount, currency) => {
        if (amount === 0) return 'Free';
        return `${currency || 'KES'} ${amount.toLocaleString()}`;
    };

    return (
        <div className="event-management-tab">
            {/* Header */}
            <div className="tab-header">
                <div className="header-left">
                    <h2>Event Management</h2>
                    <p>Manage events, registrations, and attendance tracking</p>
                </div>
                <div className="header-actions">
                    <button
                        className={`btn-secondary ${showCalendarView ? 'active' : ''}`}
                        onClick={() => setShowCalendarView(!showCalendarView)}
                    >
                        <CalendarIcon size={18} />
                        {showCalendarView ? 'List View' : 'Calendar View'}
                    </button>
                    <button className="btn-secondary">
                        <Upload size={18} />
                        Import Events
                    </button>
                    <button className="btn-primary">
                        <Download size={18} />
                        Export Events
                    </button>
                    <button className="btn-primary" onClick={() => setShowAddModal(true)}>
                        <Plus size={18} />
                        Add Event
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="filters-section">
                <div className="search-filters">
                    <div className="search-box">
                        <Search size={20} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search events by title, description, or location..."
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                        />
                    </div>

                    <div className="filter-group">
                        <select
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                        >
                            <option value="all">All Status</option>
                            <option value="published">Published</option>
                            <option value="draft">Draft</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="completed">Completed</option>
                        </select>

                        <select
                            value={filters.location_type}
                            onChange={(e) => handleFilterChange('location_type', e.target.value)}
                        >
                            <option value="all">All Locations</option>
                            <option value="physical">Physical</option>
                            <option value="virtual">Virtual</option>
                            <option value="hybrid">Hybrid</option>
                        </select>

                        <select
                            value={filters.event_type}
                            onChange={(e) => handleFilterChange('event_type', e.target.value)}
                        >
                            <option value="all">All Types</option>
                            <option value="public">Public</option>
                            <option value="private">Private</option>
                            <option value="invite_only">Invite Only</option>
                        </select>

                        <select
                            value={filters.category}
                            onChange={(e) => handleFilterChange('category', e.target.value)}
                        >
                            <option value="all">All Categories</option>
                            <option value="Technology">Technology</option>
                            <option value="Education">Education</option>
                            <option value="Business">Business</option>
                            <option value="Corporate">Corporate</option>
                        </select>
                    </div>
                </div>

                <div className="filter-actions">
                    <button className="refresh-btn" onClick={() => {}}>
                        <RefreshCw size={18} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Bulk Actions */}
            {selectedEvents.length > 0 && (
                <div className="bulk-actions">
                    <div className="selection-info">{selectedEvents.length} events selected</div>
                    <div className="bulk-actions-controls">
                        <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)}>
                            <option value="">Bulk Actions</option>
                            <option value="publish">Publish</option>
                            <option value="cancel">Cancel</option>
                            <option value="make_public">Make Public</option>
                            <option value="make_private">Make Private</option>
                            <option value="delete">Delete Events</option>
                        </select>
                        <button
                            className="btn-primary"
                            onClick={handleBulkAction}
                            disabled={!bulkAction}
                        >
                            Apply Action
                        </button>
                    </div>
                </div>
            )}

            {/* Calendar View */}
            {showCalendarView && (
                <div className="calendar-view">
                    <div className="calendar-header">
                        <button
                            className="calendar-nav"
                            onClick={() =>
                                setCurrentMonth(
                                    new Date(
                                        currentMonth.getFullYear(),
                                        currentMonth.getMonth() - 1,
                                    ),
                                )
                            }
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <h3>
                            {currentMonth.toLocaleDateString('en-US', {
                                month: 'long',
                                year: 'numeric',
                            })}
                        </h3>
                        <button
                            className="calendar-nav"
                            onClick={() =>
                                setCurrentMonth(
                                    new Date(
                                        currentMonth.getFullYear(),
                                        currentMonth.getMonth() + 1,
                                    ),
                                )
                            }
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                    <div className="calendar-grid">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                            <div key={day} className="calendar-day-header">
                                {day}
                            </div>
                        ))}
                        {/* Calendar days would be rendered here */}
                        <div className="calendar-placeholder">
                            <CalendarIcon size={48} />
                            <p>Calendar view would display events in a monthly grid</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Events Table */}
            <div className="events-table-container">
                {isLoading ? (
                    <div className="loading-state">
                        <RefreshCw size={32} className="spin-anim" />
                        <p>Loading events...</p>
                    </div>
                ) : (
                    <>
                        <div className="table-header">
                            <div className="select-all">
                                <input
                                    type="checkbox"
                                    checked={
                                        selectedEvents.length === events.length && events.length > 0
                                    }
                                    onChange={selectAllEvents}
                                />
                                <span>Select All</span>
                            </div>
                            <div className="table-actions">
                                <span className="event-count">{events.length} events found</span>
                                <button className="refresh-btn" onClick={() => {}}>
                                    <RefreshCw size={18} />
                                    Refresh
                                </button>
                            </div>
                        </div>

                        <div className="table-responsive">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>
                                            <input
                                                type="checkbox"
                                                checked={
                                                    selectedEvents.length === events.length &&
                                                    events.length > 0
                                                }
                                                onChange={selectAllEvents}
                                            />
                                        </th>
                                        <th>Event Info</th>
                                        <th>Date & Time</th>
                                        <th>Location</th>
                                        <th>Registration</th>
                                        <th>Analytics</th>
                                        <th>Organizer</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {events.map((event) => (
                                        <tr
                                            key={event.id}
                                            className={
                                                event.status === 'cancelled'
                                                    ? 'cancelled-event'
                                                    : ''
                                            }
                                        >
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedEvents.includes(event.id)}
                                                    onChange={() => toggleEventSelection(event.id)}
                                                />
                                            </td>
                                            <td>
                                                <div className="event-info">
                                                    <div className="event-title">
                                                        <h4>{event.title}</h4>
                                                        {event.featured && (
                                                            <span className="featured-badge">
                                                                <Star size={12} />
                                                                Featured
                                                            </span>
                                                        )}
                                                        {event.is_recurring && (
                                                            <span className="recurring-badge">
                                                                <Repeat size={12} />
                                                                Recurring
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="event-desc">
                                                        {event.description}
                                                    </div>
                                                    <div className="event-meta">
                                                        <span className="category-badge">
                                                            {event.category}
                                                        </span>
                                                        {event.tags &&
                                                            event.tags.map((tag) => (
                                                                <span
                                                                    key={tag}
                                                                    className="tag-badge"
                                                                >
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="datetime-info">
                                                    <div className="date-row">
                                                        <Calendar size={14} />
                                                        <span>
                                                            {new Date(
                                                                event.start_datetime,
                                                            ).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <div className="time-row">
                                                        <Clock size={14} />
                                                        <span>
                                                            {new Date(
                                                                event.start_datetime,
                                                            ).toLocaleTimeString()}{' '}
                                                            -{' '}
                                                            {new Date(
                                                                event.end_datetime,
                                                            ).toLocaleTimeString()}
                                                        </span>
                                                    </div>
                                                    {event.status !== 'cancelled' && (
                                                        <div className="days-remaining">
                                                            {getDaysUntilEvent(
                                                                event.start_datetime,
                                                            ) > 0 ? (
                                                                <span className="days-soon">
                                                                    {getDaysUntilEvent(
                                                                        event.start_datetime,
                                                                    )}{' '}
                                                                    days remaining
                                                                </span>
                                                            ) : getDaysUntilEvent(
                                                                  event.start_datetime,
                                                              ) === 0 ? (
                                                                <span className="days-today">
                                                                    Today
                                                                </span>
                                                            ) : (
                                                                <span className="days-past">
                                                                    {Math.abs(
                                                                        getDaysUntilEvent(
                                                                            event.start_datetime,
                                                                        ),
                                                                    )}{' '}
                                                                    days ago
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="location-info">
                                                    <div className="location-type">
                                                        <span
                                                            className={`location-badge ${getLocationTypeBadge(event.location_type).color}`}
                                                        >
                                                            {
                                                                getLocationTypeBadge(
                                                                    event.location_type,
                                                                ).icon
                                                            }
                                                            {
                                                                getLocationTypeBadge(
                                                                    event.location_type,
                                                                ).text
                                                            }
                                                        </span>
                                                        <span
                                                            className={`event-type-badge ${getEventTypeBadge(event.event_type).color}`}
                                                        >
                                                            {
                                                                getEventTypeBadge(event.event_type)
                                                                    .icon
                                                            }
                                                            {
                                                                getEventTypeBadge(event.event_type)
                                                                    .text
                                                            }
                                                        </span>
                                                    </div>
                                                    <div className="location-name">
                                                        {event.location}
                                                    </div>
                                                    {event.venue_name && (
                                                        <div className="venue-name">
                                                            {event.venue_name}
                                                        </div>
                                                    )}
                                                    {event.virtual_meeting_url && (
                                                        <div className="virtual-link">
                                                            <a
                                                                href={event.virtual_meeting_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                            >
                                                                <ExternalLink size={12} />
                                                                Join Meeting
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="registration-info">
                                                    <div className="attendees-count">
                                                        <Users size={14} />
                                                        <span>
                                                            {event.current_attendees}/
                                                            {event.max_attendees || 'Unlimited'}
                                                        </span>
                                                    </div>
                                                    {event.waitlist_enabled &&
                                                        event.waitlist_count > 0 && (
                                                            <div className="waitlist-count">
                                                                <UserPlus size={14} />
                                                                <span>
                                                                    {event.waitlist_count} on
                                                                    waitlist
                                                                </span>
                                                            </div>
                                                        )}
                                                    <div className="ticket-price">
                                                        <DollarSign size={14} />
                                                        <span>
                                                            {formatCurrency(
                                                                event.ticket_price || 0,
                                                                event.currency,
                                                            )}
                                                        </span>
                                                    </div>
                                                    {event.rsvp_required && (
                                                        <div className="rsvp-required">
                                                            <UserCheck size={14} />
                                                            <span>RSVP Required</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="analytics-info">
                                                    <div className="rsvp-stats">
                                                        <div className="stat-item">
                                                            <span className="stat-label">
                                                                Going:
                                                            </span>
                                                            <span className="stat-value going">
                                                                {event.rsvp_stats.going}
                                                            </span>
                                                        </div>
                                                        <div className="stat-item">
                                                            <span className="stat-label">
                                                                Maybe:
                                                            </span>
                                                            <span className="stat-value maybe">
                                                                {event.rsvp_stats.maybe}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="attendance-stats">
                                                        <div className="stat-item">
                                                            <span className="stat-label">
                                                                Checked In:
                                                            </span>
                                                            <span className="stat-value checked-in">
                                                                {event.attendance_stats.checked_in}
                                                            </span>
                                                        </div>
                                                        <div className="stat-item">
                                                            <span className="stat-label">
                                                                Rate:
                                                            </span>
                                                            <span className="stat-value rate">
                                                                {event.attendance_stats.attendance_rate.toFixed(
                                                                    1,
                                                                )}
                                                                %
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="organizer-info">
                                                    <div className="organizer-name">
                                                        {event.organizer_name}
                                                    </div>
                                                    <div className="organizer-contact">
                                                        {event.organizer_contact}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="action-buttons">
                                                    <button
                                                        className="action-btn view"
                                                        onClick={() =>
                                                            window.open(
                                                                `/event/${event.id}`,
                                                                '_blank',
                                                            )
                                                        }
                                                        title="View Event"
                                                    >
                                                        <ExternalLink size={16} />
                                                    </button>
                                                    <button
                                                        className="action-btn analytics"
                                                        onClick={() => {}}
                                                        title="View Analytics"
                                                    >
                                                        <BarChart3 size={16} />
                                                    </button>
                                                    <button
                                                        className="action-btn edit"
                                                        onClick={() => {
                                                            setEditingEvent(event);
                                                            setShowEditModal(true);
                                                        }}
                                                        title="Edit Event"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    {event.status === 'published' ? (
                                                        <button
                                                            className="action-btn cancel"
                                                            onClick={() =>
                                                                handleCancelEvent(event.id)
                                                            }
                                                            title="Cancel Event"
                                                        >
                                                            <XCircle size={16} />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            className="action-btn publish"
                                                            onClick={() =>
                                                                handlePublishEvent(event.id)
                                                            }
                                                            title="Publish Event"
                                                        >
                                                            <CheckCircle size={16} />
                                                        </button>
                                                    )}
                                                    <button
                                                        className="action-btn delete"
                                                        onClick={() => handleDeleteEvent(event.id)}
                                                        title="Delete Event"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {/* Add Event Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div
                        className="modal-content"
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxWidth: '900px' }}
                    >
                        <div className="modal-header">
                            <h3>Add New Event</h3>
                            <button className="close-btn" onClick={() => setShowAddModal(false)}>
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <form>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Event Title *</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Enter event title"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Category *</label>
                                        <select className="form-input">
                                            <option value="">Select category</option>
                                            <option value="Technology">Technology</option>
                                            <option value="Education">Education</option>
                                            <option value="Business">Business</option>
                                            <option value="Corporate">Corporate</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Description *</label>
                                    <textarea
                                        className="form-input"
                                        rows="4"
                                        placeholder="Enter event description"
                                    ></textarea>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Location Type *</label>
                                        <select className="form-input">
                                            <option value="physical">Physical</option>
                                            <option value="virtual">Virtual</option>
                                            <option value="hybrid">Hybrid</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Event Type *</label>
                                        <select className="form-input">
                                            <option value="public">Public</option>
                                            <option value="private">Private</option>
                                            <option value="invite_only">Invite Only</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Location *</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Enter location"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Venue Name (Optional)</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Enter venue name"
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Venue Address (Optional)</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Enter venue address"
                                    />
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Start Date & Time *</label>
                                        <input type="datetime-local" className="form-input" />
                                    </div>
                                    <div className="form-group">
                                        <label>End Date & Time *</label>
                                        <input type="datetime-local" className="form-input" />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Registration Start (Optional)</label>
                                        <input type="datetime-local" className="form-input" />
                                    </div>
                                    <div className="form-group">
                                        <label>Registration End (Optional)</label>
                                        <input type="datetime-local" className="form-input" />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Max Attendees (Optional)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            placeholder="Enter maximum attendees"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Ticket Price (Optional)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            placeholder="Enter ticket price"
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Tags (comma-separated)</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="tag1, tag2, tag3"
                                    />
                                </div>

                                <div className="form-section">
                                    <h4>Advanced Settings</h4>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Organizer Contact</label>
                                            <input
                                                type="email"
                                                className="form-input"
                                                placeholder="Enter organizer email"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Virtual Meeting URL (for virtual events)</label>
                                            <input
                                                type="url"
                                                className="form-input"
                                                placeholder="Enter meeting URL"
                                            />
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="checkbox-label">
                                                <input type="checkbox" />
                                                Featured Event
                                            </label>
                                        </div>
                                        <div className="form-group">
                                            <label className="checkbox-label">
                                                <input type="checkbox" />
                                                RSVP Required
                                            </label>
                                        </div>
                                        <div className="form-group">
                                            <label className="checkbox-label">
                                                <input type="checkbox" />
                                                Enable Waitlist
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="modal-actions">
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={() => setShowAddModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn-primary">
                                        Create Event
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Event Modal */}
            {showEditModal && editingEvent && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div
                        className="modal-content"
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxWidth: '900px' }}
                    >
                        <div className="modal-header">
                            <h3>Edit Event: {editingEvent.title}</h3>
                            <button className="close-btn" onClick={() => setShowEditModal(false)}>
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <form>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Event Title</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            defaultValue={editingEvent.title}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Category</label>
                                        <select
                                            className="form-input"
                                            defaultValue={editingEvent.category}
                                        >
                                            <option value="Technology">Technology</option>
                                            <option value="Education">Education</option>
                                            <option value="Business">Business</option>
                                            <option value="Corporate">Corporate</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Description</label>
                                    <textarea
                                        className="form-input"
                                        rows="4"
                                        defaultValue={editingEvent.description}
                                    ></textarea>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Location Type</label>
                                        <select
                                            className="form-input"
                                            defaultValue={editingEvent.location_type}
                                        >
                                            <option value="physical">Physical</option>
                                            <option value="virtual">Virtual</option>
                                            <option value="hybrid">Hybrid</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Event Type</label>
                                        <select
                                            className="form-input"
                                            defaultValue={editingEvent.event_type}
                                        >
                                            <option value="public">Public</option>
                                            <option value="private">Private</option>
                                            <option value="invite_only">Invite Only</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Location</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            defaultValue={editingEvent.location}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Venue Name</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            defaultValue={editingEvent.venue_name || ''}
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Venue Address</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        defaultValue={editingEvent.venue_address || ''}
                                    />
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Start Date & Time</label>
                                        <input
                                            type="datetime-local"
                                            className="form-input"
                                            defaultValue={editingEvent.start_datetime}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>End Date & Time</label>
                                        <input
                                            type="datetime-local"
                                            className="form-input"
                                            defaultValue={editingEvent.end_datetime}
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Registration Start</label>
                                        <input
                                            type="datetime-local"
                                            className="form-input"
                                            defaultValue={editingEvent.registration_start || ''}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Registration End</label>
                                        <input
                                            type="datetime-local"
                                            className="form-input"
                                            defaultValue={editingEvent.registration_end || ''}
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Max Attendees</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            defaultValue={editingEvent.max_attendees || ''}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Ticket Price</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            defaultValue={editingEvent.ticket_price || ''}
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Tags</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        defaultValue={editingEvent.tags?.join(', ') || ''}
                                    />
                                </div>

                                <div className="form-section">
                                    <h4>Advanced Settings</h4>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Organizer Contact</label>
                                            <input
                                                type="email"
                                                className="form-input"
                                                defaultValue={editingEvent.organizer_contact || ''}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Virtual Meeting URL</label>
                                            <input
                                                type="url"
                                                className="form-input"
                                                defaultValue={
                                                    editingEvent.virtual_meeting_url || ''
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="checkbox-label">
                                                <input
                                                    type="checkbox"
                                                    defaultChecked={editingEvent.featured}
                                                />
                                                Featured Event
                                            </label>
                                        </div>
                                        <div className="form-group">
                                            <label className="checkbox-label">
                                                <input
                                                    type="checkbox"
                                                    defaultChecked={editingEvent.rsvp_required}
                                                />
                                                RSVP Required
                                            </label>
                                        </div>
                                        <div className="form-group">
                                            <label className="checkbox-label">
                                                <input
                                                    type="checkbox"
                                                    defaultChecked={editingEvent.waitlist_enabled}
                                                />
                                                Enable Waitlist
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="modal-actions">
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={() => setShowEditModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn-primary">
                                        Update Event
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EventManagementTab;
