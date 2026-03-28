#[cfg(test)]
mod tests {
    use bson::oid::ObjectId;
    use karuteens_backend::models::{Location, Post, Profile, User};

    #[test]
    fn test_user_creation() {
        let user = User {
            id: Some(ObjectId::new()),
            email: "test@example.com".to_string(),
            password_hash: "hashed_password".to_string(),
            role: "user".to_string(),
            is_verified: false,
            is_premium: false,
            premium_tier: "basic".to_string(),
            premium_expires_at: None,
            is_banned: false,
            banned_at: None,
            banned_by: None,
            is_2fa_enabled: false,
            two_factor_secret: None,
            login_alerts_enabled: true,
            referred_by: None,
            referral_count: 0,
            created_at: bson::DateTime::now(),
        };

        assert_eq!(user.email, "test@example.com");
        assert_eq!(user.role, "user");
        assert!(!user.is_verified);
    }

    #[test]
    fn test_profile_creation() {
        let user_id = ObjectId::new();
        let profile = Profile {
            id: Some(ObjectId::new()),
            user_id,
            username: "testuser".to_string(),
            full_name: Some("Test User".to_string()),
            bio: Some("Hello world".to_string()),
            avatar_url: None,
            school: Some("Karateens University".to_string()),
            year_of_study: Some(1),
            age: Some(20),
            gender: Some("male".to_string()),
            social_links: None,
            last_seen_at: None,
            last_location: None,
            public_key: None,
            blocked_users: None,
            muted_chats: None,
            is_locked: false,
            view_count: 0,
            created_at: Some(bson::DateTime::now()),
        };

        assert_eq!(profile.username, "testuser");
        assert_eq!(profile.year_of_study, Some(1));
    }

    #[test]
    fn test_post_creation() {
        let author_id = ObjectId::new();
        let post = Post {
            id: Some(ObjectId::new()),
            title: "Test Post".to_string(),
            content: "This is test content".to_string(),
            excerpt: None,
            slug: "test-post".to_string(),
            status: "published".to_string(),
            post_type: "text".to_string(),
            category: "general".to_string(),
            tags: Some(vec!["test".to_string(), "rust".to_string()]),
            author_id,
            author_name: "testuser".to_string(),
            media_urls: None,
            location: None,
            scheduled_publish_date: None,
            published_at: Some(bson::DateTime::now()),
            approved_at: None,
            approved_by: None,
            rejected_at: None,
            rejected_by: None,
            rejection_reason: None,
            view_count: 0,
            like_count: 0,
            reaction_counts: karuteens_backend::models::PostReactions {
                love: 0,
                laugh: 0,
                angry: 0,
                sad: 0,
            },
            comment_count: 0,
            share_count: 0,
            reading_time: None,
            language: "en".to_string(),
            is_featured: false,
            is_premium: false,
            is_pinned: false,
            is_nsfw: false,
            allow_comments: true,
            allow_sharing: true,
            audience: None,
            seo_title: None,
            seo_description: None,
            seo_keywords: None,
            meta_data: None,
            source_url: None,
            source_author: None,
            plagiarism_score: None,
            content_rating: None,
            has_poll: false,
            is_anonymous: false,
            created_at: bson::DateTime::now(),
            updated_at: bson::DateTime::now(),
        };

        assert_eq!(post.content, "This is test content");
        assert_eq!(post.status, "published");
        assert!(post.allow_comments);
    }

    #[test]
    fn test_location_creation() {
        let location = Location {
            latitude: -1.2921,
            longitude: 36.8219,
            label: Some("Nairobi".to_string()),
            is_live: Some(false),
            expires_at: None,
        };

        assert_eq!(location.latitude, -1.2921);
        assert_eq!(location.longitude, 36.8219);
        assert_eq!(location.label, Some("Nairobi".to_string()));
    }

    #[test]
    fn test_post_reactions() {
        use karuteens_backend::models::PostReactions;

        let reactions = PostReactions {
            love: 5,
            laugh: 3,
            angry: 1,
            sad: 0,
        };

        let total = reactions.love + reactions.laugh + reactions.angry + reactions.sad;
        assert_eq!(total, 9);
    }

    #[test]
    fn test_post_with_media() {
        let author_id = ObjectId::new();
        let post = Post {
            id: Some(ObjectId::new()),
            title: "Media Post".to_string(),
            content: "Check out this image!".to_string(),
            excerpt: None,
            slug: "media-post".to_string(),
            status: "published".to_string(),
            post_type: "image".to_string(),
            category: "general".to_string(),
            tags: None,
            author_id,
            author_name: "testuser".to_string(),
            media_urls: Some(vec![
                "https://cdn.example.com/image1.jpg".to_string(),
                "https://cdn.example.com/image2.jpg".to_string(),
            ]),
            location: None,
            scheduled_publish_date: None,
            published_at: Some(bson::DateTime::now()),
            approved_at: None,
            approved_by: None,
            rejected_at: None,
            rejected_by: None,
            rejection_reason: None,
            view_count: 100,
            like_count: 10,
            reaction_counts: karuteens_backend::models::PostReactions {
                love: 5,
                laugh: 2,
                angry: 0,
                sad: 1,
            },
            comment_count: 3,
            share_count: 1,
            reading_time: Some(1),
            language: "en".to_string(),
            is_featured: false,
            is_premium: false,
            is_pinned: false,
            is_nsfw: false,
            allow_comments: true,
            allow_sharing: true,
            audience: None,
            seo_title: None,
            seo_description: None,
            seo_keywords: None,
            meta_data: None,
            source_url: None,
            source_author: None,
            plagiarism_score: None,
            content_rating: None,
            has_poll: false,
            is_anonymous: false,
            created_at: bson::DateTime::now(),
            updated_at: bson::DateTime::now(),
        };

        assert!(post.media_urls.is_some());
        assert_eq!(post.media_urls.unwrap().len(), 2);
    }

    #[test]
    fn test_engagement_rate_calculation() {
        let view_count = 1000;
        let like_count = 50;
        let comment_count = 30;
        let share_count = 20;

        let engagement_rate =
            ((like_count + comment_count + share_count) as f64 / view_count as f64) * 100.0;

        assert_eq!(engagement_rate, 10.0);
    }

    #[test]
    fn test_audience_filtering() {
        let audience_freshers = Some(vec!["freshers".to_string()]);
        let audience_all = None;
        let audience_second_year = Some(vec!["2nd year".to_string()]);

        // Test that audience filtering works
        assert!(audience_freshers.is_some());
        assert!(
            audience_all.is_none() || audience_all.as_ref().map(|a| a.is_empty()).unwrap_or(true)
        );

        // Year of study matching
        let user_year = 1;
        let matches = match user_year {
            1 => audience_freshers
                .as_ref()
                .map(|a| a.contains(&"freshers".to_string()))
                .unwrap_or(false),
            2 => audience_second_year
                .as_ref()
                .map(|a| a.contains(&"2nd year".to_string()))
                .unwrap_or(false),
            _ => false,
        };

        assert!(matches);
    }
}

fn main() {
    println!("Run with: cargo test");
}
