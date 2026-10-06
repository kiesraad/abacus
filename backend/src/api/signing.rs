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
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use tracing::info;
use utoipa::ToSchema;
use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{
    APIError, AppState, ErrorResponse, SqlitePoolExt,
    api::middleware::authentication::RouteAuthorization,
    domain::{
        election::{CommitteeCategory, ElectionId, ElectionWithPoliticalGroups},
        filename::hyphenate,
        role::Role,
        sub_committee::{Certificate, SubCommittee, SubCommitteeId},
    },
    error::{ApiErrorResponse, ErrorReference},
    infra::audit_log::{AsAuditEvent, AuditEventLevel, AuditEventType, AuditService},
    repository::{committee_session_repo, election_repo, signing_keypair_repo, sub_committee_repo},
    service::{
        SubCommitteeCertificateError, add_sub_committee_certificate,
        delete_sub_committee_certificate, get_election_certificate, signature_algorithm,
    },
};

impl ApiErrorResponse for SubCommitteeCertificateError {
    fn log(&self) {
        info!("Sub committee certificate rejected: {:?}", self);
    }

    fn to_response_parts(&self) -> (StatusCode, ErrorResponse) {
        let (status, message, reference) = match self {
            SubCommitteeCertificateError::InvalidCertificate(_) => (
                StatusCode::BAD_REQUEST,
                "Invalid certificate",
                ErrorReference::InvalidCertificate,
            ),
            SubCommitteeCertificateError::WrongElection => (
                StatusCode::UNPROCESSABLE_ENTITY,
                "Certificate is for another election",
                ErrorReference::CertificateWrongElection,
            ),
            SubCommitteeCertificateError::UnknownSubCommittee => (
                StatusCode::UNPROCESSABLE_ENTITY,
                "Certificate is for an unknown sub committee",
                ErrorReference::CertificateUnknownSubCommittee,
            ),
            SubCommitteeCertificateError::AlreadyAdded => (
                StatusCode::CONFLICT,
                "Public key was already added",
                ErrorReference::CertificateAlreadyAdded,
            ),
        };
        (status, ErrorResponse::new(message, reference, false))
    }
}

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
        .routes(routes!(sub_committee_certificates, sub_committee_certificate_add).authorize(ADMIN))
        .routes(routes!(sub_committee_certificate_delete).authorize(ADMIN))
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
            signature_algorithm: signature_algorithm(),
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

    let certificate = get_election_certificate(&mut conn, &audit_service, &election).await?;

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

    let attachment = Attachment::new(certificate.to_pem())
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

/// Get all the subcommittee certificates for an election
#[utoipa::path(
    get,
    path = "/api/elections/{election_id}/sub_committee_certificates",
    responses(
        (status = 200, description = "Election certificate details", body = Vec<SubCommittee>),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 404, description = "Not Found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = ElectionId, description = "Election database id"),
    ),
)]
pub async fn sub_committee_certificates(
    State(pool): State<SqlitePool>,
    Path(election_id): Path<ElectionId>,
) -> Result<Json<Vec<SubCommittee>>, APIError> {
    let mut conn = pool.acquire().await?;

    let committee_session =
        committee_session_repo::get_election_committee_session(&mut conn, election_id).await?;

    let sub_committees: Vec<_> = sub_committee_repo::list(&mut conn, committee_session.id).await?;

    Ok(Json(sub_committees))
}

/// Request to add a sub committee certificate
#[derive(Deserialize, ToSchema, Debug)]
#[serde(deny_unknown_fields)]
pub struct AddSubCommitteeCertificateRequest {
    pub data: String,
}

/// The certificate that was added, with the sub committee it was added to
#[derive(Serialize, ToSchema, Debug)]
pub struct AddSubCommitteeCertificateResponse {
    pub sub_committee_id: SubCommitteeId,
    pub authority_name: String,
    pub certificate: Certificate,
    pub expired: bool,
}

