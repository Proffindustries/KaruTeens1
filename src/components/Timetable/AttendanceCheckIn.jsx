import React, { useState } from 'react';
import { Check, X, Minus, Loader } from 'lucide-react';

const AttendanceCheckIn = ({ classItem, onLog, onCancel }) => {
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleLog = async (status) => {
        setIsSubmitting(true);
        await onLog(status, notes);
        setIsSubmitting(false);
    };

    return (
        <div className="attendance-checkin-modal">
            <div className="modal-content">
                <h3>Did you attend {classItem.title}?</h3>
                <p>
                    {classItem.start_time} - {classItem.end_time} at {classItem.room}
                </p>

                <div className="attendance-options">
                    <button
                        className="attendance-btn attended"
                        onClick={() => handleLog('attended')}
                        disabled={isSubmitting}
                    >
                        <Check size={20} /> Yes, I did
                    </button>
                    <button
                        className="attendance-btn partial"
                        onClick={() => handleLog('partial')}
                        disabled={isSubmitting}
                    >
                        <Minus size={20} /> Partial
                    </button>
                    <button
                        className="attendance-btn missed"
                        onClick={() => handleLog('missed')}
                        disabled={isSubmitting}
                    >
                        <X size={20} /> No, I missed it
                    </button>
                </div>

                <div className="form-group mt-4">
                    <label>Add optional notes (e.g. why you missed):</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Topics covered or reason for missing..."
                        rows={3}
                    />
                </div>

                <div className="modal-footer">
                    <button className="btn btn-outline" onClick={onCancel}>
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AttendanceCheckIn;
