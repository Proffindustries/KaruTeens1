#!/bin/bash

echo "Fixing all string reference issues..."

# Fix events.rs - handle string pattern matching properly
sed -i 's/if let Some(start_datetime) = payload.start_datetime {/if let Some(ref start_datetime) = payload.start_datetime {/' src/events.rs
sed -i 's/if let Some(end_datetime) = payload.end_datetime {/if let Some(ref end_datetime) = payload.end_datetime {/' src/events.rs
sed -i 's/if let Some(registration_start) = payload.registration_start {/if let Some(ref registration_start) = payload.registration_start {/' src/events.rs
sed -i 's/if let Some(registration_end) = payload.registration_end {/if let Some(ref registration_end) = payload.registration_end {/' src/events.rs
sed -i 's/if let Some(recurrence_end_date) = payload.recurrence_end_date {/if let Some(ref recurrence_end_date) = payload.recurrence_end_date {/' src/events.rs

# Fix posts.rs
sed -i 's/if let Some(scheduled_publish_date) = payload.scheduled_publish_date {/if let Some(ref scheduled_publish_date) = payload.scheduled_publish_date {/' src/posts.rs
sed -i 's/let scheduled_publish_date = if let Some(s) = payload.scheduled_publish_date {/let scheduled_publish_date = if let Some(ref s) = payload.scheduled_publish_date {/' src/posts.rs

# Fix search string type annotations by adding explicit types
sed -i 's/if !search.is_empty() {/if !(search as \&str).is_empty() {/' src/groups.rs
sed -i 's/if !search.is_empty() {/if !(search as \&str).is_empty() {/' src/marketplace.rs
sed -i 's/if !search.is_empty() {/if !(search as \&str).is_empty() {/' src/pages.rs

# Fix the reg_start issue in events.rs
sed -i 's/Some(s) => Some(chrono::DateTime::parse_from_rfc3339(\&s)/Some(ref s) => Some(chrono::DateTime::parse_from_rfc3339(s)/' src/events.rs

echo "String reference issues fixed"
