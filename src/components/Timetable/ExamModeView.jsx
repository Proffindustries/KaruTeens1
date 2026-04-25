import React from 'react';
import { Calendar, Clock, MapPin, AlertCircle, TrendingUp } from 'lucide-react';

const ExamModeView = ({ exams }) => {
    const sortedExams = [...exams].sort((a, b) => new Date(a.date) - new Date(b.date));

    const getDaysRemaining = (dateStr) => {
        const diff = new Date(dateStr) - new Date();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return days;
    };

    const hasConflict = (exam, allExams) => {
        return allExams.some(
            (other) =>
                other.id !== exam.id &&
                other.date === exam.date &&
                ((other.start_time >= exam.start_time && other.start_time < exam.end_time) ||
                    (exam.start_time >= other.start_time && exam.start_time < other.end_time)),
        );
    };

    return (
        <div className="exam-mode-container">
            <div className="exam-stats">
                <div className="stat-card">
                    <h3>Total Exams</h3>
                    <p>{exams.length}</p>
                </div>
                <div className="stat-card warning">
                    <h3>Conflicts Detected</h3>
                    <p>{exams.filter((e) => hasConflict(e, exams)).length / 2}</p>
                </div>
            </div>

            <div className="exam-list">
                {sortedExams.map((exam) => {
                    const daysLeft = getDaysRemaining(exam.date);
                    const conflict = hasConflict(exam, exams);

                    return (
                        <div
                            key={exam.id}
                            className={`exam-card ${daysLeft < 3 ? 'urgent' : ''} ${conflict ? 'conflict' : ''}`}
                        >
                            <div className="exam-date-badge">
                                <span className="month">
                                    {new Date(exam.date).toLocaleString('default', {
                                        month: 'short',
                                    })}
                                </span>
                                <span className="day">{new Date(exam.date).getDate()}</span>
                            </div>

                            <div className="exam-info">
                                <h3>{exam.title}</h3>
                                <div className="exam-meta">
                                    <span>
                                        <Clock size={14} /> {exam.start_time} - {exam.end_time}
                                    </span>
                                    <span>
                                        <MapPin size={14} /> {exam.room}
                                    </span>
                                </div>
                                {conflict && (
                                    <div className="conflict-warning">
                                        <AlertCircle size={12} /> Schedule Conflict Detected!
                                    </div>
                                )}
                            </div>

                            <div className="exam-countdown">
                                <div className="countdown-value">{daysLeft}</div>
                                <div className="countdown-label">Days Left</div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ExamModeView;
