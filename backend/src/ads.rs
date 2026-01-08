use axum::{
    extract::{State, Path, Query},
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::get,
    Router,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use mongodb::bson::{doc, oid::ObjectId, DateTime};
use crate::db::AppState;
use crate::models::{User, Profile, AdCampaign, AdGroup, AdCreative, AdAnalytics, AdReport, AdBudget, AdFrequencyCapping, AdExclusionRule};
use crate::auth::AuthUser;
use futures::stream::StreamExt;

// --- DTOs ---

#[derive(Deserialize)]
pub struct CreateAdCampaignRequest {
    pub name: String,
    pub description: Option<String>,
    pub status: String, // active, paused, draft, archived
    pub start_date: String,
    pub end_date: Option<String>,
    pub budget: AdBudgetRequest,
    pub optimization_goal: String, // clicks, conversions, impressions, reach
    pub bidding_strategy: String, // manual_cpc, automatic_cpc, cpm, cpa
    pub daily_budget: f64,
    pub lifetime_budget: Option<f64>,
    pub target_roas: Option<f64>, // Return on Ad Spend
    pub target_cpa: Option<f64>, // Cost per Acquisition
    pub campaign_type: String, // search, display, video, shopping, app
    pub objective: String, // brand_awareness, traffic, engagement, leads, conversions
    pub tracking_pixel_id: Option<String>,
    pub conversion_actions: Option<Vec<String>>,
    pub attribution_model: String, // last_click, first_click, linear, time_decay
    pub frequency_capping: Option<AdFrequencyCappingRequest>,
    pub exclusion_rules: Option<Vec<AdExclusionRuleRequest>>,
}

#[derive(Deserialize)]
pub struct AdBudgetRequest {
    pub daily_budget: f64,
    pub lifetime_budget: Option<f64>,
    pub budget_type: String, // daily, lifetime
    pub budget_delivery: String, // standard, accelerated
    pub currency: String,
}

#[derive(Deserialize)]
pub struct AdFrequencyCappingRequest {
    pub impressions: i32,
    pub time_period: String, // day, week, month
    pub user_type: String, // all, new, returning
}

#[derive(Deserialize)]
pub struct AdExclusionRuleRequest {
    pub rule_type: String, // content, audience, placement
    pub rule_value: String,
    pub rule_operator: String, // exclude, include
}

#[derive(Deserialize)]
pub struct CreateAdGroupRequest {
    pub campaign_id: String,
    pub name: String,
    pub status: String,
    pub targeting: AdTargetingRequest,
    pub bid_strategy: AdBidRequest,
    pub ad_rotation: String, // optimized, rotate_forever
    pub ad_serving_optimization: String, // balanced, optimize_for_conversions, optimize_for_clicks
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[derive(Deserialize)]
pub struct AdTargetingRequest {
    pub locations: Option<Vec<String>>,
    pub demographics: Option<AdDemographicsRequest>,
    pub interests: Option<Vec<String>>,
    pub keywords: Option<Vec<String>>,
    pub devices: Option<Vec<String>>,
    pub operating_systems: Option<Vec<String>>,
    pub time_of_day: Option<AdTimeOfDayRequest>,
    pub custom_audiences: Option<Vec<String>>,
    pub lookalike_audiences: Option<Vec<String>>,
    pub exclusion_audiences: Option<Vec<String>>,
}

#[derive(Deserialize)]
pub struct AdDemographicsRequest {
    pub age_ranges: Option<Vec<String>>,
    pub genders: Option<Vec<String>>,
    pub income_levels: Option<Vec<String>>,
    pub education_levels: Option<Vec<String>>,
    pub relationship_statuses: Option<Vec<String>>,
    pub parental_statuses: Option<Vec<String>>,
}

#[derive(Deserialize)]
pub struct AdTimeOfDayRequest {
    pub start_hour: i32,
    pub end_hour: i32,
    pub days_of_week: Vec<String>,
}

#[derive(Deserialize)]
pub struct AdBidRequest {
    pub bid_type: String, // cpc, cpm, cpa, roas
    pub bid_amount: f64,
    pub bid_strategy: String, // manual, automatic
    pub bid_ceiling: Option<f64>,
    pub bid_floor: Option<f64>,
}

#[derive(Deserialize)]
pub struct CreateAdCreativeRequest {
    pub ad_group_id: String,
    pub name: String,
    pub creative_type: String, // image, video, carousel, collection
    pub status: String,
    pub assets: Vec<AdCreativeAssetRequest>,
    pub variants: Option<Vec<AdCreativeVariantRequest>>,
    pub call_to_action: Option<String>,
    pub headline: Option<String>,
    pub description: Option<String>,
    pub display_url: Option<String>,
    pub final_url: String,
    pub tracking_url: Option<String>,
    pub custom_parameters: Option<Vec<AdCustomParameterRequest>>,
    pub template_id: Option<String>,
    pub template_fields: Option<Vec<AdTemplateFieldRequest>>,
}

#[derive(Deserialize)]
pub struct AdCreativeAssetRequest {
    pub asset_type: String, // image, video, headline, description
    pub asset_url: String,
    pub asset_text: Option<String>,
    pub asset_dimensions: Option<AdAssetDimensionsRequest>,
    pub asset_format: Option<String>,
    pub asset_size: Option<i64>,
    pub alt_text: Option<String>,
    pub creative_id: Option<String>,
}

#[derive(Deserialize)]
pub struct AdAssetDimensionsRequest {
    pub width: i32,
    pub height: i32,
    pub aspect_ratio: Option<String>,
}

#[derive(Deserialize)]
pub struct AdCreativeVariantRequest {
    pub variant_name: String,
    pub assets: Vec<AdCreativeAssetRequest>,
    pub targeting: Option<AdTargetingRequest>,
    pub bid_adjustments: Option<AdBidAdjustmentsRequest>,
}

#[derive(Deserialize)]
pub struct AdBidAdjustmentsRequest {
    pub device_adjustments: Option<Vec<AdDeviceAdjustmentRequest>>,
    pub location_adjustments: Option<Vec<AdLocationAdjustmentRequest>>,
    pub time_adjustments: Option<Vec<AdTimeAdjustmentRequest>>,
}

#[derive(Deserialize)]
pub struct AdDeviceAdjustmentRequest {
    pub device_type: String,
    pub adjustment_percentage: f64,
}

#[derive(Deserialize)]
pub struct AdLocationAdjustmentRequest {
    pub location: String,
    pub adjustment_percentage: f64,
}

#[derive(Deserialize)]
pub struct AdTimeAdjustmentRequest {
    pub time_period: String,
    pub adjustment_percentage: f64,
}

#[derive(Deserialize)]
pub struct AdCustomParameterRequest {
    pub key: String,
    pub value: String,
}

#[derive(Deserialize)]
pub struct AdTemplateFieldRequest {
    pub field_name: String,
    pub field_value: String,
    pub field_type: String,
}

#[derive(Deserialize)]
pub struct UpdateAdCampaignRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub end_date: Option<String>,
    pub budget: Option<AdBudgetRequest>,
    pub optimization_goal: Option<String>,
    pub bidding_strategy: Option<String>,
    pub daily_budget: Option<f64>,
    pub lifetime_budget: Option<f64>,
    pub target_roas: Option<f64>,
    pub target_cpa: Option<f64>,
    pub campaign_type: Option<String>,
    pub objective: Option<String>,
    pub tracking_pixel_id: Option<String>,
    pub conversion_actions: Option<Vec<String>>,
    pub attribution_model: Option<String>,
    pub frequency_capping: Option<AdFrequencyCappingRequest>,
    pub exclusion_rules: Option<Vec<AdExclusionRuleRequest>>,
}

#[derive(Deserialize)]
pub struct AdFilter {
    pub status: Option<String>,
    pub campaign_type: Option<String>,
    pub objective: Option<String>,
    pub optimization_goal: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub min_budget: Option<f64>,
    pub max_budget: Option<f64>,
    pub min_spend: Option<f64>,
    pub max_spend: Option<f64>,
    pub min_roas: Option<f64>,
    pub max_roas: Option<f64>,
    pub min_ctr: Option<f64>,
    pub max_ctr: Option<f64>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Serialize)]
