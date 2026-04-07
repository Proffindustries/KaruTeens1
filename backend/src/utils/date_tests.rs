//! Comprehensive tests for RFC3339 date serialization consistency

use super::date_utils::*;
use mongodb::bson::DateTime;
use chrono::{Utc, TimeZone};

#[cfg(test)]
mod integration_tests {
    use super::*;

    #[test]
    fn test_all_date_fields_rfc3339_compatibility() {
        // Test current time
        let now = DateTime::now();
        let rfc3339_str = to_rfc3339(&now);
        
        // Verify it's valid RFC3339
        let parsed = chrono::DateTime::parse_from_rfc3339(&rfc3339_str)
            .expect("Should be valid RFC3339");
        
        // Verify round-trip compatibility
        assert_eq!(parsed.to_rfc3339(), rfc3339_str);
    }

    #[test]
    fn test_optional_date_fields() {
        let some_date = Some(DateTime::now());
        let none_date: Option<DateTime> = None;
        
        let some_rfc = option_to_rfc3339(&some_date);
        let none_rfc = option_to_rfc3339(&none_date);
        
        assert!(some_rfc.is_some());
        assert!(none_rfc.is_none());
        
        // Verify the Some case is valid RFC3339
        if let Some(rfc_str) = some_rfc {
            chrono::DateTime::parse_from_rfc3339(&rfc_str)
                .expect("Should be valid RFC3339");
        }
    }

    #[test]
    fn test_frontend_compatibility() {
        // Test that our RFC3339 strings work with JavaScript Date constructor
        let test_date = DateTime::now();
        let rfc3339_str = to_rfc3339(&test_date);
        
        // In JavaScript, this would be: new Date(rfc3339_str)
        // Verify it's a format JavaScript can parse
        let js_compatible = chrono::DateTime::parse_from_rfc3339(&rfc3339_str).is_ok();
        assert!(js_compatible, "Date should be JavaScript compatible");
    }

    #[test]
    fn test_various_date_formats() {
        // Test different dates to ensure consistency
        let dates = vec![
            DateTime::now(),
            DateTime::from_millis(0), // Unix epoch
            DateTime::from_millis(1609459200000), // 2021-01-01
        ];
        
        for date in dates {
            let rfc3339_str = to_rfc3339(&date);
            let parsed = chrono::DateTime::parse_from_rfc3339(&rfc3339_str)
                .expect("All dates should be RFC3339 compatible");
            
            // Should be able to convert back to BSON DateTime
            let bson_dt = DateTime::from_chrono(parsed.with_timezone(&Utc));
            assert_eq!(date.to_rfc3339(), bson_dt.to_rfc3339());
        }
    }

    #[test]
    fn test_edge_cases() {
        // Test edge cases
        let very_old_date = DateTime::from_millis(-1000000000000); // Before 1970
        let future_date = DateTime::from_millis(4102444800000); // 2100-01-01
        
        let old_rfc = to_rfc3339(&very_old_date);
        let future_rfc = to_rfc3339(&future_date);
        
        // Both should be valid RFC3339
        chrono::DateTime::parse_from_rfc3339(&old_rfc).expect("Old date should be valid");
        chrono::DateTime::parse_from_rfc3339(&future_rfc).expect("Future date should be valid");
    }
}

/// Test helper to verify all endpoint date serialization
#[cfg(test)]
pub fn verify_endpoint_date_serialization() {
    use crate::dto::*;
    use serde_json;
    
    // Test that all DTOs with date fields serialize properly
    let test_dto = PostResponse {
        id: "test".to_string(),
        content: "test".to_string(),
        user: "test".to_string(),
        user_avatar: None,
        likes: 0,
        comments: 0,
        created_at: now_rfc3339(),
        media_urls: vec![],
        location: None,
        post_type: "text".to_string(),
        is_liked: false,
        group_id: None,
        group_name: None,
        group_avatar: None,
        page_id: None,
        page_name: None,
        page_avatar: None,
        is_nsfw: None,
        content_rating: None,
        is_saved: false,
        poll: None,
        is_anonymous: false,
        algorithmic_score: 0.0,
    };
    
    let json_str = serde_json::to_string(&test_dto).expect("Should serialize");
    assert!(json_str.contains("created_at"), "Should contain created_at field");
    
    // Verify the date is in RFC3339 format
    let parsed: serde_json::Value = serde_json::from_str(&json_str).expect("Should parse JSON");
    if let Some(created_at) = parsed.get("created_at").and_then(|v| v.as_str()) {
        chrono::DateTime::parse_from_rfc3339(created_at)
            .expect("created_at should be RFC3339 format");
    } else {
        panic!("created_at should be a string");
    }
}