/// Validate a certificate and add it to the sub committee it belongs to
#[utoipa::path(
    post,
    path = "/api/elections/{election_id}/sub_committee_certificates",
    request_body = AddSubCommitteeCertificateRequest,
    responses(
        (status = 201, description = "Certificate added", body = AddSubCommitteeCertificateResponse),
        (status = 400, description = "Invalid certificate", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 404, description = "Not Found", body = ErrorResponse),
        (status = 409, description = "Public key already added or committee session completed", body = ErrorResponse),
        (status = 413, description = "Payload too large", body = ErrorResponse),
        (status = 422, description = "Certificate is for another election or an unknown sub committee", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = ElectionId, description = "Election database id"),
    ),
)]
pub async fn sub_committee_certificate_add(
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path(election_id): Path<ElectionId>,
    Json(request): Json<AddSubCommitteeCertificateRequest>,
) -> Result<(StatusCode, Json<AddSubCommitteeCertificateResponse>), APIError> {
    let certificate = eml_signature::Certificate::from_pem(request.data.as_bytes())
        .map_err(SubCommitteeCertificateError::InvalidCertificate)?;

    let mut tx = pool.begin_immediate().await?;
    let election = election_repo::get(&mut tx, election_id).await?;

    let (sub_committee, certificate) =
        add_sub_committee_certificate(&mut tx, &audit_service, &election, &certificate).await?;

    tx.commit().await?;

    Ok((
        StatusCode::CREATED,
        Json(AddSubCommitteeCertificateResponse {
            sub_committee_id: sub_committee.id,
            authority_name: sub_committee.authority_name,
            expired: certificate.is_expired(Utc::now()),
            certificate,
        }),
    ))
}

/// Delete a sub committee certificate by its public key fingerprint
#[utoipa::path(
    delete,
    path = "/api/elections/{election_id}/sub_committees/{sub_committee_id}/certificates/{public_key_fingerprint}",
    responses(
        (status = 204, description = "Certificate deleted"),
        (status = 400, description = "Invalid path parameter"),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "Election, sub committee or certificate not found", body = ErrorResponse),
        (status = 409, description = "Committee session completed", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = ElectionId, description = "Election database id"),
        ("sub_committee_id" = SubCommitteeId, description = "Sub committee database id"),
        ("public_key_fingerprint" = String, description = "Lowercase hex SHA-256 of the certificate's SubjectPublicKeyInfo DER, as in the list response"),
    ),
)]
pub async fn sub_committee_certificate_delete(
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path((election_id, sub_committee_id, public_key_fingerprint)): Path<(
        ElectionId,
        SubCommitteeId,
        String,
    )>,
) -> Result<StatusCode, APIError> {
    let mut tx = pool.begin_immediate().await?;
    election_repo::get(&mut tx, election_id).await?;
    delete_sub_committee_certificate(
        &mut tx,
        &audit_service,
        election_id,
        sub_committee_id,
        &public_key_fingerprint,
    )
    .await?;
    tx.commit().await?;
    Ok(StatusCode::NO_CONTENT)
}

#[cfg(test)]
mod tests {
    use std::assert_matches;

    use http_body_util::BodyExt;
    use serde_json::json;
    use test_log::test;

    use super::*;
    use crate::{
        domain::election::{ElectionCategory, tests::election_fixture},
        infra::audit_log::{AuditEventLevel, assert_last_event, list_event_names},
        repository::user_repo::{User, UserId},
    };

    // Test-only GSB certificates matching the GSB of election 9 (`election_9_csb.sql`).
    //
    // ```sh
    // cargo run -p eml_signature --example create -- GR2026_TestLocation 9101 "Test Location" 2026-10-01 2026-03-18
    // cargo run -p eml_signature --example create -- GR2026_TestLocation 9101 "Test Location" 2026-01-01 2026-03-18
    // cargo run -p eml_signature --example create -- GR2026_TestLocation 9999 "Unknown Location" 2026-10-01 2026-03-18
    // ```

    /// Abacus certificate for `GR2026_TestLocation`, GSB 9101.
    const PSB9101: &str = include_str!("../tests/certificates/psb9101.crt");
    /// Certificate for another key of GSB 9101, expired on 2026-06-18.
    const PSB9101_EXPIRED: &str = include_str!("../tests/certificates/psb9101_expired.crt");
    /// Certificate for GSB 9999, which election 9 doesn't have.
    const PSB9999: &str = include_str!("../tests/certificates/psb9999.crt");
    const OSV2020_NIEUWSTRAND: &str =
        include_str!("../../eml_signature/tests/fixtures/osv2020_nieuwstrand.crt");