pub struct AdCampaignResponse {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub status: String,
    pub start_date: String,
    pub end_date: Option<String>,
    pub budget: AdBudgetResponse,
    pub optimization_goal: String,
    pub bidding_strategy: String,
    pub daily_budget: f64,
    pub lifetime_budget: Option<f64>,
    pub target_roas: Option<f64>,
    pub target_cpa: Option<f64>,
    pub campaign_type: String,
    pub objective: String,
    pub tracking_pixel_id: Option<String>,
    pub conversion_actions: Option<Vec<String>>,
    pub attribution_model: String,
    pub frequency_capping: Option<AdFrequencyCappingResponse>,
    pub exclusion_rules: Option<Vec<AdExclusionRuleResponse>>,
    pub created_at: String,
    pub updated_at: String,
    pub created_by: String,
    pub updated_by: Option<String>,
    pub groups_count: i32,
    pub creatives_count: i32,
    pub total_spend: f64,
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
    pub last_updated: String,
}

#[derive(Serialize)]
pub struct AdBudgetResponse {
    pub daily_budget: f64,
    pub lifetime_budget: Option<f64>,
    pub budget_type: String,
    pub budget_delivery: String,
    pub currency: String,
    pub spent_today: f64,
    pub spent_lifetime: f64,
    pub remaining_daily: f64,
    pub remaining_lifetime: Option<f64>,
    pub budget_utilization: f64,
}

#[derive(Serialize)]
pub struct AdFrequencyCappingResponse {
    pub impressions: i32,
    pub time_period: String,
    pub user_type: String,
}

#[derive(Serialize)]
pub struct AdExclusionRuleResponse {
    pub rule_type: String,
    pub rule_value: String,
    pub rule_operator: String,
}

