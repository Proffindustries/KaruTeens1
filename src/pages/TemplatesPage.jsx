import React, { useState } from 'react';
import {
    FileText,
    Copy,
    Check,
    Search,
    Plus,
    BookOpen,
    Users,
    Calendar,
    MessageCircle,
    Lightbulb,
    GraduationCap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/TemplatesPage.css';
import CreatePostModal from '../components/CreatePostModal.jsx';

const TEMPLATES = [
    {
        id: 1,
        category: 'Study Tips',
        title: 'Study Tips Share',
        icon: '💡',
        content: `📚 Study Tips for Today!\n\nWhat's your best study hack? Share below! 👇\n\n#StudyTips #Learning`,
    },
    {
        id: 2,
        category: 'Study Tips',
        title: 'Pomodoro Technique',
        icon: '🍅',
        content: `🍅 Pomodoro Technique Guide:\n\n1. Study for 25 minutes\n2. Take a 5-minute break\n3. Repeat 4x, then take a long break\n\nWho's tried this? Drop your thoughts! #Productivity`,
    },
    {
        id: 3,
        category: 'Study Group',
        title: 'Group Study Invite',
        icon: '👥',
        content: `👥 Looking for Study Group!\n\nSubject: [SUBJECT]\nLocation: [LIBRARY/ONLINE]\nTime: [DATE & TIME]\n\nAnyone interested? DM me! #StudyGroup`,
    },
    {
        id: 4,
        category: 'Study Group',
        title: 'Group Formed',
        icon: '🎉',
        content: `🎉 Study Group Formed!\n\nMembers: @[member1], @[member2], @[member3]\nSubject: [SUBJECT]\nSchedule: [WHEN]\n\nLet's crush this together! #StudySquad`,
    },
    {
        id: 5,
        category: 'Exam Prep',
        title: 'Exam Announcement',
        icon: '📝',
        content: `📝 Exam Alert!\n\nCourse: [COURSE NAME]\nDate: [DATE]\nTopics: [LIST]\n\nWho's ready? Let's help each other prep! #ExamPrep`,
    },
    {
        id: 6,
        category: 'Exam Prep',
        title: 'Past Paper Request',
        icon: '📄',
        content: `📄 Looking for Past Papers!\n\nCourse: [COURSE CODE]\nYear: [YEAR]\n\nIf anyone has them, please share! Will return the favor 🙏 #PastPapers`,
    },
    {
        id: 7,
        category: 'Notes',
        title: 'Notes Sharing',
        icon: '📒',
        content: `📒 [TOPIC] Notes\n\nSharing my notes from today's lecture.\nFeel free to add yours! #StudyNotes`,
    },
    {
        id: 8,
        category: 'Notes',
        title: 'Correction Request',
        icon: '✏️',
        content: `✏️ Note Correction Needed!\n\nFound an error in the [SUBJECT] notes from [DATE].\nCan someone clarify [TOPIC]?\n\nThanks! #StudyHelp`,
    },
    {
        id: 9,
        category: 'Resources',
        title: 'Resource Share',
        icon: '📚',
        content: `📚 Useful Resource Alert!\n\n[RESOURCE NAME]\nLink: [URL]\nWhy it's helpful: [BRIEF DESCRIPTION]\n\nCheck it out! #StudyResources`,
    },
    {
        id: 10,
        category: 'Resources',
        title: 'Book Recommendation',
        icon: '📖',
        content: `📖 Book Recommendation!\n\nTitle: [BOOK NAME]\nAuthor: [AUTHOR]\nFor: [COURSE/SUBJECT]\n\nHighly recommend for anyone studying [TOPIC]! #Textbooks`,
    },
    {
        id: 11,
        category: 'Motivation',
        title: 'Motivation Post',
        icon: '🔥',
        content: `🔥 Motivation Monday!\n\n"[YOUR MOTIVATIONAL QUOTE OR MESSAGE]"\n\nLet's have a great week! Keep pushing! 💪 #Motivation #StudyGram`,
    },
    {
        id: 12,
        category: 'Motivation',
        title: 'Achievement Share',
        icon: '🏆',
        content: `🏆 Achievement Unlocked!\n\n[WHAT YOU ACCOMPLISHED]\n\nHard work pays off! What's your win today? 🎉 #Achievement`,
    },
    {
        id: 13,
        category: 'Discussion',
        title: 'Discussion Starter',
        icon: '💬',
        content: `💬 Let's Discuss!\n\nQuestion: [YOUR QUESTION]\n\nDrop your thoughts below! Interested to hear different perspectives. #CampusDiscussion`,
    },
    {
        id: 14,
        category: 'Discussion',
        title: 'Opinion Poll',
        icon: '🗳️',
        content: `🗳️ Quick Poll!\n\nA) [OPTION A]\nB) [OPTION B]\nC) [OPTION C]\n\nVote and explain in comments! #StudentVoice`,
    },
    {
        id: 15,
        category: 'Events',
        title: 'Event Invite',
        icon: '🎪',
        content: `🎪 You're Invited!\n\nEvent: [EVENT NAME]\nDate: [DATE]\nTime: [TIME]\nLocation: [VENUE]\n\nRSVP in comments! #CampusEvents`,
    },
    {
        id: 16,
        category: 'Events',
        title: 'Workshop Alert',
        icon: '🛠️',
        content: `🛠️ Workshop Alert!\n\nTopic: [WORKSHOP NAME]\nHost: [ORGANIZER]\nWhen: [DATE & TIME]\nWhere: [LOCATION]\n\nFree for students! #Workshop #Learning`,
    },
];

const CATEGORIES = [
    'All',
    'Study Tips',
    'Study Group',
    'Exam Prep',
    'Notes',
    'Resources',
    'Motivation',
    'Discussion',
    'Events',
];

const TemplatesPage = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [copiedId, setCopiedId] = useState(null);
    const [templateModalOpen, setTemplateModalOpen] = useState(false);
    const [currentTemplate, setCurrentTemplate] = useState('');

    const filteredTemplates = TEMPLATES.filter((t) => {
        const matchesSearch =
            t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.content.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const useTemplate = (template) => {
        setCurrentTemplate(template.content);
        setTemplateModalOpen(true);
    };

    const getCategoryIcon = (category) => {
        switch (category) {
            case 'Study Tips':
                return <Lightbulb size={16} />;
            case 'Study Group':
                return <Users size={16} />;
            case 'Exam Prep':
                return <GraduationCap size={16} />;
            case 'Notes':
                return <BookOpen size={16} />;
            case 'Resources':
                return <FileText size={16} />;
            case 'Motivation':
                return <Lightbulb size={16} />;
            case 'Discussion':
                return <MessageCircle size={16} />;
            case 'Events':
                return <Calendar size={16} />;
            default:
                return <FileText size={16} />;
        }
    };

    return (
        <div className="templates-page">
            <CreatePostModal 
                isOpen={templateModalOpen} 
                onClose={() => setTemplateModalOpen(false)} 
                initialText={currentTemplate} 
            />
            <div className="templates-header">
                <h1>📝 Content Templates</h1>
                <p>Quick templates for common study posts</p>
            </div>

            <div className="templates-toolbar">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search templates..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="category-tabs">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat}
                            className={`category-tab ${selectedCategory === cat ? 'active' : ''}`}
                            onClick={() => setSelectedCategory(cat)}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <div className="templates-grid">
                {filteredTemplates.map((template) => (
                    <motion.div
                        key={template.id}
                        className="template-card"
                        whileHover={{ scale: 1.02 }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="template-header">
                            <span className="template-icon">{template.icon}</span>
                            <div className="template-meta">
                                <h3>{template.title}</h3>
                                <span className="template-category">
                                    {getCategoryIcon(template.category)}
                                    {template.category}
                                </span>
                            </div>
                        </div>
                        <pre className="template-content">{template.content}</pre>
                        <button
                            className="copy-btn"
                            onClick={() => useTemplate(template)}
                        >
                            <Copy size={16} /> Use Template
                        </button>
                    </motion.div>
                ))}
            </div>

            {filteredTemplates.length === 0 && (
                <div className="empty-state">
                    <FileText size={48} />
                    <h3>No templates found</h3>
                    <p>Try a different search term or category</p>
                </div>
            )}
        </div>
    );
};

export default TemplatesPage;
