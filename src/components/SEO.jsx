import React, { useEffect } from 'react';

/**
 * SEO Component to manage page metadata dynamically.
 * Helps with AdSense compliance and search engine discoverability.
 */
const SEO = ({ 
    title, 
    description, 
    keywords, 
    canonical, 
    ogImage, 
    ogType = 'website' 
}) => {
    const siteName = 'KaruTeens';
    const fullTitle = title ? `${title} | ${siteName}` : siteName;

    useEffect(() => {
        // Update Document Title
        document.title = fullTitle;

        // Update Meta Description
        let metaDescription = document.querySelector('meta[name="description"]');
        if (!metaDescription) {
            metaDescription = document.createElement('meta');
            metaDescription.name = 'description';
            document.head.appendChild(metaDescription);
        }
        metaDescription.setAttribute('content', description || 'KaruTeens is the ultimate campus life platform for university students to connect, share academics, and thrive safely.');

        // Update Meta Keywords
        let metaKeywords = document.querySelector('meta[name="keywords"]');
        if (!metaKeywords) {
            metaKeywords = document.createElement('meta');
            metaKeywords.name = 'keywords';
            document.head.appendChild(metaKeywords);
        }
        metaKeywords.setAttribute('content', keywords || 'university, students, academics, campus life, Kenya, Karatina University, study materials, social hub');

        // Update Canonical Link
        let linkCanonical = document.querySelector('link[rel="canonical"]');
        if (canonical) {
            if (!linkCanonical) {
                linkCanonical = document.createElement('link');
                linkCanonical.rel = 'canonical';
                document.head.appendChild(linkCanonical);
            }
            linkCanonical.setAttribute('href', canonical);
        }

        // Open Graph Meta Tags for Social Sharing
        const updateOgTag = (property, content) => {
            let tag = document.querySelector(`meta[property="${property}"]`);
            if (!tag) {
                tag = document.createElement('meta');
                tag.setAttribute('property', property);
                document.head.appendChild(tag);
            }
            tag.setAttribute('content', content);
        };

        updateOgTag('og:title', fullTitle);
        updateOgTag('og:description', description || 'The ultimate campus life platform.');
        updateOgTag('og:type', ogType);
        if (ogImage) updateOgTag('og:image', ogImage);

    }, [title, description, keywords, canonical, ogImage, ogType, fullTitle]);

    return null; // This component doesn't render anything to the DOM
};

export default SEO;
