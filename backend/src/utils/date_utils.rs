//! Date utility functions for consistent RFC3339 serialization across the application

use mongodb::bson::DateTime;

/// Convert BSON DateTime to RFC3339 string
pub fn to_rfc3339(dt: &DateTime) -> String {
    dt.to_chrono().to_rfc3339()
}

/// Convert optional BSON DateTime to optional RFC3339 string
pub fn option_to_rfc3339(dt: &Option<DateTime>) -> Option<String> {
    dt.as_ref().map(|d| d.to_chrono().to_rfc3339())
}

/// Get current timestamp as RFC3339 string
pub fn now_rfc3339() -> String {
    DateTime::now().to_chrono().to_rfc3339()
}

/// Get current BSON DateTime
pub fn now_bson() -> DateTime {
    DateTime::now()
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    #[test]
    fn test_rfc3339_conversion() {
        let now = DateTime::now();
        let rfc3339_str = to_rfc3339(&now);
        
        // Verify it's a valid RFC3339 format
        assert!(chrono::DateTime::parse_from_rfc3339(&rfc3339_str).is_ok());
    }

    #[test]
    fn test_option_rfc3339_conversion() {
        let some_dt = Some(DateTime::now());
        let none_dt: Option<DateTime> = None;
        
        assert!(option_to_rfc3339(&some_dt).is_some());
        assert!(option_to_rfc3339(&none_dt).is_none());
    }
}