#[derive(Serialize)]
pub struct AdGroupResponse {
    pub id: String,
    pub campaign_id: String,
    pub name: String,
    pub status: String,
    pub targeting: AdTargetingResponse,
    pub bid_strategy: AdBidResponse,
    pub ad_rotation: String,
    pub ad_serving_optimization: String,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub creatives_count: i32,
    pub total_spend: f64,
    pub total_impressions: i64,
    pub total_clicks: i64,
    pub ctr: f64,
    pub cpm: f64,
    pub cpc: f64,
}

#[derive(Serialize)]
pub struct AdTargetingResponse {
    pub locations: Option<Vec<String>>,
    pub demographics: Option<AdDemographicsResponse>,
    pub interests: Option<Vec<String>>,
    pub keywords: Option<Vec<String>>,
    pub devices: Option<Vec<String>>,
    pub operating_systems: Option<Vec<String>>,
    pub time_of_day: Option<AdTimeOfDayResponse>,
    pub custom_audiences: Option<Vec<String>>,
    pub lookalike_audiences: Option<Vec<String>>,
    pub exclusion_audiences: Option<Vec<String>>,
}

#[derive(Serialize)]
pub struct AdDemographicsResponse {
    pub age_ranges: Option<Vec<String>>,
    pub genders: Option<Vec<String>>,
    pub income_levels: Option<Vec<String>>,
    pub education_levels: Option<Vec<String>>,
    pub relationship_statuses: Option<Vec<String>>,
    pub parental_statuses: Option<Vec<String>>,
}

#[derive(Serialize)]
pub struct AdTimeOfDayResponse {
    pub start_hour: i32,
    pub end_hour: i32,
    pub days_of_week: Vec<String>,
}

#[derive(Serialize)]
pub struct AdBidResponse {
    pub bid_type: String,
    pub bid_amount: f64,
    pub bid_strategy: String,
    pub bid_ceiling: Option<f64>,
    pub bid_floor: Option<f64>,
}

#[derive(Serialize)]
pub struct AdCreativeResponse {
    pub id: String,
    pub ad_group_id: String,
    pub name: String,
    pub creative_type: String,
    pub status: String,
    pub assets: Vec<AdCreativeAssetResponse>,
    pub variants: Option<Vec<AdCreativeVariantResponse>>,
    pub call_to_action: Option<String>,
    pub headline: Option<String>,
    pub description: Option<String>,
    pub display_url: Option<String>,
    pub final_url: String,
    pub tracking_url: Option<String>,
    pub custom_parameters: Option<Vec<AdCustomParameterResponse>>,
    pub template_id: Option<String>,
    pub template_fields: Option<Vec<AdTemplateFieldResponse>>,
    pub created_at: String,
    pub updated_at: String,
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

#[derive(Serialize)]
pub struct AdCreativeAssetResponse {
    pub asset_type: String,
    pub asset_url: String,
    pub asset_text: Option<String>,
    pub asset_dimensions: Option<AdAssetDimensionsResponse>,
    pub asset_format: Option<String>,
    pub asset_size: Option<i64>,
    pub alt_text: Option<String>,
    pub creative_id: Option<String>,
}

#[derive(Serialize)]
pub struct AdAssetDimensionsResponse {
    pub width: i32,
    pub height: i32,
    pub aspect_ratio: Option<String>,
}

#[derive(Serialize)]
pub struct AdCreativeVariantResponse {
    pub variant_name: String,
    pub assets: Vec<AdCreativeAssetResponse>,
    pub targeting: Option<AdTargetingResponse>,
    pub bid_adjustments: Option<AdBidAdjustmentsResponse>,
}

#[derive(Serialize)]
pub struct AdBidAdjustmentsResponse {
    pub device_adjustments: Option<Vec<AdDeviceAdjustmentResponse>>,
    pub location_adjustments: Option<Vec<AdLocationAdjustmentResponse>>,
    pub time_adjustments: Option<Vec<AdTimeAdjustmentResponse>>,
}

#[derive(Serialize)]
pub struct AdDeviceAdjustmentResponse {
    pub device_type: String,
    pub adjustment_percentage: f64,
}

#[derive(Serialize)]
pub struct AdLocationAdjustmentResponse {
    pub location: String,
    pub adjustment_percentage: f64,
}

#[derive(Serialize)]
pub struct AdTimeAdjustmentResponse {
    pub time_period: String,
    pub adjustment_percentage: f64,
}

#[derive(Serialize)]
pub struct AdCustomParameterResponse {
    pub key: String,
    pub value: String,
}

#[derive(Serialize)]
pub struct AdTemplateFieldResponse {
    pub field_name: String,
    pub field_value: String,
    pub field_type: String,
}

// --- Middleware: Check Admin ---

async fn check_admin(
    user_id: ObjectId,
    state: &Arc<AppState>,
) -> Result<(), (StatusCode, Json<serde_json::Value>)> {
    let users = state.mongo.collection::<User>("users");
    let user_doc = users.find_one(doc! { "_id": user_id }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
    
    match user_doc {
        Some(u) if u.role == "admin" || u.role == "superadmin" => Ok(()),
        _ => Err((StatusCode::FORBIDDEN, Json(json!({"error": "Admin access required"})))),
    }
}

// --- Handlers ---

pub async fn list_ad_campaigns_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Query(params): Query<AdFilter>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let campaigns = state.mongo.collection::<AdCampaign>("ad_campaigns");
    
    let mut query = doc! {};
    
    if let Some(status) = &params.status {
        query.insert("status", status);
    }
    
    if let Some(campaign_type) = &params.campaign_type {
        query.insert("campaign_type", campaign_type);
    }

    if let Some(objective) = &params.objective {
        query.insert("objective", objective);
    }

    if let Some(start_date) = &params.start_date {
        if let Ok(date) = chrono::DateTime::parse_from_rfc3339(start_date) {
            query.insert("start_date", doc! { "$gte": date });
        }
    }

    if let Some(end_date) = &params.end_date {
        if let Ok(date) = chrono::DateTime::parse_from_rfc3339(end_date) {
            query.insert("end_date", doc! { "$lte": date });
        }
    }

    if let Some(min_budget) = params.min_budget {
        query.insert("daily_budget", doc! { "$gte": min_budget });
    }

    if let Some(max_budget) = params.max_budget {
        query.insert("daily_budget", doc! { "$lte": max_budget });
    }

    let sort_by = params.sort_by.unwrap_or_else(|| "created_at".to_string());
    let sort_order = params.sort_order.unwrap_or_else(|| "desc".to_string());
    let page = params.page.unwrap_or(1);
    let limit = params.limit.unwrap_or(20);
    let skip = (page - 1) * limit;

    let _sort_doc = match sort_order.as_str() {
        "desc" => doc! { sort_by: -1 },
        _ => doc! { sort_by: 1 },
    };

    let mut cursor = campaigns.find(query, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut campaigns_list = Vec::new();
    let mut total_count = 0;
    
    while let Some(campaign) = cursor.next().await {
        if let Ok(c) = campaign {
            let campaign_info = build_ad_campaign_response(&c, &state).await?;
            campaigns_list.push(campaign_info);
            total_count += 1;
        }
    }

    // Apply pagination
    let start = skip as usize;
    let end = (start + limit as usize).min(campaigns_list.len());
    let paginated_campaigns = campaigns_list.into_iter().skip(start).take(end - start).collect::<Vec<_>>();

    Ok((StatusCode::OK, Json(json!({
        "campaigns": paginated_campaigns,
        "pagination": {
            "current_page": page,
            "total_pages": (total_count as f64 / limit as f64).ceil() as i64,
            "total_items": total_count,
            "items_per_page": limit,
            "has_next": end < total_count,
            "has_prev": page > 1
        }
    }))))
}

pub async fn get_ad_campaign_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(campaign_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&campaign_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid campaign ID"}))))?;

    let campaigns = state.mongo.collection::<AdCampaign>("ad_campaigns");
    let campaign = campaigns.find_one(doc! { "_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Campaign not found"}))))?;

    let campaign_info = build_ad_campaign_response(&campaign, &state).await?;
    Ok((StatusCode::OK, Json(campaign_info)))
}

