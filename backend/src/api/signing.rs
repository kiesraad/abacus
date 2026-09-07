use axum::{
    Json,
    extract::{Path, State},
    response::IntoResponse,
};
use axum_extra::response::Attachment;
use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::SqlitePool;
use utoipa::ToSchema;
use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{
    APIError, AppState, ErrorResponse,
    api::middleware::authentication::RouteAuthorization,
    domain::{
        election::{CommitteeCategory, ElectionId},
        role::Role,
    },
    error::ErrorReference,
    repository::election_repo,
};

pub fn router() -> OpenApiRouter<AppState> {
    const ADMIN: &[Role] = &[Role::Administrator];

    OpenApiRouter::default()
        .routes(routes!(certificate).authorize(ADMIN))
        .routes(routes!(certificate_details).authorize(ADMIN))
}

#[derive(Serialize, ToSchema, Debug)]
#[serde(deny_unknown_fields)]
pub struct CertificateDetailsResponse {
    pub election_identifier: String,
    pub organizational_unit: String,
    pub common_name: String,
    pub signature_algorithm: String,
    not_before: DateTime<Utc>,
    not_after: DateTime<Utc>,
}

/// Get the election certificate details
#[utoipa::path(
    get,
    path = "/api/elections/{election_id}/certificate_details",
    responses(
        (status = 200, description = "Election certificate details", body = CertificateDetailsResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 404, description = "Not Found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = ElectionId, description = "Election database id"),
    ),
)]
pub async fn certificate_details(
    State(pool): State<SqlitePool>,
    Path(election_id): Path<ElectionId>,
) -> Result<Json<CertificateDetailsResponse>, APIError> {
    let mut conn = pool.acquire().await?;
    let election = election_repo::get(&mut conn, election_id).await?;
    if election.committee_category != CommitteeCategory::GSB {
        return Err(APIError::NotFound(
            "Certificate is only available for GSB elections".into(),
            ErrorReference::EntryNotFound,
        ));
    }

    // TODO actual certificate details in issue #3769
    Ok(Json(CertificateDetailsResponse {
        election_identifier: "AB2027_Aardenboezem".to_string(),
        organizational_unit: "Abacus 0.0.0".to_string(),
        common_name: "Gemeente Juinen".to_string(),
        signature_algorithm: "SHA256withRSA".to_string(),
        not_before: Default::default(),
        not_after: Default::default(),
    }))
}

/// Download the election certificate
#[utoipa::path(
    get,
    path = "/api/elections/{election_id}/certificate",
    responses(
        (
            status = 200,
            description = "Election certificate",
            content_type = "application/x-pem-file",
            headers(
                ("Content-Disposition", description = "attachment; filename=\"filename.crt\"")
            )),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 404, description = "Not Found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = ElectionId, description = "Election database id"),
    ),
)]
pub async fn certificate(
    State(pool): State<SqlitePool>,
    Path(election_id): Path<ElectionId>,
) -> Result<impl IntoResponse, APIError> {
    let mut conn = pool.acquire().await?;
    let election = election_repo::get(&mut conn, election_id).await?;
    if election.committee_category != CommitteeCategory::GSB {
        return Err(APIError::NotFound(
            "Certificate is only available for GSB elections".into(),
            ErrorReference::EntryNotFound,
        ));
    }

    // TODO actual certificate details in issue #3769
    let attachment =
        Attachment::new("-----BEGIN CERTIFICATE-----\n-----END CERTIFICATE-----".to_string())
            .content_type("application/x-pem-file".to_string())
            .filename("GSB_Juinen_AB2027_Aardenboezem.crt");
    Ok(attachment)
}
