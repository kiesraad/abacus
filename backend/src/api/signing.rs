use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
};
use axum_extra::response::Attachment;
use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::SqlitePool;
use utoipa::ToSchema;
use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{
    APIError, AppState, ErrorResponse, SqlitePoolExt,
    api::middleware::authentication::RouteAuthorization,
    domain::{
        election::{CommitteeCategory, ElectionId},
        role::Role,
    },
    error::ErrorReference,
    infra::audit_log::{AsAuditEvent, AuditEventLevel, AuditEventType, AuditService},
    repository::{election_repo, signing_keypair_repo},
};

#[derive(Serialize)]
struct PublicKeyUploadReminderDismissedAuditData {
    pub election_id: ElectionId,
    pub election_name: String,
}

impl AsAuditEvent for PublicKeyUploadReminderDismissedAuditData {
    const EVENT_TYPE: AuditEventType = AuditEventType::PublicKeyUploadReminderDismissed;
    const EVENT_LEVEL: AuditEventLevel = AuditEventLevel::Success;
}

pub fn router() -> OpenApiRouter<AppState> {
    const ADMIN: &[Role] = &[Role::Administrator];

    OpenApiRouter::default()
        .routes(routes!(certificate).authorize(ADMIN))
        .routes(routes!(certificate_details).authorize(ADMIN))
        .routes(routes!(dismiss_public_key_upload_reminder).authorize(ADMIN))
}

#[utoipa::path(
    put,
    path = "/api/elections/{election_id}/dismiss_public_key_upload_reminder",
    responses(
        (status = 204, description = "Public key upload reminder dismissed"),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 404, description = "Not Found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = ElectionId, description = "Election database id"),
    ),
)]
pub async fn dismiss_public_key_upload_reminder(
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path(election_id): Path<ElectionId>,
) -> Result<StatusCode, APIError> {
    let mut tx = pool.begin_immediate().await?;
    let election = election_repo::get(&mut tx, election_id).await?;

    let updated = signing_keypair_repo::set_show_reminder(&mut tx, election_id, false).await?;
    if !updated {
        return Err(APIError::NotFound(
            "No signing keypair found for this election".into(),
            ErrorReference::EntryNotFound,
        ));
    }

    audit_service
        .log(
            &mut tx,
            &PublicKeyUploadReminderDismissedAuditData {
                election_id,
                election_name: election.name,
            },
            None,
        )
        .await?;

    tx.commit().await?;

    Ok(StatusCode::NO_CONTENT)
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
