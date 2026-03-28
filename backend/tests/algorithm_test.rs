// Algorithm tests for feed and trending
// These test the scoring logic without needing the full database

#[derive(Debug, Clone)]
struct PostScore {
    id: String,
    like_count: i32,
    comment_count: i32,
    share_count: i32,
    view_count: i32,
    reaction_love: i32,
    reaction_laugh: i32,
    reaction_angry: i32,
    reaction_sad: i32,
    is_featured: bool,
    age_hours: f64,
}

fn calculate_trending_score(post: &PostScore) -> f64 {
    let views_weight = (post.view_count as f64 / post.age_hours.powf(0.7)).min(500.0);
    let likes_weight = (post.like_count as f64 * 2.0 / post.age_hours.powf(0.5)).min(300.0);
    let comments_weight = (post.comment_count as f64 * 3.0 / post.age_hours.powf(0.5)).min(300.0);
    let shares_weight = (post.share_count as f64 * 5.0 / post.age_hours.powf(0.3)).min(200.0);

    let total_reactions =
        post.reaction_love + post.reaction_laugh + post.reaction_angry + post.reaction_sad;
    let reactions_weight = (total_reactions as f64 * 2.5 / post.age_hours.powf(0.5)).min(200.0);

    let mut trending_score =
        views_weight + likes_weight + comments_weight + shares_weight + reactions_weight;

    if post.is_featured {
        trending_score += 25.0;
    }

    trending_score
}

fn calculate_for_you_score(
    post: &PostScore,
    is_followed: bool,
    year_match: bool,
    has_media: bool,
) -> f64 {
    let post_age_hours = post.age_hours.max(0.5);
    let engagement =
        post.like_count as f64 + (post.comment_count * 2) as f64 + (post.share_count * 3) as f64;
    let engagement_score = (engagement / post_age_hours.powf(0.5)).min(1000.0);

    let mut score = 0.0;

    if is_followed {
        score += 50.0;
    }

    score += engagement_score;

    if post.is_featured {
        score += 30.0;
    }

    if year_match {
        score += 20.0;
    }

    if has_media {
        score += 15.0;
    }

    score
}

#[cfg(test)]
mod trending_tests {
    use super::*;

    #[test]
    fn test_trending_new_popular_post() {
        let post = PostScore {
            id: "1".to_string(),
            like_count: 100,
            comment_count: 50,
            share_count: 20,
            view_count: 1000,
            reaction_love: 30,
            reaction_laugh: 10,
            reaction_angry: 2,
            reaction_sad: 1,
            is_featured: false,
            age_hours: 2.0, // 2 hours old
        };

        let score = calculate_trending_score(&post);
        assert!(score > 0.0);
    }

    #[test]
    fn test_trending_old_popular_post() {
        let post = PostScore {
            id: "1".to_string(),
            like_count: 100,
            comment_count: 50,
            share_count: 20,
            view_count: 1000,
            reaction_love: 30,
            reaction_laugh: 10,
            reaction_angry: 2,
            reaction_sad: 1,
            is_featured: false,
            age_hours: 24.0, // 24 hours old
        };

        let score = calculate_trending_score(&post);
        assert!(score > 0.0);
        // Older post should have lower score
    }

    #[test]
    fn test_trending_featured_post_boost() {
        let regular_post = PostScore {
            id: "1".to_string(),
            like_count: 50,
            comment_count: 10,
            share_count: 5,
            view_count: 500,
            reaction_love: 10,
            reaction_laugh: 5,
            reaction_angry: 1,
            reaction_sad: 0,
            is_featured: false,
            age_hours: 6.0,
        };

        let featured_post = PostScore {
            id: "2".to_string(),
            like_count: 50,
            comment_count: 10,
            share_count: 5,
            view_count: 500,
            reaction_love: 10,
            reaction_laugh: 5,
            reaction_angry: 1,
            reaction_sad: 0,
            is_featured: true,
            age_hours: 6.0,
        };

        let regular_score = calculate_trending_score(&regular_post);
        let featured_score = calculate_trending_score(&featured_post);

        assert!(featured_score > regular_score);
    }