pub async fn create_ad_campaign_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Json(payload): Json<CreateAdCampaignRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let campaigns = state.mongo.collection::<AdCampaign>("ad_campaigns");
    
    let new_campaign = AdCampaign {
        id: None,
        name: payload.name,
        description: payload.description,
        status: payload.status,
        start_date: chrono::DateTime::parse_from_rfc3339(&payload.start_date)
            .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid start date format"}))))?.into(),
        end_date: payload.end_date.map(|date| chrono::DateTime::parse_from_rfc3339(&date)
            .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid end date format"}))))
            .unwrap().into()),
        budget: AdBudget {
            daily_budget: payload.budget.daily_budget,
            lifetime_budget: payload.budget.lifetime_budget,
            budget_type: payload.budget.budget_type,
            budget_delivery: payload.budget.budget_delivery,
            currency: payload.budget.currency,
            spent_today: 0.0,
            spent_lifetime: 0.0,
            remaining_daily: payload.budget.daily_budget,
            remaining_lifetime: payload.budget.lifetime_budget,
            budget_utilization: 0.0,
        },
        optimization_goal: payload.optimization_goal,
        bidding_strategy: payload.bidding_strategy,
        daily_budget: payload.daily_budget,
        lifetime_budget: payload.lifetime_budget,
        target_roas: payload.target_roas,
        target_cpa: payload.target_cpa,
        campaign_type: payload.campaign_type,
        objective: payload.objective,
        tracking_pixel_id: payload.tracking_pixel_id,
        conversion_actions: payload.conversion_actions,
        attribution_model: payload.attribution_model,
        frequency_capping: payload.frequency_capping.map(|fc| AdFrequencyCapping {
            impressions: fc.impressions,
            time_period: fc.time_period,
            user_type: fc.user_type,
        }),
        exclusion_rules: payload.exclusion_rules.map(|rules| rules.into_iter().map(|r| AdExclusionRule {
            rule_type: r.rule_type,
            rule_value: r.rule_value,
            rule_operator: r.rule_operator,
        }).collect()),
        created_at: DateTime::now(),
        updated_at: DateTime::now(),
        created_by: user.user_id,
        updated_by: None,
        groups_count: 0,
        creatives_count: 0,
        total_spend: 0.0,
        total_impressions: 0,
        total_clicks: 0,
        total_conversions: 0,
        ctr: 0.0,
        cpm: 0.0,
        cpc: 0.0,
        roas: 0.0,
        conversion_rate: 0.0,
        quality_score: 0.0,
        ad_rank: 0.0,
        performance_score: 0.0,
        last_updated: DateTime::now(),
    };

    let result = campaigns.insert_one(new_campaign, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::CREATED, Json(json!({
        "message": "Ad campaign created successfully",
        "campaign_id": result.inserted_id.as_object_id().unwrap().to_hex()
    }))))
}

