import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, User, ArrowLeft, Share2, Tag } from 'lucide-react';
import SEO from '../components/SEO';
import { BLOG_POSTS } from './BlogPage';
import '../styles/BlogPage.css';

const BlogDetailPage = () => {
    const { slug } = useParams();
    const post = BLOG_POSTS.find(p => p.slug === slug);

    if (!post) {
        return <Navigate to="/blog" replace />;
    }

    return (
        <div className="blog-detail-page">
            <SEO 
                title={post.title} 
                description={post.excerpt}
                ogImage={post.image}
                ogType="article"
            />

            <div className="blog-detail-hero" style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${post.image})` }}>
                <div className="container">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="hero-content"
                    >
                        <Link to="/blog" className="back-link">
                            <ArrowLeft size={18} /> Back to Hub
                        </Link>
                        <div className="post-meta-top">
                            <span className="category-pill">{post.category}</span>
                            <span className="read-time">5 min read</span>
                        </div>
                        <h1>{post.title}</h1>
                        <div className="post-author-box">
                            <div className="author-info">
                                <strong>{post.author}</strong>
                                <span>Published on {post.date}</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            <div className="container blog-content-wrapper">
                <div className="content-grid">
                    <motion.article 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="post-content card"
                    >
                        {post.content.split('\n\n').map((paragraph, i) => (
                            <p key={i}>{paragraph}</p>
                        ))}
                        
                        <div className="post-footer">
                            <div className="tags">
                                <Tag size={16} />
                                <span>Campus</span>
                                <span>Education</span>
                                <span>Guide</span>
                            </div>
                            <button className="share-btn">
                                <Share2 size={18} /> Share Article
                            </button>
                        </div>
                    </motion.article>

                    <aside className="blog-sidebar">
                        <div className="sidebar-widget card">
                            <h3>About KaruTeens</h3>
                            <p>We are the leading social hub for students in Kenya, providing tools for academic success and social growth.</p>
                            <Link to="/register" className="btn btn-primary btn-block">Join Us</Link>
                        </div>

                        <div className="sidebar-widget card">
                            <h3>Latest Posts</h3>
                            <div className="related-posts">
                                {BLOG_POSTS.filter(p => p.slug !== slug).map(p => (
                                    <Link to={`/blog/${p.slug}`} key={p.slug} className="related-post-item">
                                        <div className="related-img">
                                            <img src={p.image} alt={p.title} />
                                        </div>
                                        <div className="related-text">
                                            <h4>{p.title}</h4>
                                            <span>{p.date}</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
};

export default BlogDetailPage;