    async fn add_certificate(
        pool: SqlitePool,
        pem: &str,
    ) -> Result<(StatusCode, Json<AddSubCommitteeCertificateResponse>), APIError> {
        let user = User::test_user(Role::Administrator, UserId::from(1));
        sub_committee_certificate_add(
            State(pool),
            AuditService::new(Some(user), None),
            Path(ElectionId::from(9)),
            Json(AddSubCommitteeCertificateRequest {
                data: pem.to_string(),
            }),
        )
        .await
    }

    async fn add_certificate_error(pool: SqlitePool, pem: &str) -> (StatusCode, ErrorReference) {
        let response = add_certificate(pool, pem)
            .await
            .expect_err("should fail")
            .into_response();
        let status = response.status();
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let error: ErrorResponse = serde_json::from_slice(&body).unwrap();
        (status, error.reference)
    }

    async fn stored_certificates(pool: SqlitePool) -> Vec<Certificate> {
        let Json(mut sub_committees) =
            sub_committee_certificates(State(pool), Path(ElectionId::from(9)))
                .await
                .expect("should be ok");
        assert_eq!(sub_committees.len(), 1);
        sub_committees.remove(0).certificates
    }

    /// Fingerprint of the certificate in the `sub_committee_certificate` fixture
    const FIXTURE_FINGERPRINT: &str =
        "bd0bfa8699f1317b08593ea5da84f28b53cae1f2730611bf69e143e0ba132c34";

    async fn delete_certificate(
        pool: SqlitePool,
        election_id: u32,
        sub_committee_id: u32,
        fingerprint: &str,
    ) -> Result<StatusCode, APIError> {
        let user = User::test_user(Role::Administrator, UserId::from(1));
        sub_committee_certificate_delete(
            State(pool),
            AuditService::new(Some(user), None),
            Path((
                election_id.into(),
                sub_committee_id.into(),
                fingerprint.into(),
            )),
        )
        .await
    }

    async fn delete_certificate_error(
        pool: SqlitePool,
        election_id: u32,
        sub_committee_id: u32,
        fingerprint: &str,
    ) -> (StatusCode, ErrorReference) {
        let response = delete_certificate(pool, election_id, sub_committee_id, fingerprint)
            .await
            .expect_err("should fail")
            .into_response();
        let status = response.status();
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let error: ErrorResponse = serde_json::from_slice(&body).unwrap();
        (status, error.reference)
    }

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

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_9_csb"))))]
    async fn test_sub_committee_no_certificates(pool: SqlitePool) {
        let election_id = ElectionId::from(9);
        let result = sub_committee_certificates(State(pool), Path(election_id)).await;

        let sub_committees = result.expect("should be ok").0;
        assert_eq!(sub_committees.len(), 1);
        assert_eq!(sub_committees[0].certificates.len(), 0);
    }

