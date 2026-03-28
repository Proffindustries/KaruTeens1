import React from 'react';
import { X } from 'lucide-react';

const PollModal = ({
    showPollModal,
    setShowPollModal,
    pollQuestion,
    setPollQuestion,
    pollOptions,
    setPollOptions,
    pollIsMultiple,
    setPollIsMultiple,
    handleCreatePoll,
}) => {
    if (!showPollModal) return null;

    return (
        <div className="modal-overlay">
            <div className="poll-modal">
                <div className="modal-header">
                    <h3>Create Poll</h3>
                    <button className="icon-btn" onClick={() => setShowPollModal(false)}>
                        <X size={20} />
                    </button>
                </div>
                <div className="modal-body">
                    <div className="form-group">
                        <label>Question</label>
                        <input
                            type="text"
                            placeholder="Enter your question..."
                            value={pollQuestion}
                            onChange={(e) => setPollQuestion(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Options</label>
                        {pollOptions.map((opt, idx) => (
                            <input
                                key={idx}
                                type="text"
                                placeholder={`Option ${idx + 1}`}
                                value={opt}
                                style={{ marginBottom: '0.5rem' }}
                                onChange={(e) => {
                                    const newOpts = [...pollOptions];
                                    newOpts[idx] = e.target.value;
                                    setPollOptions(newOpts);
                                }}
                            />
                        ))}
                        {pollOptions.length < 5 && (
                            <button
                                className="text-btn"
                                onClick={() => setPollOptions([...pollOptions, ''])}
                            >
                                + Add Option
                            </button>
                        )}
                    </div>
                    <div className="form-group-checkbox">
                        <input
                            type="checkbox"
                            id="isMultiple"
                            checked={pollIsMultiple}
                            onChange={(e) => setPollIsMultiple(e.target.checked)}
                        />
                        <label htmlFor="isMultiple">Allow multiple choices</label>
                    </div>
                    <button className="create-btn" onClick={handleCreatePoll}>
                        Create Poll
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PollModal;
