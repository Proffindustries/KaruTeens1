import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Circle, Plus, Trash2, Users, MessageSquare } from 'lucide-react';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import Avatar from '../Avatar';

const ClassDetailsModal = ({ classItem, onClose, onUpdate }) => {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('tasks');
    const [tasks, setTasks] = useState(classItem.tasks || []);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [classmates, setClassmates] = useState([]);
    const [isLoadingClassmates, setIsLoadingClassmates] = useState(false);

    useEffect(() => {
        // Mock fetch classmates based on course code
        if (activeTab === 'social' && classItem.course_code) {
            setIsLoadingClassmates(true);
            // Simulate API call
            setTimeout(() => {
                setClassmates([
                    { id: '1', username: 'alex_dev', avatar_url: null },
                    { id: '2', username: 'sarah_m', avatar_url: null },
                    { id: '3', username: 'david_k', avatar_url: null }
                ]);
                setIsLoadingClassmates(false);
            }, 800);
        }
    }, [activeTab, classItem.course_code]);

    const handleAddTask = async () => {
        if (!newTaskTitle.trim()) return;
        const newTask = {
            id: Date.now().toString(),
            title: newTaskTitle,
            completed: false
        };
        const updatedTasks = [...tasks, newTask];
        setTasks(updatedTasks);
        setNewTaskTitle('');
        
        // Mock save to backend
        try {
            // await api.put(`/timetable/classes/${classItem.id}/tasks`, { tasks: updatedTasks });
            onUpdate({ ...classItem, tasks: updatedTasks });
        } catch (err) {
            showToast('Failed to save task', 'error');
        }
    };

    const toggleTask = (taskId) => {
        const updatedTasks = tasks.map(t => 
            t.id === taskId ? { ...t, completed: !t.completed } : t
        );
        setTasks(updatedTasks);
        onUpdate({ ...classItem, tasks: updatedTasks });
    };

    const deleteTask = (taskId) => {
        const updatedTasks = tasks.filter(t => t.id !== taskId);
        setTasks(updatedTasks);
        onUpdate({ ...classItem, tasks: updatedTasks });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal class-details-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                <div className="modal-header">
                    <div>
                        <h3 style={{ margin: 0 }}>{classItem.title}</h3>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {classItem.course_code} • {classItem.room}
                        </span>
                    </div>
                    <button className="icon-btn" onClick={onClose}><X /></button>
                </div>
                
                <div className="view-mode-tabs" style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0' }}>
                    <button 
                        className={`view-tab ${activeTab === 'tasks' ? 'active' : ''}`}
                        onClick={() => setActiveTab('tasks')}
                    >
                        <CheckCircle size={16} /> Tasks & Deadlines
                    </button>
                    <button 
                        className={`view-tab ${activeTab === 'social' ? 'active' : ''}`}
                        onClick={() => setActiveTab('social')}
                    >
                        <Users size={16} /> Classmates
                    </button>
                </div>

                <div className="modal-body" style={{ minHeight: '300px' }}>
                    {activeTab === 'tasks' && (
                        <div className="tasks-section">
                            <div className="add-task-form" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                <input 
                                    type="text" 
                                    placeholder="Add a task or assignment..." 
                                    value={newTaskTitle}
                                    onChange={e => setNewTaskTitle(e.target.value)}
                                    onKeyPress={e => e.key === 'Enter' && handleAddTask()}
                                    style={{ flex: 1 }}
                                />
                                <button className="btn btn-primary" onClick={handleAddTask}>
                                    <Plus size={18} />
                                </button>
                            </div>
                            
                            <div className="tasks-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {tasks.length === 0 ? (
                                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', margin: '2rem 0' }}>No tasks for this class yet.</p>
                                ) : (
                                    tasks.map(task => (
                                        <div key={task.id} className="task-item card shadow-sm" style={{ display: 'flex', alignItems: 'center', padding: '0.75rem', gap: '0.75rem', background: 'var(--surface)' }}>
                                            <button 
                                                className="icon-btn" 
                                                onClick={() => toggleTask(task.id)}
                                                style={{ color: task.completed ? 'var(--success)' : 'var(--text-muted)' }}
                                            >
                                                {task.completed ? <CheckCircle /> : <Circle />}
                                            </button>
                                            <span style={{ flex: 1, textDecoration: task.completed ? 'line-through' : 'none', color: task.completed ? 'var(--text-muted)' : 'inherit' }}>
                                                {task.title}
                                            </span>
                                            <button className="icon-btn danger" onClick={() => deleteTask(task.id)}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'social' && (
                        <div className="social-section">
                            {!classItem.course_code ? (
                                <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Class needs a Course Code to find classmates.</p>
                            ) : isLoadingClassmates ? (
                                <p style={{ textAlign: 'center', color: 'var(--text-muted)', margin: '2rem 0' }}>Searching for classmates...</p>
                            ) : classmates.length === 0 ? (
                                <p style={{ textAlign: 'center', color: 'var(--text-muted)', margin: '2rem 0' }}>No classmates found using this course code.</p>
                            ) : (
                                <div className="classmates-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <div className="info-alert" style={{ background: 'rgba(var(--primary), 0.1)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                                        <Users size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                        These students have <strong>{classItem.course_code}</strong> on their public timetable.
                                    </div>
                                    {classmates.map(user => (
                                        <div key={user.id} className="classmate-card card shadow-sm" style={{ display: 'flex', alignItems: 'center', padding: '0.75rem', gap: '1rem' }}>
                                            <Avatar src={user.avatar_url} name={user.username} size="sm" />
                                            <span style={{ flex: 1, fontWeight: '600' }}>{user.username}</span>
                                            <button className="icon-btn" title="Message">
                                                <MessageSquare size={18} />
                                            </button>
                                        </div>
                                    ))}
                                    
                                    <button className="btn btn-outline btn-block" style={{ marginTop: '1rem' }}>
                                        Join {classItem.course_code} Group Chat
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ClassDetailsModal;