    #[test(sqlx::test(fixtures(
        path = "../../fixtures",
        scripts("election_9_csb", "sub_committee_certificate")
    )))]
    async fn test_sub_committee_certificates(pool: SqlitePool) {
        let election_id = ElectionId::from(9);
        let result = sub_committee_certificates(State(pool), Path(election_id)).await;

        let sub_committees = result.expect("should be ok").0;
        assert_eq!(sub_committees.len(), 1);

        let sub_committee = &sub_committees[0];
        assert_eq!(sub_committee.certificates.len(), 1);
        assert_eq!(sub_committee.authority_name, "Test Location");
        assert_eq!(sub_committee.certificates.len(), 1);

        let certificate = &sub_committees[0].certificates[0];
        assert_eq!(certificate.common_name, "Test Location");
        assert!(
            certificate
                .public_key
                .starts_with("-----BEGIN PUBLIC KEY-----\n")
        );
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_9_csb"))))]
    async fn test_sub_committee_certificate_add(pool: SqlitePool) {
        let (status, Json(response)) = add_certificate(pool.clone(), PSB9101)
            .await
            .expect("should be ok");
        assert_eq!(status, StatusCode::CREATED);
        assert_eq!(response.sub_committee_id, SubCommitteeId::from(911));
        assert_eq!(response.authority_name, "Test Location");

        let certificate = &response.certificate;
        assert_eq!(certificate.election_identifier, "GR2026_TestLocation");
        assert_eq!(certificate.organizational_unit, "Abacus 1.1.0");
        assert_eq!(certificate.common_name, "Gemeente Test Location");
        assert_eq!(certificate.signature_algorithm, "RSA 4096-bit");
        assert!(
            certificate
                .public_key
                .starts_with("-----BEGIN PUBLIC KEY-----\n")
        );

        assert_eq!(
            stored_certificates(pool.clone()).await,
            vec![certificate.clone()]
        );

        let mut conn = pool.acquire().await.unwrap();
        assert_last_event(
            &mut conn,
            AuditEventType::SubCommitteeCertificateAdded,
            AuditEventLevel::Success,
            json!({
                "election_id": 9,
                "sub_committee_id": 911,
                "authority_id": "9101",
                "organizational_unit": "Abacus 1.1.0",
                "common_name": "Gemeente Test Location",
                "not_before": certificate.not_before,
                "not_after": certificate.not_after,
                "public_key_fingerprint": certificate.public_key_fingerprint,
            }),
        )
        .await;
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_9_csb"))))]
    async fn test_sub_committee_certificate_add_second_key(pool: SqlitePool) {
        assert!(add_certificate(pool.clone(), PSB9101).await.is_ok());

        // Another key for the same GSB is added, even though its certificate has expired
        let (status, Json(response)) = add_certificate(pool.clone(), PSB9101_EXPIRED)
            .await
            .expect("should be ok");
        assert_eq!(status, StatusCode::CREATED);
        assert!(response.expired);

        assert_eq!(stored_certificates(pool).await.len(), 2);
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_9_csb"))))]
    async fn test_sub_committee_certificate_add_duplicate(pool: SqlitePool) {
        assert!(add_certificate(pool.clone(), PSB9101).await.is_ok());

        assert_eq!(
            add_certificate_error(pool.clone(), PSB9101).await,
            (
                StatusCode::CONFLICT,
                ErrorReference::CertificateAlreadyAdded
            )
        );
        assert_eq!(stored_certificates(pool).await.len(), 1);
    }

    #[test(sqlx::test(fixtures(
        path = "../../fixtures",
        scripts("election_9_csb", "sub_committee_certificate")
    )))]
    async fn test_sub_committee_certificate_add_to_existing(pool: SqlitePool) {
        assert!(add_certificate(pool.clone(), PSB9101).await.is_ok());
        assert_eq!(stored_certificates(pool).await.len(), 2);
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_9_csb"))))]
    async fn test_sub_committee_certificate_add_rejected(pool: SqlitePool) {
        // A bare public key is not a certificate
        let public_key = eml_signature::Certificate::from_pem(PSB9101.as_bytes())
            .unwrap()
            .public_key()
            .to_pem();

        for (pem, status, reference) in [
            (
                "not a certificate",
                StatusCode::BAD_REQUEST,
                ErrorReference::InvalidCertificate,
            ),
            (
                public_key.as_str(),
                StatusCode::BAD_REQUEST,
                ErrorReference::InvalidCertificate,
            ),
            (
                OSV2020_NIEUWSTRAND,
                StatusCode::UNPROCESSABLE_ENTITY,
                ErrorReference::CertificateWrongElection,
            ),
            (
                PSB9999,
                StatusCode::UNPROCESSABLE_ENTITY,
                ErrorReference::CertificateUnknownSubCommittee,
            ),
        ] {
            assert_eq!(
                add_certificate_error(pool.clone(), pem).await,
                (status, reference)
            );
        }
        assert!(stored_certificates(pool).await.is_empty());
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_9_csb"))))]
    async fn test_sub_committee_certificate_add_completed_session(pool: SqlitePool) {
        sqlx::query("UPDATE committee_sessions SET status = 'completed' WHERE id = 901")
            .execute(&pool)
            .await
            .unwrap();

        assert_eq!(
            add_certificate_error(pool.clone(), PSB9101).await,
            (
                StatusCode::CONFLICT,
                ErrorReference::InvalidCommitteeSessionStatus
            )
        );
        assert!(stored_certificates(pool.clone()).await.is_empty());

        let mut conn = pool.acquire().await.unwrap();
        assert!(
            !list_event_names(&mut conn)
                .await
                .unwrap()
                .contains(&"SubCommitteeCertificateAdded".to_string())
        );
    }

    #[test(sqlx::test(fixtures(
        path = "../../fixtures",
        scripts("election_9_csb", "sub_committee_certificate")
    )))]
    async fn test_sub_committee_certificate_delete(pool: SqlitePool) {
        let remaining = stored_certificates(pool.clone()).await;
        let (_, Json(added)) = add_certificate(pool.clone(), PSB9101).await.unwrap();
        let removed = added.certificate;

        assert_eq!(
            delete_certificate(pool.clone(), 9, 911, &removed.public_key_fingerprint)
                .await
                .unwrap(),
            StatusCode::NO_CONTENT
        );
        assert_eq!(stored_certificates(pool.clone()).await, remaining);
        assert_last_event(
            &mut pool.acquire().await.unwrap(),
            AuditEventType::SubCommitteeCertificateDeleted,
            AuditEventLevel::Success,
            json!({
                "election_id": 9,
                "sub_committee_id": 911,
                "authority_id": "9101",
                "organizational_unit": removed.organizational_unit,
                "common_name": removed.common_name,
                "not_before": removed.not_before,
                "not_after": removed.not_after,
                "public_key": removed.public_key,
                "public_key_fingerprint": removed.public_key_fingerprint,
            }),
        )
        .await;
    }

    #[test(sqlx::test(fixtures(
        path = "../../fixtures",
        scripts(
            "election_9_csb",
            "sub_committee_certificate",
            "election_8_csb_with_results"
        )
    )))]
    async fn test_sub_committee_certificate_delete_not_found(pool: SqlitePool) {
        let before = stored_certificates(pool.clone()).await;
        for (election_id, sub_committee_id, fingerprint) in [
            (999, 911, FIXTURE_FINGERPRINT), // missing election
            (9, 999, FIXTURE_FINGERPRINT),   // missing sub committee
            (8, 911, FIXTURE_FINGERPRINT),   // sub committee belongs to another election
            (9, 911, "unknown"),             // missing certificate
        ] {
            assert_eq!(
                delete_certificate_error(pool.clone(), election_id, sub_committee_id, fingerprint)
                    .await,
                (StatusCode::NOT_FOUND, ErrorReference::EntryNotFound)
            );
        }
        assert_eq!(stored_certificates(pool).await, before);
    }

    #[test(sqlx::test(fixtures(
        path = "../../fixtures",
        scripts("election_9_csb", "sub_committee_certificate")
    )))]
    async fn test_sub_committee_certificate_delete_previous_session(pool: SqlitePool) {
        sqlx::query("INSERT INTO committee_sessions (id, number, election_id, status, location) VALUES (902, 2, 9, 'data_entry', '')")
            .execute(&pool).await.unwrap();
        let before = sub_committee_repo::list(&mut pool.acquire().await.unwrap(), 901.into())
            .await
            .unwrap();
        assert_eq!(
            delete_certificate_error(pool.clone(), 9, 911, FIXTURE_FINGERPRINT).await,
            (StatusCode::NOT_FOUND, ErrorReference::EntryNotFound)
        );
        let mut conn = pool.acquire().await.unwrap();
        assert_eq!(
            sub_committee_repo::list(&mut conn, 901.into())
                .await
                .unwrap(),
            before
        );
        assert!(list_event_names(&mut conn).await.unwrap().is_empty());
    }

    #[test(sqlx::test(fixtures(
        path = "../../fixtures",
        scripts("election_9_csb", "sub_committee_certificate")
    )))]
    async fn test_sub_committee_certificate_delete_completed_session(pool: SqlitePool) {
        sqlx::query("UPDATE committee_sessions SET status = 'completed' WHERE id = 901")
            .execute(&pool)
            .await
            .unwrap();
        assert_eq!(
            delete_certificate_error(pool.clone(), 9, 911, FIXTURE_FINGERPRINT).await,
            (
                StatusCode::CONFLICT,
                ErrorReference::InvalidCommitteeSessionStatus
            )
        );
        assert_eq!(stored_certificates(pool.clone()).await.len(), 1);

        let mut conn = pool.acquire().await.unwrap();
        assert!(list_event_names(&mut conn).await.unwrap().is_empty());
    }
}
