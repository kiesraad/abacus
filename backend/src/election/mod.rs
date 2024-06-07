use axum::extract::{Path, State};
use axum::Json;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use utoipa::ToSchema;

use crate::APIError;

pub use self::structs::*;

pub(crate) mod database;
pub mod structs;

/// Election list response
///
/// Does not include the candidate list (political groups) to keep the response size small.
#[derive(Serialize, Deserialize, ToSchema, Debug)]
pub struct ElectionListResponse {
    pub elections: Vec<Election>,
}

/// Election details response, including the election's candidate list (political groups)
#[derive(Serialize, Deserialize, ToSchema, Debug)]
pub struct ElectionDetailsResponse {
    pub election: Election,
}

/// Get a list of all elections, without their candidate lists
#[utoipa::path(
        get,
        path = "/api/elections",
        responses(
            (status = 200, description = "Election list", body = ElectionListResponse),
            (status = 500, description = "Internal server error", body = ErrorResponse),
        ),
    )]
pub async fn election_list(
    State(pool): State<SqlitePool>,
) -> Result<Json<ElectionListResponse>, APIError> {
    let elections = database::get_elections(pool).await?;
    Ok(Json(ElectionListResponse { elections }))
}

/// Get election details including its candidate list
#[utoipa::path(
        get,
        path = "/api/elections/{election_id}",
        responses(
            (status = 200, description = "Election", body = ElectionDetailsResponse),
            (status = 404, description = "Not found", body = ErrorResponse),
            (status = 500, description = "Internal server error", body = ErrorResponse),
        ),
        params(
            ("election_id" = u32, description = "Election database id"),
        ),
    )]
pub async fn election_details(
    State(pool): State<SqlitePool>,
    Path(id): Path<u32>,
) -> Result<Json<ElectionDetailsResponse>, APIError> {
    let election = database::get_election(pool, id).await?;
    Ok(Json(ElectionDetailsResponse { election }))
}