pub async fn update_ad_campaign_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(campaign_id): Path<String>,
    Json(payload): Json<UpdateAdCampaignRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&campaign_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid campaign ID"}))))?;

    let campaigns = state.mongo.collection::<AdCampaign>("ad_campaigns");
    let _campaign = campaigns.find_one(doc! { "_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "Campaign not found"}))))?;

    let mut update_doc = doc! {
        "updated_at": DateTime::now(),
        "updated_by": user.user_id
    };

    if let Some(name) = payload.name {
        update_doc.insert("name", name);
    }

    if let Some(description) = payload.description {
        update_doc.insert("description", description);
    }

    if let Some(status) = payload.status {
        update_doc.insert("status", status);
    }

    if let Some(end_date) = payload.end_date {
        let date = chrono::DateTime::parse_from_rfc3339(&end_date)
            .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid end date format"}))))?;
        update_doc.insert("end_date", date);
    }

    if let Some(budget) = payload.budget {
        update_doc.insert("budget", doc! {
            "daily_budget": budget.daily_budget,
            "lifetime_budget": budget.lifetime_budget,
            "budget_type": budget.budget_type,
            "budget_delivery": budget.budget_delivery,
            "currency": budget.currency
        });
        update_doc.insert("daily_budget", budget.daily_budget);
        update_doc.insert("lifetime_budget", budget.lifetime_budget);
    }

    if let Some(optimization_goal) = payload.optimization_goal {
        update_doc.insert("optimization_goal", optimization_goal);
    }

    if let Some(bidding_strategy) = payload.bidding_strategy {
        update_doc.insert("bidding_strategy", bidding_strategy);
    }

    if let Some(target_roas) = payload.target_roas {
        update_doc.insert("target_roas", target_roas);
    }

    if let Some(target_cpa) = payload.target_cpa {
        update_doc.insert("target_cpa", target_cpa);
    }

    if let Some(campaign_type) = payload.campaign_type {
        update_doc.insert("campaign_type", campaign_type);
    }

    if let Some(objective) = payload.objective {
        update_doc.insert("objective", objective);
    }

    if let Some(tracking_pixel_id) = payload.tracking_pixel_id {
        update_doc.insert("tracking_pixel_id", tracking_pixel_id);
    }

    if let Some(conversion_actions) = payload.conversion_actions {
        update_doc.insert("conversion_actions", conversion_actions);
    }

    if let Some(attribution_model) = payload.attribution_model {
        update_doc.insert("attribution_model", attribution_model);
    }

    if let Some(frequency_capping) = payload.frequency_capping {
        update_doc.insert("frequency_capping", doc! {
            "impressions": frequency_capping.impressions,
            "time_period": frequency_capping.time_period,
            "user_type": frequency_capping.user_type,
        });
    }

    if let Some(exclusion_rules) = payload.exclusion_rules {
        let rules: Vec<AdExclusionRule> = exclusion_rules.into_iter().map(|r| AdExclusionRule {
            rule_type: r.rule_type,
            rule_value: r.rule_value,
            rule_operator: r.rule_operator,
        }).collect();
        update_doc.insert("exclusion_rules", mongodb::bson::to_bson(&rules).unwrap());
    }

    campaigns.update_one(
        doc! { "_id": oid },
        doc! { "$set": update_doc },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::OK, Json(json!({"message": "Campaign updated successfully"}))))
}