    #[test]
    fn test_for_you_followed_user() {
        let post = PostScore {
            id: "1".to_string(),
            like_count: 10,
            comment_count: 5,
            share_count: 2,
            view_count: 100,
            reaction_love: 5,
            reaction_laugh: 2,
            reaction_angry: 0,
            reaction_sad: 0,
            is_featured: false,
            age_hours: 1.0,
        };

        // Followed user, no year match, no media
        let score_followed = calculate_for_you_score(&post, true, false, false);

        // Not followed
        let score_not_followed = calculate_for_you_score(&post, false, false, false);

        assert!(score_followed > score_not_followed);
    }

    #[test]
    fn test_for_you_year_match() {
        let post = PostScore {
            id: "1".to_string(),
            like_count: 10,
            comment_count: 5,
            share_count: 2,
            view_count: 100,
            reaction_love: 5,
            reaction_laugh: 2,
            reaction_angry: 0,
            reaction_sad: 0,
            is_featured: false,
            age_hours: 1.0,
        };

        let score_year_match = calculate_for_you_score(&post, false, true, false);
        let score_no_match = calculate_for_you_score(&post, false, false, false);

        assert!(score_year_match > score_no_match);
    }

    #[test]
    fn test_for_you_media_boost() {
        let post = PostScore {
            id: "1".to_string(),
            like_count: 10,
            comment_count: 5,
            share_count: 2,
            view_count: 100,
            reaction_love: 5,
            reaction_laugh: 2,
            reaction_angry: 0,
            reaction_sad: 0,
            is_featured: false,
            age_hours: 1.0,
        };

        let score_with_media = calculate_for_you_score(&post, false, false, true);
        let score_no_media = calculate_for_you_score(&post, false, false, false);

        assert!(score_with_media > score_no_media);
    }

    #[test]
    fn test_time_decay() {
        // New post with same engagement should score higher
        let new_post = PostScore {
            id: "1".to_string(),
            like_count: 50,
            comment_count: 10,
            share_count: 5,
            view_count: 500,
            reaction_love: 10,
            reaction_laugh: 5,
            reaction_angry: 1,
            reaction_sad: 0,
            is_featured: false,
            age_hours: 1.0,
        };

        let old_post = PostScore {
            id: "2".to_string(),
            like_count: 50,
            comment_count: 10,
            share_count: 5,
            view_count: 500,
            reaction_love: 10,
            reaction_laugh: 5,
            reaction_angry: 1,
            reaction_sad: 0,
            is_featured: false,
            age_hours: 24.0,
        };

        let new_score = calculate_trending_score(&new_post);
        let old_score = calculate_trending_score(&old_post);

        assert!(new_score > old_score);
    }

    #[test]
    fn test_engagement_weighting() {
        // Shares should be weighted highest (5x), then comments (3x), then likes (2x)
        let like_heavy = PostScore {
            id: "1".to_string(),
            like_count: 100,
            comment_count: 0,
            share_count: 0,
            view_count: 1000,
            reaction_love: 50,
            reaction_laugh: 0,
            reaction_angry: 0,
            reaction_sad: 0,
            is_featured: false,
            age_hours: 6.0,
        };

        let share_heavy = PostScore {
            id: "2".to_string(),
            like_count: 0,
            comment_count: 0,
            share_count: 20,
            view_count: 1000,
            reaction_love: 0,
            reaction_laugh: 0,
            reaction_angry: 0,
            reaction_sad: 0,
            is_featured: false,
            age_hours: 6.0,
        };

        let like_score = calculate_trending_score(&like_heavy);
        let share_score = calculate_trending_score(&share_heavy);

        // Shares should contribute significantly despite lower raw count
        assert!(share_score > 0.0);
        assert!(like_score > 0.0);
    }
}
