import React from 'react';
import { Clock, MapPin, Check, AlertTriangle } from 'lucide-react';
import './TimetableGrid.css';

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7 AM to 8 PM
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const TimetableGrid = ({ classes, onClassClick, onAttendanceClick, onReportClick }) => {
    const getPosition = (startTime, endTime) => {
        const [startH, startM] = startTime.split(':').map(Number);
        const [endH, endM] = endTime.split(':').map(Number);

        const top = (startH - 7) * 60 + startM;
        const height = endH * 60 + endM - (startH * 60 + startM);

        return { top: `${top}px`, height: `${height}px` };
    };

    const getReliabilityColor = (score) => {
        if (score > 0.8) return 'var(--success)';
        if (score > 0.5) return 'var(--warning)';
        return 'var(--danger)';
    };

    return (
        <div className="timetable-grid-container">
            <div className="timetable-grid-header">
                <div className="time-column-header"></div>
                {DAYS.map((day) => (
                    <div key={day} className="day-column-header">
                        {day.slice(0, 3)}
                    </div>
                ))}
            </div>

            <div className="timetable-grid-body">
                <div className="time-column">
                    {HOURS.map((hour) => (
                        <div key={hour} className="time-slot-label">
                            {hour}:00
                        </div>
                    ))}
                </div>

                <div className="grid-content">
                    {HOURS.map((hour) => (
                        <div
                            key={hour}
                            className="grid-row-line"
                            style={{ top: `${(hour - 7) * 60}px` }}
                        />
                    ))}

                    {DAYS.map((day, dayIndex) => (
                        <div key={day} className="day-column">
                            {classes
                                .filter((c) => c.day === day && !c.is_exam)
                                .map((cls) => {
                                    const pos = getPosition(cls.start_time, cls.end_time);
                                    return (
                                        <div
                                            key={cls.id}
                                            className="grid-class-card"
                                            style={{
                                                ...pos,
                                                borderLeftColor: getReliabilityColor(
                                                    cls.reliability_score || 1.0,
                                                ),
                                            }}
                                            onClick={() => onClassClick(cls)}
                                        >
                                            <div className="grid-class-title">{cls.title}</div>
                                            <div className="grid-class-info">
                                                <span>
                                                    <MapPin size={10} /> {cls.room}
                                                </span>
                                            </div>
                                            <div className="grid-class-actions">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onAttendanceClick(cls);
                                                    }}
                                                    title="Check-in"
                                                >
                                                    <Check size={12} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onReportClick(cls);
                                                    }}
                                                    title="Report Issue"
                                                >
                                                    <AlertTriangle size={12} />
                                                </button>
                                            </div>
                                            {cls.last_report && (
                                                <div className="grid-class-status">
                                                    {cls.last_report}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TimetableGrid;