pub async fn delete_ad_campaign_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(campaign_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&campaign_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid campaign ID"}))))?;

    let campaigns = state.mongo.collection::<AdCampaign>("ad_campaigns");
    
    campaigns.update_one(
        doc! { "_id": oid },
        doc! { 
            "$set": { 
                "status": "archived",
                "updated_at": DateTime::now(),
                "updated_by": user.user_id
            }
        },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    // Also archive associated groups and creatives
    let groups = state.mongo.collection::<AdGroup>("ad_groups");
    groups.update_many(
        doc! { "campaign_id": oid },
        doc! { 
            "$set": { 
                "status": "archived",
                "updated_at": DateTime::now()
            }
        },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let creatives = state.mongo.collection::<AdCreative>("ad_creatives");
    creatives.update_many(
        doc! { "campaign_id": oid },
        doc! { 
            "$set": { 
                "status": "archived",
                "updated_at": DateTime::now()
            }
        },
        None
    ).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok((StatusCode::OK, Json(json!({"message": "Campaign archived successfully"}))))
}

pub async fn list_ad_groups_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(campaign_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&campaign_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid campaign ID"}))))?;

    let groups = state.mongo.collection::<AdGroup>("ad_groups");
    let mut cursor = groups.find(doc! { "campaign_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut groups_list = Vec::new();
    while let Some(group) = cursor.next().await {
        if let Ok(g) = group {
            let group_info = build_ad_group_response(&g, &state).await?;
            groups_list.push(group_info);
        }
    }

    Ok((StatusCode::OK, Json(groups_list)))
}

pub async fn list_ad_creatives_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(ad_group_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&ad_group_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid ad group ID"}))))?;

    let creatives = state.mongo.collection::<AdCreative>("ad_creatives");
    let mut cursor = creatives.find(doc! { "ad_group_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut creatives_list = Vec::new();
    while let Some(creative) = cursor.next().await {
        if let Ok(c) = creative {
            let creative_info = build_ad_creative_response(&c, &state).await?;
            creatives_list.push(creative_info);
        }
    }

    Ok((StatusCode::OK, Json(creatives_list)))
}

pub async fn get_ad_performance_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(campaign_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let oid = ObjectId::parse_str(&campaign_id)
        .map_err(|_| (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid campaign ID"}))))?;

    let analytics = state.mongo.collection::<AdAnalytics>("ad_analytics");
    let mut cursor = analytics.find(doc! { "campaign_id": oid }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut analytics_list = Vec::new();
    while let Some(analytics_record) = cursor.next().await {
        if let Ok(a) = analytics_record {
            analytics_list.push(a);
        }
    }

    Ok((StatusCode::OK, Json(analytics_list)))
}

pub async fn get_ad_reports_handler(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Query(params): Query<AdFilter>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    check_admin(user.user_id, &state).await?;

    let reports = state.mongo.collection::<AdReport>("ad_reports");
    
    let mut query = doc! {};
    
    if let Some(start_date) = &params.start_date {
        if let Ok(date) = chrono::DateTime::parse_from_rfc3339(start_date) {
            query.insert("report_date", doc! { "$gte": date });
        }
    }

    if let Some(end_date) = &params.end_date {
        if let Ok(date) = chrono::DateTime::parse_from_rfc3339(end_date) {
            query.insert("report_date", doc! { "$lte": date });
        }
    }

    let mut cursor = reports.find(query, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    let mut reports_list = Vec::new();
    while let Some(report) = cursor.next().await {
        if let Ok(r) = report {
            reports_list.push(r);
        }
    }

    Ok((StatusCode::OK, Json(reports_list)))
}

// --- Helper Functions ---

async fn build_ad_campaign_response(
    campaign: &AdCampaign,
    state: &Arc<AppState>,
) -> Result<AdCampaignResponse, (StatusCode, Json<serde_json::Value>)> {
    // Get groups count
    let groups = state.mongo.collection::<AdGroup>("ad_groups");
    let groups_count = groups.count_documents(doc! { "campaign_id": campaign.id.unwrap() }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    // Get creatives count
    let creatives = state.mongo.collection::<AdCreative>("ad_creatives");
    let creatives_count = creatives.count_documents(doc! { "campaign_id": campaign.id.unwrap() }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    // Get user info
    let profiles = state.mongo.collection::<Profile>("profiles");
    let user_profile = profiles.find_one(doc! { "user_id": campaign.created_by }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?
        .ok_or((StatusCode::NOT_FOUND, Json(json!({"error": "User profile not found"}))))?;

    Ok(AdCampaignResponse {
        id: campaign.id.unwrap().to_hex(),
        name: campaign.name.clone(),
        description: campaign.description.clone(),
        status: campaign.status.clone(),
        start_date: campaign.start_date.to_chrono().to_rfc3339(),
        end_date: campaign.end_date.map(|dt| dt.to_chrono().to_rfc3339()),
        budget: AdBudgetResponse {
            daily_budget: campaign.budget.daily_budget,
            lifetime_budget: campaign.budget.lifetime_budget,
            budget_type: campaign.budget.budget_type.clone(),
            budget_delivery: campaign.budget.budget_delivery.clone(),
            currency: campaign.budget.currency.clone(),
            spent_today: campaign.budget.spent_today,
            spent_lifetime: campaign.budget.spent_lifetime,
            remaining_daily: campaign.budget.remaining_daily,
            remaining_lifetime: campaign.budget.remaining_lifetime,
            budget_utilization: campaign.budget.budget_utilization,
        },
        optimization_goal: campaign.optimization_goal.clone(),
        bidding_strategy: campaign.bidding_strategy.clone(),
        daily_budget: campaign.daily_budget,
        lifetime_budget: campaign.lifetime_budget,
        target_roas: campaign.target_roas,
        target_cpa: campaign.target_cpa,
        campaign_type: campaign.campaign_type.clone(),
        objective: campaign.objective.clone(),
        tracking_pixel_id: campaign.tracking_pixel_id.clone(),
        conversion_actions: campaign.conversion_actions.clone(),
        attribution_model: campaign.attribution_model.clone(),
        frequency_capping: campaign.frequency_capping.as_ref().map(|fc| AdFrequencyCappingResponse {
            impressions: fc.impressions,
            time_period: fc.time_period.clone(),
            user_type: fc.user_type.clone(),
        }),
        exclusion_rules: campaign.exclusion_rules.as_ref().map(|rules| rules.iter().map(|r| AdExclusionRuleResponse {
            rule_type: r.rule_type.clone(),
            rule_value: r.rule_value.clone(),
            rule_operator: r.rule_operator.clone(),
        }).collect()),
        created_at: campaign.created_at.to_chrono().to_rfc3339(),
        updated_at: campaign.updated_at.to_chrono().to_rfc3339(),
        created_by: user_profile.username,
        updated_by: campaign.updated_by.map(|uid| uid.to_hex()),
        groups_count: groups_count as i32,
        creatives_count: creatives_count as i32,
        total_spend: campaign.total_spend,
        total_impressions: campaign.total_impressions,
        total_clicks: campaign.total_clicks,
        total_conversions: campaign.total_conversions,
        ctr: campaign.ctr,
        cpm: campaign.cpm,
        cpc: campaign.cpc,
        roas: campaign.roas,
        conversion_rate: campaign.conversion_rate,
        quality_score: campaign.quality_score,
        ad_rank: campaign.ad_rank,
        performance_score: campaign.performance_score,
        last_updated: campaign.last_updated.to_chrono().to_rfc3339(),
    })
}

async fn build_ad_group_response(
    group: &AdGroup,
    state: &Arc<AppState>,
) -> Result<AdGroupResponse, (StatusCode, Json<serde_json::Value>)> {
    // Get creatives count
    let creatives = state.mongo.collection::<AdCreative>("ad_creatives");
    let creatives_count = creatives.count_documents(doc! { "ad_group_id": group.id.unwrap() }, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;

    Ok(AdGroupResponse {
        id: group.id.unwrap().to_hex(),
        campaign_id: group.campaign_id.to_hex(),
        name: group.name.clone(),
        status: group.status.clone(),
        targeting: AdTargetingResponse {
            locations: group.targeting.locations.clone(),
            demographics: group.targeting.demographics.as_ref().map(|d| AdDemographicsResponse {
                age_ranges: d.age_ranges.clone(),
                genders: d.genders.clone(),
                income_levels: d.income_levels.clone(),
                education_levels: d.education_levels.clone(),
                relationship_statuses: d.relationship_statuses.clone(),
                parental_statuses: d.parental_statuses.clone(),
            }),
            interests: group.targeting.interests.clone(),
            keywords: group.targeting.keywords.clone(),
            devices: group.targeting.devices.clone(),
            operating_systems: group.targeting.operating_systems.clone(),
            time_of_day: group.targeting.time_of_day.as_ref().map(|t| AdTimeOfDayResponse {
                start_hour: t.start_hour,
                end_hour: t.end_hour,
                days_of_week: t.days_of_week.clone(),
            }),
            custom_audiences: group.targeting.custom_audiences.clone(),
            lookalike_audiences: group.targeting.lookalike_audiences.clone(),
            exclusion_audiences: group.targeting.exclusion_audiences.clone(),
        },
        bid_strategy: AdBidResponse {
            bid_type: group.bid_strategy.bid_type.clone(),
            bid_amount: group.bid_strategy.bid_amount,
            bid_strategy: group.bid_strategy.bid_strategy.clone(),
            bid_ceiling: group.bid_strategy.bid_ceiling,
            bid_floor: group.bid_strategy.bid_floor,
        },
        ad_rotation: group.ad_rotation.clone(),
        ad_serving_optimization: group.ad_serving_optimization.clone(),
        start_date: group.start_date.map(|dt| dt.to_chrono().to_rfc3339()),
        end_date: group.end_date.map(|dt| dt.to_chrono().to_rfc3339()),
        created_at: group.created_at.to_chrono().to_rfc3339(),
        updated_at: group.updated_at.to_chrono().to_rfc3339(),
        creatives_count: creatives_count as i32,
        total_spend: group.total_spend,
        total_impressions: group.total_impressions,
        total_clicks: group.total_clicks,
        ctr: group.ctr,
        cpm: group.cpm,
        cpc: group.cpc,
    })
}

async fn build_ad_creative_response(
    creative: &AdCreative,
    _state: &Arc<AppState>,
) -> Result<AdCreativeResponse, (StatusCode, Json<serde_json::Value>)> {
    Ok(AdCreativeResponse {
        id: creative.id.unwrap().to_hex(),
        ad_group_id: creative.ad_group_id.to_hex(),
        name: creative.name.clone(),
        creative_type: creative.creative_type.clone(),
        status: creative.status.clone(),
        assets: creative.assets.iter().map(|a| AdCreativeAssetResponse {
            asset_type: a.asset_type.clone(),
            asset_url: a.asset_url.clone(),
            asset_text: a.asset_text.clone(),
            asset_dimensions: a.asset_dimensions.as_ref().map(|d| AdAssetDimensionsResponse {
                width: d.width,
                height: d.height,
                aspect_ratio: d.aspect_ratio.clone(),
            }),
            asset_format: a.asset_format.clone(),
            asset_size: a.asset_size,
            alt_text: a.alt_text.clone(),
            creative_id: a.creative_id.clone(),
        }).collect(),
        variants: creative.variants.as_ref().map(|v| v.iter().map(|variant| AdCreativeVariantResponse {
            variant_name: variant.variant_name.clone(),
            assets: variant.assets.iter().map(|a| AdCreativeAssetResponse {
                asset_type: a.asset_type.clone(),
                asset_url: a.asset_url.clone(),
                asset_text: a.asset_text.clone(),
                asset_dimensions: a.asset_dimensions.as_ref().map(|d| AdAssetDimensionsResponse {
                    width: d.width,
                    height: d.height,
                    aspect_ratio: d.aspect_ratio.clone(),
                }),
                asset_format: a.asset_format.clone(),
                asset_size: a.asset_size,
                alt_text: a.alt_text.clone(),
                creative_id: a.creative_id.clone(),
            }).collect(),
            targeting: variant.targeting.as_ref().map(|t| AdTargetingResponse {
                locations: t.locations.clone(),
                demographics: t.demographics.as_ref().map(|d| AdDemographicsResponse {
                    age_ranges: d.age_ranges.clone(),
                    genders: d.genders.clone(),
                    income_levels: d.income_levels.clone(),
                    education_levels: d.education_levels.clone(),
                    relationship_statuses: d.relationship_statuses.clone(),
                    parental_statuses: d.parental_statuses.clone(),
                }),
                interests: t.interests.clone(),
                keywords: t.keywords.clone(),
                devices: t.devices.clone(),
                operating_systems: t.operating_systems.clone(),
                time_of_day: t.time_of_day.as_ref().map(|t| AdTimeOfDayResponse {
                    start_hour: t.start_hour,
                    end_hour: t.end_hour,
                    days_of_week: t.days_of_week.clone(),
                }),
                custom_audiences: t.custom_audiences.clone(),
                lookalike_audiences: t.lookalike_audiences.clone(),
                exclusion_audiences: t.exclusion_audiences.clone(),
            }),
            bid_adjustments: variant.bid_adjustments.as_ref().map(|ba| AdBidAdjustmentsResponse {
                device_adjustments: ba.device_adjustments.as_ref().map(|d| d.iter().map(|da| AdDeviceAdjustmentResponse {
                    device_type: da.device_type.clone(),
                    adjustment_percentage: da.adjustment_percentage,
                }).collect()),
                location_adjustments: ba.location_adjustments.as_ref().map(|l| l.iter().map(|la| AdLocationAdjustmentResponse {
                    location: la.location.clone(),
                    adjustment_percentage: la.adjustment_percentage,
                }).collect()),
                time_adjustments: ba.time_adjustments.as_ref().map(|t| t.iter().map(|ta| AdTimeAdjustmentResponse {
                    time_period: ta.time_period.clone(),
                    adjustment_percentage: ta.adjustment_percentage,
                }).collect()),
            }),
        }).collect()),
        call_to_action: creative.call_to_action.clone(),
        headline: creative.headline.clone(),
        description: creative.description.clone(),
        display_url: creative.display_url.clone(),
        final_url: creative.final_url.clone(),
        tracking_url: creative.tracking_url.clone(),
        custom_parameters: creative.custom_parameters.as_ref().map(|cp| cp.iter().map(|p| AdCustomParameterResponse {
            key: p.key.clone(),
            value: p.value.clone(),
        }).collect()),
        template_id: creative.template_id.clone(),
        template_fields: creative.template_fields.as_ref().map(|tf| tf.iter().map(|f| AdTemplateFieldResponse {
            field_name: f.field_name.clone(),
            field_value: f.field_value.clone(),
            field_type: f.field_type.clone(),
        }).collect()),
        created_at: creative.created_at.to_chrono().to_rfc3339(),
        updated_at: creative.updated_at.to_chrono().to_rfc3339(),
        impressions: creative.impressions,
        clicks: creative.clicks,
        conversions: creative.conversions,
        ctr: creative.ctr,
        cpm: creative.cpm,
        cpc: creative.cpc,
        quality_score: creative.quality_score,
        relevance_score: creative.relevance_score,
        landing_page_score: creative.landing_page_score,
    })
}

pub fn ad_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(list_ad_campaigns_handler).post(create_ad_campaign_handler))
        .route("/:id", get(get_ad_campaign_handler).put(update_ad_campaign_handler).delete(delete_ad_campaign_handler))
        .route("/:campaign_id/groups", get(list_ad_groups_handler))
        .route("/groups/:ad_group_id/creatives", get(list_ad_creatives_handler))
        .route("/:campaign_id/performance", get(get_ad_performance_handler))
        .route("/reports", get(get_ad_reports_handler))
}