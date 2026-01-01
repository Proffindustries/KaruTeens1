import React, { useState } from 'react';
import { FileText, Lock, Eye, Download, AlertOctagon } from 'lucide-react';
import '../styles/RecallPage.css'; // Creating next

const RecallPage = () => {
    const [viewingDoc, setViewingDoc] = useState(null);

    const materials = [
        { id: 1, title: "Calculus 1 CAT 2 2023", course: "MAT 101", type: "CAT", locked: true },
        { id: 2, title: "Intro to Programming Final Exam", course: "COM 110", type: "Exam", locked: true },
        { id: 3, title: "Physics Mechanics Notes", course: "PHY 102", type: "Notes", locked: false },
        { id: 4, title: "Statistics Cheat Sheet", course: "STA 201", type: "Summary", locked: true },
    ];

    const handleUnlock = (id) => {
        // Logic to trigger payment modal would go here
        alert("Payment Gateway: Please pay Ksh 5 to unlock this document.");
    };

    return (
        <div className="container recall-page">
            <div className="recall-header">
                <h1>Revision Materials</h1>
                <p>Access past papers, CATs, and high-quality notes.</p>
            </div>

            <div className="materials-grid">
                {materials.map(item => (
                    <div key={item.id} className="card material-card">
                        <div className={`material-icon ${item.type.toLowerCase()}`}>
                            <FileText size={32} />
                            <span className="doc-type">{item.type}</span>
                        </div>
                        <div className="material-info">
                            <h3>{item.title}</h3>
                            <span className="course-badge">{item.course}</span>
                        </div>
                        <div className="material-action">
                            {item.locked ? (
                                <button className="btn btn-primary btn-sm btn-full" onClick={() => handleUnlock(item.id)}>
                                    <Lock size={14} /> Unlock (Ksh 5)
                                </button>
                            ) : (
                                <button className="btn btn-outline btn-sm btn-full" onClick={() => setViewingDoc(item)}>
                                    <Eye size={14} /> View
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Document Viewer Overlay */}
            {viewingDoc && (
                <div className="doc-viewer-overlay">
                    <div className="doc-viewer-content no-screenshot">
                        <div className="doc-header">
                            <h3>{viewingDoc.title}</h3>
                            <button className="close-btn" onClick={() => setViewingDoc(null)}>×</button>
                        </div>
                        <div className="doc-body">
                            {/* Mock PDF Content */}
                            <div className="pdf-page">
                                <h1>{viewingDoc.course} - {viewingDoc.type}</h1>
                                <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
                                <div className="watermark">KARUTEENS PREVIEW</div>
                                <p>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
                                <br />
                                <h2>Section A</h2>
                                <p>1. Define the term 'Algorithm'. (2m)</p>
                                <p>2. Differentiate between RAM and ROM. (4m)</p>
                            </div>
                        </div>
                        <div className="doc-footer">
                            <div className="security-warning">
                                <AlertOctagon size={16} />
                                <span>Screenshotting is disabled for this document.</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RecallPage;
