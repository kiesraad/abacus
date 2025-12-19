use axum::{
    Json,
    extract::{FromRef, FromRequestParts, Path},
    http::request::Parts,
    response::{IntoResponse, Response},
};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, SqlitePool};
use utoipa::ToSchema;

use crate::{APIError, error::ErrorReference, polling_station::get};

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema, FromRow)]
#[serde(deny_unknown_fields)]
pub struct PollingStationInvestigation {
    pub polling_station_id: u32,
    pub reason: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub findings: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub corrected_results: Option<bool>,
}

impl IntoResponse for PollingStationInvestigation {
    fn into_response(self) -> Response {
        Json(self).into_response()
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct PollingStationInvestigationCreateRequest {
    pub reason: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct PollingStationInvestigationConcludeRequest {
    pub findings: String,
    pub corrected_results: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct PollingStationInvestigationUpdateRequest {
    pub reason: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub findings: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub corrected_results: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub accept_data_entry_deletion: Option<bool>,
}

pub struct CurrentSessionPollingStationId(pub u32);

impl<S> FromRequestParts<S> for CurrentSessionPollingStationId
where
    SqlitePool: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = APIError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let path_extractor = Path::<u32>::from_request_parts(parts, state).await;
        let pool = SqlitePool::from_ref(state);
        let mut conn = pool.acquire().await?;

        if let Ok(Path(id)) = path_extractor
            && get(&mut conn, id).await.is_ok()
        {
            return Ok(CurrentSessionPollingStationId(id));
        }

        Err(APIError::NotFound(
            "Polling station not found for the current committee session".to_string(),
            ErrorReference::EntryNotFound,
        ))
    }
}
