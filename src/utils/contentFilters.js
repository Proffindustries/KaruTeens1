// Utility functions for content filtering and NSFW detection

/**
 * Determines if content should be blurred based on content rating
 * @param {string} contentRating - The content rating (e.g., 'G', 'PG', 'R', 'NC-17')
 * @returns {boolean} - True if content should be blurred
 */
export const shouldBlurContent = (contentRating) => {
    if (!contentRating) return false;
    // Blur PG, R, and NC-17 rated content (G is safe)
    return ['PG', 'R', 'NC-17'].includes(contentRating.toUpperCase());
};

/**
 * Determines if content should be blurred based on age restriction
 * @param {string} ageRestriction - The age restriction (e.g., 'none', '13+', '16+', '18+')
 * @returns {boolean} - True if content should be blurred
 */
export const shouldBlurAgeRestricted = (ageRestriction) => {
    if (!ageRestriction || ageRestriction === 'none') return false;
    // Blur content with age restrictions (13+, 16+, 18+)
    return ['13+', '16+', '18+'].includes(ageRestriction);
};

/**
 * Determines if content should be blurred based on content warning
 * @param {string} contentWarning - The content warning (e.g., 'violence', 'language', etc.)
 * @returns {boolean} - True if content should be blurred
 */
export const shouldBlurContentWarning = (contentWarning) => {
    if (!contentWarning) return false;
    // Blur content with warnings
    return true;
};

/**
 * Determines if content should be blurred based on multiple factors
 * @param {Object} content - Content object with rating, NSFW flag, age restriction, or content warning
 * @returns {boolean} - True if content should be blurred
 */
export const shouldBlur = (content) => {
    if (!content) return false;

    // Check for explicit is_nsfw flag (for backward compatibility)
    if (content.is_nsfw === true) return true;

    // Check content_rating (for posts)
    if (content.content_rating && shouldBlurContent(content.content_rating)) return true;

    // Check age_restriction (for reels and stories)
    if (content.age_restriction && shouldBlurAgeRestricted(content.age_restriction)) return true;

    // Check content_warning (for reels and stories)
    if (content.content_warning && shouldBlurContentWarning(content.content_warning)) return true;

    return false;
};
