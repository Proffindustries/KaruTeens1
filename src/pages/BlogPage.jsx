import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, User, ArrowRight, BookOpen } from 'lucide-react';
import SEO from '../components/SEO';
import '../styles/BlogPage.css';

export const BLOG_POSTS = [
    {
        slug: 'study-techniques-engineering',
        title: 'Top 5 Study Techniques for Engineering Students',
        excerpt: 'Engineering subjects can be daunting. Here are the most effective ways to master complex concepts and ace your exams.',
        author: 'Dr. Jane Smith',
        date: 'April 15, 2026',
        category: 'Academics',
        image: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=600',
        content: `Engineering is not just about memorizing formulas; it's about understanding the underlying principles and learning how to apply them to solve real-world problems. For many students at Karatina University and beyond, the transition to high-level engineering courses can be challenging.

1. The Feynman Technique: This involves explaining a concept in simple terms as if you were teaching it to a child. If you can't explain it simply, you don't understand it well enough.
2. Active Recall: Instead of re-reading your notes, test yourself. Flashcards and practice problems are your best friends.
3. Spaced Repetition: Don't cram. Review your material at increasing intervals to move information from short-term to long-term memory.
4. Problem-Based Learning: Start with a problem and work backward to find the solution. This is particularly effective for thermodynamics and mechanics.
5. Collaborative Study: Join a study room on KaruTeens! Explaining concepts to peers reinforces your own knowledge and exposes you to different perspectives.`
    },
    {
        slug: 'safe-campus-life-online',
        title: 'Navigating Campus Life Safely on KaruTeens',
        excerpt: 'Your safety is our priority. Learn how to make the most of KaruTeens while keeping your personal information secure.',
        author: 'Admin Team',
        date: 'April 10, 2026',
        category: 'Safety',
        image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=600',
        content: `Digital safety is paramount in today's connected world. At KaruTeens, we've built several features to ensure a safe environment for all students. However, user awareness is the first line of defense.

- Verification Matters: Always look for the verified badge when interacting with student leaders or official university pages.
- Handle Private Data Carefully: Never share your passwords, bank details, or sensitive personal information in public groups or confessions.
- Report Misconduct: If you encounter bullying, harassment, or scam attempts, use our built-in reporting tools immediately. Our moderation team reviews all reports 24/7.
- Use the AI Assistant: Not sure if a link is safe? Ask our AI assistant for advice on platform policies and best practices.
- Meet in Public: If you're meeting someone from the marketplace or a study group for the first time, always choose a well-lit public campus location.`
    },
    {
        slug: 'student-entrepreneurship-kenya',
        title: 'A Guide to Student Entrepreneurship in Kenya',
        excerpt: 'Turn your campus side-hustle into a thriving business. A roadmap for the ambitious Kenyan student.',
        author: 'Brian Otieno',
        date: 'April 5, 2026',
        category: 'Professional',
        image: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&q=80&w=600',
        content: `Kenya is a hub of innovation, and university campuses are often the birthplace of the next big thing. Whether you're selling custom-designed hoodies or offering coding services, entrepreneurship is a great way to gain experience and earn extra income.

1. Identify a Campus Need: What are students struggling with? It could be affordable printing, healthy snacks, or reliable cleaning services.
2. Start Small: Don't wait for a huge investment. Use what you have. Test your idea with a small group of friends first.
3. Leverage the KaruTeens Marketplace: Our platform is designed to connect student sellers with student buyers. Post your products or services where your audience already is.
4. Manage Your Time: Academics come first. Use tools like the KaruTeens Timetable feature to block out dedicated time for your business without sacrificing your grades.
5. Network: Connect with other student entrepreneurs in our 'Business Hub' group. Share success stories and learn from each other's mistakes.`
    },
    {
        slug: 'ai-assistant-for-revision',
        title: 'How to Use KaruTeens AI Assistant for Revision',
        excerpt: 'Maximize your study efficiency by leveraging our advanced AI helper for complex problem solving.',
        author: 'Tech Support',
        date: 'March 28, 2026',
        category: 'Technology',
        image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=600',
        content: `The KaruTeens AI Assistant is more than just a chatbot; it's a powerful educational tool tailored for university curricula.

- Summarizing Long Papers: Upload your PDF revision materials and ask the AI to generate a bulleted summary of the key points.
- Step-by-Step Math Solutions: Struggling with a calculus problem? Describe the equation and ask for a step-by-step breakdown of the solution.
- Essay Outlining: Get help structuring your term papers. Provide a topic and the AI can suggest a logical flow for your arguments.
- Quiz Generation: Ask the AI to create a practice quiz based on a specific chapter you've just read.
- 24/7 Availability: Unlike human tutors, the AI is available whenever you need it—even during late-night study sessions.`
    }
];

const BlogPage = () => {
    return (
        <div className="blog-page">
            <SEO 
                title="Campus Blog & Resources" 
                description="Expert advice, study tips, and campus life guides for Karatina University students. Stay updated with the latest from KaruTeens."
                keywords="student blog, campus news, study tips Kenya, university life guides"
            />
            
            <header className="blog-header">
                <div className="container">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="header-content"
                    >
                        <span className="badge">Campus Insights</span>
                        <h1>Knowledge Hub</h1>
                        <p>Detailed guides and resources to help you excel in your university journey.</p>
                    </motion.div>
                </div>
            </header>

            <section className="blog-grid-section container">
                <div className="blog-grid">
                    {BLOG_POSTS.map((post, idx) => (
                        <motion.article 
                            key={post.slug}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="blog-card card"
                        >
                            <div className="blog-card-image">
                                <img src={post.image} alt={post.title} />
                                <span className="blog-category">{post.category}</span>
                            </div>
                            <div className="blog-card-content">
                                <div className="blog-meta">
                                    <span><Calendar size={14} /> {post.date}</span>
                                    <span><User size={14} /> {post.author}</span>
                                </div>
                                <h2>{post.title}</h2>
                                <p>{post.excerpt}</p>
                                <Link to={`/blog/${post.slug}`} className="read-more">
                                    Read Article <ArrowRight size={16} />
                                </Link>
                            </div>
                        </motion.article>
                    ))}
                </div>
            </section>

            <section className="newsletter-section">
                <div className="container">
                    <div className="newsletter-box card">
                        <BookOpen size={48} className="icon" />
                        <h2>Never Miss an Update</h2>
                        <p>Get the latest study materials and campus guides delivered to your inbox.</p>
                        <form className="newsletter-form" onSubmit={(e) => e.preventDefault()}>
                            <input type="email" placeholder="Your campus email" required />
                            <button type="submit" className="btn btn-primary">Subscribe</button>
                        </form>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default BlogPage;
