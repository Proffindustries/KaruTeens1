use bson::oid::ObjectId;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdBudget {
    pub daily_budget: i64, // In cents
    pub lifetime_budget: Option<i64>, // In cents
    pub budget_type: String,     // daily, lifetime
    pub budget_delivery: String, // standard, accelerated
    pub currency: String,
    pub spent_today: i64,
    pub spent_lifetime: i64,
    pub remaining_daily: i64,
    pub remaining_lifetime: Option<i64>,
    pub budget_utilization: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdFrequencyCapping {
    pub impressions: i32,
    pub time_period: String, // day, week, month
    pub user_type: String,   // all, new, returning
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdExclusionRule {
    pub rule_type: String,
    pub rule_value: String,
    pub rule_operator: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdCampaign {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub name: String,
    pub description: Option<String>,
    pub status: String,
    pub start_date: bson::DateTime,
    pub end_date: Option<bson::DateTime>,
    pub budget: AdBudget,
    pub optimization_goal: String,
    pub bidding_strategy: String,
    // Removed redundant daily_budget and lifetime_budget
    pub target_roas: Option<f64>,
    pub target_cpa: Option<i64>, // Changed to i64 (cents)
    pub campaign_type: String,
    pub objective: String,
    pub tracking_pixel_id: Option<String>,
    pub conversion_actions: Option<Vec<String>>,
    pub attribution_model: String,
    pub frequency_capping: Option<AdFrequencyCapping>,
    pub exclusion_rules: Option<Vec<AdExclusionRule>>,
    pub created_at: bson::DateTime,
    pub updated_at: bson::DateTime,
    pub created_by: ObjectId,
    pub updated_by: Option<ObjectId>,
    pub groups_count: i32,
    pub creatives_count: i32,
    pub total_spend: i64, // Changed to i64 (cents)
    pub total_impressions: i64,
    pub total_clicks: i64,
    pub total_conversions: i64,
    pub ctr: f64,
    pub cpm: f64,
    pub cpc: f64,
    pub roas: f64,
    pub conversion_rate: f64,
    pub quality_score: f64,
    pub ad_rank: f64,
    pub performance_score: f64,
    pub last_updated: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdDemographics {
    pub age_ranges: Option<Vec<String>>,
    pub genders: Option<Vec<String>>,
    pub income_levels: Option<Vec<String>>,
    pub education_levels: Option<Vec<String>>,
    pub relationship_statuses: Option<Vec<String>>,
    pub parental_statuses: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdTimeOfDay {
    pub start_hour: i32,
    pub end_hour: i32,
    pub days_of_week: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdTargeting {
    pub locations: Option<Vec<String>>,
    pub demographics: Option<AdDemographics>,
    pub interests: Option<Vec<String>>,
    pub keywords: Option<Vec<String>>,
    pub devices: Option<Vec<String>>,
    pub operating_systems: Option<Vec<String>>,
    pub time_of_day: Option<AdTimeOfDay>,
    pub custom_audiences: Option<Vec<String>>,
    pub lookalike_audiences: Option<Vec<String>>,
    pub exclusion_audiences: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdBid {
    pub bid_type: String,
    pub bid_amount: i64, // Changed to i64 (cents)
    pub bid_strategy: String,
    pub bid_ceiling: Option<i64>, // Changed to i64 (cents)
    pub bid_floor: Option<i64>, // Changed to i64 (cents)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdGroup {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub campaign_id: ObjectId,
    pub name: String,
    pub status: String,
    pub targeting: AdTargeting,
    pub bid_strategy: AdBid,
    pub ad_rotation: String,
    pub ad_serving_optimization: String,
    pub start_date: Option<bson::DateTime>,
    pub end_date: Option<bson::DateTime>,
    pub created_at: bson::DateTime,
    pub updated_at: bson::DateTime,
    pub creatives_count: i32,
    pub total_spend: i64, // Changed to i64 (cents)
    pub total_impressions: i64,
    pub total_clicks: i64,
    pub ctr: f64,
    pub cpm: f64,
    pub cpc: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdAssetDimensions {
    pub width: i32,
    pub height: i32,
    pub aspect_ratio: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdCreativeAsset {
    pub asset_type: String,
    pub asset_url: String,
    pub asset_text: Option<String>,
    pub asset_dimensions: Option<AdAssetDimensions>,
    pub asset_format: Option<String>,
    pub asset_size: Option<i64>,
    pub alt_text: Option<String>,
    pub creative_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdDeviceAdjustment {
    pub device_type: String,
    pub adjustment_percentage: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdLocationAdjustment {
    pub location: String,
    pub adjustment_percentage: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdTimeAdjustment {
    pub time_period: String,
    pub adjustment_percentage: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdBidAdjustments {
    pub device_adjustments: Option<Vec<AdDeviceAdjustment>>,
    pub location_adjustments: Option<Vec<AdLocationAdjustment>>,
    pub time_adjustments: Option<Vec<AdTimeAdjustment>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdCreativeVariant {
    pub variant_name: String,
    pub assets: Vec<AdCreativeAsset>,
    pub targeting: Option<AdTargeting>,
    pub bid_adjustments: Option<AdBidAdjustments>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdCustomParameter {
    pub key: String,
    pub value: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdTemplateField {
    pub field_name: String,
    pub field_value: String,
    pub field_type: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdCreative {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub ad_group_id: ObjectId,
    pub name: String,
    pub creative_type: String,
    pub status: String,
    pub assets: Vec<AdCreativeAsset>,
    pub variants: Option<Vec<AdCreativeVariant>>,
    pub call_to_action: Option<String>,
    pub headline: Option<String>,
    pub description: Option<String>,
    pub display_url: Option<String>,
    pub final_url: String,
    pub tracking_url: Option<String>,
    pub custom_parameters: Option<Vec<AdCustomParameter>>,
    pub template_id: Option<String>,
    pub template_fields: Option<Vec<AdTemplateField>>,
    pub created_at: bson::DateTime,
    pub updated_at: bson::DateTime,
    pub impressions: i64,
    pub clicks: i64,
    pub conversions: i64,
    pub ctr: f64,
    pub cpm: f64,
    pub cpc: f64,
    pub quality_score: f64,
    pub relevance_score: f64,
    pub landing_page_score: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdAnalytics {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub campaign_id: Option<ObjectId>,
    pub ad_group_id: Option<ObjectId>,
    pub creative_id: Option<ObjectId>,
    pub date: bson::DateTime,
    pub impressions: i64,
    pub clicks: i64,
    pub conversions: i64,
    pub spend: i64,   // Changed to i64 (cents)
    pub revenue: i64, // Changed to i64 (cents)
    pub created_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdReport {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub name: String,
    pub report_type: String,
    pub date_range: String,
    pub format: String,
    pub generated_at: bson::DateTime,
    pub url: String,
    pub created_by: ObjectId,
}
