import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Clock, Users, Heart, Check, Loader, ChevronLeft } from 'lucide-react';
import { useEvent, useRSVPEvent, useRemoveRSVP } from '../hooks/useEvents';
import { useToast } from '../context/ToastContext';
import '../styles/EventDetailPage.css';

const EventDetailPage = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const { data: event, isLoading } = useEvent(eventId);
    const { mutate: rsvpEvent } = useRSVPEvent();
    const { mutate: removeRSVP } = useRemoveRSVP();
    const { showToast } = useToast();
    const [currentRSVP, setCurrentRSVP] = useState(null);

    if (isLoading) {
        return (
            <div className="container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
                <Loader size={48} className="spin-anim" />
                <p>Loading event...</p>
            </div>
        );
    }

    if (!event) {
        return (
            <div className="container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
                <h2>Event not found</h2>
                <button className="btn btn-outline" onClick={() => navigate('/events')}>
                    Back to Events
                </button>
            </div>
        );
    }

    const handleRSVP = (status) => {
        rsvpEvent({ eventId, status }, {
            onSuccess: () => {
                setCurrentRSVP(status);
                showToast(`RSVP updated: ${status}`, 'success');
            },
            onError: (err) => {
                showToast(err.response?.data?.error || 'Failed to RSVP', 'error');
            }
        });
    };

    const handleRemoveRSVP = () => {
        removeRSVP(eventId, {
            onSuccess: () => {
                setCurrentRSVP(null);
                showToast('RSVP removed', 'info');
            }
        });
    };

    const startDate = new Date(event.start_datetime);
    const endDate = new Date(event.end_datetime);

    return (
        <div className="container event-detail-page">
            <button className="back-btn" onClick={() => navigate('/events')}>
                <ChevronLeft size={20} /> Back to Events
            </button>

            <div className="event-hero card">
                <img
                    src={event.image_url || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=800"}
                    alt={event.title}
                    className="event-hero-image"
                />
                <div className="event-hero-overlay">
                    <span className="event-category-badge">{event.category}</span>
                    <h1>{event.title}</h1>
                    <div className="event-hero-meta">
                        <span><Users size={16} /> {event.attendee_count} attending</span>
                        {event.max_attendees && <span>• Max: {event.max_attendees}</span>}
                    </div>
                </div>
            </div>

            <div className="event-content card">
                <div className="event-details-grid">
                    <div className="detail-item">
                        <Calendar size={24} color="#3742fa" />
                        <div>
                            <strong>Date</strong>
                            <p>{startDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                    </div>

                    <div className="detail-item">
                        <Clock size={24} color="#3742fa" />
                        <div>
                            <strong>Time</strong>
                            <p>{startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                    </div>

                    <div className="detail-item">
                        <MapPin size={24} color="#3742fa" />
                        <div>
                            <strong>Location</strong>
                            <p>{event.location}</p>
                        </div>
                    </div>
                </div>

                <div className="event-description">
                    <h3>About This Event</h3>
                    <p>{event.description}</p>
                </div>

                <div className="event-organizer">
                    <h4>Organized by</h4>
                    <p>{event.creator_name}</p>
                </div>
            </div>

            {/* RSVP Actions */}
            <div className="rsvp-section card">
                <h3>Are you attending?</h3>
                <div className="rsvp-buttons">
                    <button
                        className={`rsvp-btn ${currentRSVP === 'going' ? 'active going' : ''}`}
                        onClick={() => handleRSVP('going')}
                    >
                        <Check size={18} />
                        Going
                    </button>
                    <button
                        className={`rsvp-btn ${currentRSVP === 'interested' ? 'active interested' : ''}`}
                        onClick={() => handleRSVP('interested')}
                    >
                        <Heart size={18} />
                        Interested
                    </button>
                    <button
                        className={`rsvp-btn ${currentRSVP === 'maybe' ? 'active maybe' : ''}`}
                        onClick={() => handleRSVP('maybe')}
                    >
                        Maybe
                    </button>
                </div>

                {currentRSVP && (
                    <button className="btn btn-outline btn-sm" onClick={handleRemoveRSVP} style={{ marginTop: '1rem' }}>
                        Remove RSVP
                    </button>
                )}
            </div>
        </div>
    );
};

export default EventDetailPage;
