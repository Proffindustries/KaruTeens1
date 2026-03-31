import React, { useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import Skeleton from '../components/Skeleton';
import { Calendar, User, Tag, ChevronLeft } from 'lucide-react';

const PageDetailPage = () => {
    const { slug } = useParams();
    const pageViewIdRef = useRef(null);
    const startTimeRef = useRef(null);

    const {
        data: page,
        isLoading,
        error,
        isSuccess,
    } = useQuery({
        queryKey: ['page', slug],
        queryFn: async () => {
            const response = await api.get(`/pages/${slug}`);
            // Capture page view ID from response header (if present)
            const pageViewId = response.headers['x-page-view-id'];
            if (pageViewId) {
                pageViewIdRef.current = pageViewId;
            }
            return response.data;
        },
    });

    // Track page view duration: send on page change or unmount
    useEffect(() => {
        if (!page?._id) return;
        const currentPageId = page._id;
        const currentPageViewId = pageViewIdRef.current;
        const startTime = Date.now();

        return () => {
            if (currentPageViewId && startTime) {
                const durationSeconds = Math.floor((Date.now() - startTime) / 1000);
                const payload = {
                    page_view_id: currentPageViewId,
                    duration_seconds: durationSeconds,
                };
                const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
                navigator.sendBeacon(`/api/pages/${currentPageId}/duration`, blob);
            }
        };
    }, [page?._id]); // Re-run when page ID changes (SPA navigation)

    if (isLoading) {
        return (
            <div className="container max-w-4xl py-8">
                <Skeleton height="400px" className="mb-6 rounded-xl" />
                <Skeleton height="40px" width="70%" className="mb-4" />
                <Skeleton height="20px" width="40%" className="mb-8" />
                <Skeleton count={10} className="mb-2" />
            </div>
        );
    }

    if (error || !page) {
        return (
            <div className="container py-20 text-center">
                <h2 className="text-2xl font-bold mb-4">Page Not Found</h2>
                <p className="mb-8">
                    The page you are looking for doesn't exist or has been moved.
                </p>
                <Link to="/" className="btn btn-primary">
                    Go Home
                </Link>
            </div>
        );
    }

    return (
        <article className="container max-w-4xl py-8">
            <Link
                to="/"
                className="inline-flex items-center text-gray-500 hover:text-primary mb-6 transition-colors"
            >
                <ChevronLeft size={20} />
                <span>Back to Home</span>
            </Link>

            {page.featured_image && (
                <img
                    src={page.featured_image}
                    alt={page.title}
                    className="w-full h-[400px] object-cover rounded-2xl mb-8 shadow-lg"
                />
            )}

            <header className="mb-8">
                <h1 className="text-4xl font-bold mb-4 text-gray-900">{page.title}</h1>

                <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                        <User size={16} />
                        <span>{page.author_name || 'Admin'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar size={16} />
                        <span>
                            {new Date(
                                page.published_at || page.created_at,
                            ).toLocaleDateString()}
                        </span>
                    </div>
                    {page.category && (
                        <div className="flex items-center gap-2">
                            <Tag size={16} />
                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-medium">
                                {page.category}
                            </span>
                        </div>
                    )}
                </div>
            </header>

            <div
                className="prose prose-lg max-w-none text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: page.content }}
            />

            {page.tags && page.tags.length > 0 && (
                <footer className="mt-12 pt-8 border-t border-gray-100">
                    <div className="flex flex-wrap gap-2">
                        {page.tags.map((tag, idx) => (
                            <span
                                key={idx}
                                className="bg-gray-100 text-gray-600 px-3 py-1 rounded-lg text-sm"
                            >
                                #{tag}
                            </span>
                        ))}
                    </div>
                </footer>
            )}
        </article>
    );
};

export default PageDetailPage;
