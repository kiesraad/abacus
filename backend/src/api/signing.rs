use std::iter::Iterator;

use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
};
use axum_extra::response::Attachment;
use chrono::{DateTime, Utc};
use eml_signature;
use serde::Serialize;
use sqlx::SqlitePool;
use utoipa::ToSchema;
use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{
    APIError, AppState, ErrorResponse, SqlitePoolExt,
    api::middleware::authentication::RouteAuthorization,
    domain::{
        election::{CommitteeCategory, ElectionId, ElectionWithPoliticalGroups},
        filename::hyphenate,
        role::Role,
    },
    error::ErrorReference,
    infra::audit_log::{AsAuditEvent, AuditEventLevel, AuditEventType, AuditService},
    repository::{election_repo, signing_keypair_repo},
    service::get_election_certificate,
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

#[derive(Serialize, ToSchema, Debug, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct CertificateDetailsResponse {
    pub election_identifier: String,
    pub organizational_unit: String,
    pub common_name: String,
    pub not_before: DateTime<Utc>,
    pub not_after: DateTime<Utc>,
    pub signature_algorithm: String,
}

impl From<eml_signature::Certificate> for CertificateDetailsResponse {
    fn from(certificate: eml_signature::Certificate) -> Self {
        let subject = certificate.subject().clone();
        Self {
            election_identifier: subject.election_identifier,
            organizational_unit: subject.organizational_unit,
            common_name: subject.common_name,
            not_before: certificate.not_before(),
            not_after: certificate.not_after(),
            signature_algorithm: format!("RSA {}-bit", eml_signature::RSA_KEY_BITS),
        }
    }
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
    audit_service: AuditService,
    Path(election_id): Path<ElectionId>,
) -> Result<Json<CertificateDetailsResponse>, APIError> {
    let mut conn = pool.acquire().await?;
    let election = election_repo::get(&mut conn, election_id).await?;

    let certificate_pem = get_election_certificate(&mut conn, &audit_service, &election).await?;

    let certificate = eml_signature::Certificate::from_pem(certificate_pem.as_bytes())
        .map_err(|e| APIError::DataIntegrityError(e.to_string()))?;

    Ok(Json(certificate.into()))
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
    audit_service: AuditService,
    Path(election_id): Path<ElectionId>,
) -> Result<impl IntoResponse, APIError> {
    let mut conn = pool.acquire().await?;
    let election = election_repo::get(&mut conn, election_id).await?;

    let certificate = get_election_certificate(&mut conn, &audit_service, &election).await?;

    let attachment = Attachment::new(certificate)
        .content_type("application/x-pem-file".to_string())
        .filename(public_key_filename(&election)?);
    Ok(attachment)
}

fn public_key_filename(election: &ElectionWithPoliticalGroups) -> Result<String, APIError> {
    match election.committee_category {
        CommitteeCategory::GSB => Ok(format!(
            "public_key_abacus_{}_{}_{}.crt",
            election.election_id.to_lowercase(),
            election.region_category(),
            hyphenate(&election.authority_region)
        )),

        CommitteeCategory::CSB => Err(APIError::DataIntegrityError(
            "Signing not supported for CSB".to_string(),
        )),
    }
}

#[cfg(test)]
mod tests {
    use std::assert_matches;

    use http_body_util::BodyExt;
    use test_log::test;

    use super::*;
    use crate::{
        domain::election::{ElectionCategory, tests::election_fixture},
        repository::user_repo::{User, UserId},
    };

    #[test]
    fn test_public_key_filename_gsb() {
        let election = election_fixture(ElectionCategory::Municipal, CommitteeCategory::GSB, &[]);
        let filename = public_key_filename(&election).expect("Should succeed for GSB");
        assert_eq!(filename, "public_key_abacus_gr2023_test_gemeente_test.crt");
    }

    #[test]
    fn test_public_key_filename_csb() {
        let election = election_fixture(ElectionCategory::Municipal, CommitteeCategory::CSB, &[]);
        assert_matches!(
            public_key_filename(&election),
            Err(APIError::DataIntegrityError(_))
        );
    }

    #[test(sqlx::test(fixtures(
        path = "../../fixtures",
        scripts("election_1", "signing_keypair")
    )))]
    async fn test_certificate_details(pool: SqlitePool) {
        let election_id = ElectionId::from(1);
        let user = User::test_user(Role::Administrator, UserId::from(1));

        let result = certificate_details(
            State(pool),
            AuditService::new(Some(user), None),
            Path(election_id),
        )
        .await;

        let details = result.expect("should be ok").0;
        assert_eq!(details.election_identifier, "GR2026_Juinen");
        assert_eq!(details.common_name, "Gemeente Juinen");
    }

    #[test(sqlx::test(fixtures(
        path = "../../fixtures",
        scripts("election_1", "signing_keypair")
    )))]
    async fn test_certificate(pool: SqlitePool) {
        let election_id = ElectionId::from(1);
        let user = User::test_user(Role::Administrator, UserId::from(1));

        let result = certificate(
            State(pool),
            AuditService::new(Some(user), None),
            Path(election_id),
        )
        .await;

        let response = result.expect("should be ok").into_response();
        assert_eq!(
            response.headers().get("content-type").unwrap(),
            "application/x-pem-file"
        );
        assert_eq!(
            response.headers().get("content-disposition").unwrap(),
            r#"attachment; filename="public_key_abacus_gr2026_juinen_gemeente_juinen.crt""#
        );

        let body = response.into_body().collect().await.unwrap().to_bytes();
        assert!(body.starts_with("-----BEGIN CERTIFICATE-----\n".as_bytes()));
    }
}
