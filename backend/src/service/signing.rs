use chrono::Utc;
use eml_signature::{CertificateSubject, Committee, EmlSignatureError, SigningKeyPair};
use serde::Serialize;
use sqlx::SqliteConnection;

use crate::{
    APIError,
    domain::election::{CommitteeCategory, ElectionId, ElectionWithPoliticalGroups},
    error::ErrorReference,
    infra::audit_log::{AsAuditEvent, AuditEventLevel, AuditEventType, AuditService},
    repository::signing_keypair_repo,
};

#[derive(Debug)]
pub enum SigningServiceError {
    DatabaseError(sqlx::Error),
    JoinError(tokio::task::JoinError),
    InvalidElectionError(String),
    EmlSignatureError(String),
}

impl From<sqlx::Error> for SigningServiceError {
    fn from(err: sqlx::Error) -> Self {
        Self::DatabaseError(err)
    }
}

impl From<tokio::task::JoinError> for SigningServiceError {
    fn from(err: tokio::task::JoinError) -> Self {
        Self::JoinError(err)
    }
}

impl From<EmlSignatureError> for SigningServiceError {
    fn from(err: EmlSignatureError) -> Self {
        Self::EmlSignatureError(err.to_string())
    }
}

#[derive(Serialize)]
struct SigningKeypairCreatedAuditData {
    election_id: ElectionId,
    election_name: String,
}

impl From<&ElectionWithPoliticalGroups> for SigningKeypairCreatedAuditData {
    fn from(election: &ElectionWithPoliticalGroups) -> Self {
        Self {
            election_id: election.id,
            election_name: election.name.clone(),
        }
    }
}

impl AsAuditEvent for SigningKeypairCreatedAuditData {
    const EVENT_TYPE: AuditEventType = AuditEventType::SigningKeypairCreated;
    const EVENT_LEVEL: AuditEventLevel = AuditEventLevel::Success;
}

fn election_with_signing(election: &ElectionWithPoliticalGroups) -> bool {
    match election.committee_category {
        CommitteeCategory::CSB => false,
        CommitteeCategory::GSB => true,
    }
}

pub async fn get_show_reminder(
    conn: &mut SqliteConnection,
    election: &ElectionWithPoliticalGroups,
) -> Result<Option<bool>, sqlx::Error> {
    if !election_with_signing(election) {
        return Ok(None);
    }

    signing_keypair_repo::get_show_reminder(conn, election.id)
        .await
        .map(|show_reminder| show_reminder.or(Some(true)))
}

pub async fn get_election_certificate(
    conn: &mut SqliteConnection,
    audit_service: &AuditService,
    election: &ElectionWithPoliticalGroups,
) -> Result<String, APIError> {
    if !election_with_signing(election) {
        return Err(APIError::NotFound(
            "No certificate for this election".into(),
            ErrorReference::EntryNotFound,
        ));
    }

    if let Some(certificate) = signing_keypair_repo::get_certificate(conn, election.id).await? {
        return Ok(certificate);
    }

    let keypair = generate_keypair(election).await?;
    let certificate = keypair.certificate().to_pem();
    let private_key = keypair.private_key_der().to_owned();

    signing_keypair_repo::create(conn, election.id, certificate.clone(), private_key).await?;

    audit_service
        .log(conn, &SigningKeypairCreatedAuditData::from(election), None)
        .await?;

    Ok(certificate)
}

async fn generate_keypair(
    election: &ElectionWithPoliticalGroups,
) -> Result<SigningKeyPair, SigningServiceError> {
    let committee = match election.committee_category {
        CommitteeCategory::GSB => Committee::Gsb {
            authority_id: election.authority_id.clone(),
            authority_name: election.authority_name.clone(),
        },
        CommitteeCategory::CSB => Err(SigningServiceError::InvalidElectionError(format!(
            "Cannot generate keypair for {}",
            election.committee_category
        )))?,
    };

    let subject = CertificateSubject::new(
        election.election_id.clone(),
        env!("ABACUS_GIT_VERSION"),
        committee,
    );

    let valid_from = Utc::now().date_naive();
    let election_date = election.election_date;

    tokio::task::spawn_blocking(move || {
        SigningKeyPair::generate(&subject, valid_from, election_date).map_err(Into::into)
    })
    .await?
}

#[cfg(test)]
mod tests {
    use std::assert_matches;

    use serde_json::json;
    use sqlx::SqlitePool;
    use test_log::test;

    use super::*;
    use crate::{
        domain::{
            election::{ElectionCategory, tests::election_fixture},
            role::Role,
        },
        infra::audit_log::{assert_last_event, list_all},
        repository::user_repo::{User, UserId},
    };

    #[test(sqlx::test(fixtures(
        path = "../../fixtures",
        scripts("election_1", "signing_keypair")
    )))]
    async fn get_show_reminder_certificate_generated(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let election = election_fixture(ElectionCategory::Municipal, CommitteeCategory::GSB, &[]);

        let show_reminder = get_show_reminder(&mut conn, &election).await.unwrap();
        assert_eq!(show_reminder, Some(true));

        signing_keypair_repo::set_show_reminder(&mut conn, election.id, false)
            .await
            .expect("should succeed");

        let show_reminder = get_show_reminder(&mut conn, &election).await.unwrap();
        assert_eq!(show_reminder, Some(false));
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_1"))))]
    async fn get_show_reminder_certificate_not_generated_yet(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let election = election_fixture(ElectionCategory::Municipal, CommitteeCategory::GSB, &[]);

        let show_reminder = get_show_reminder(&mut conn, &election).await.unwrap();
        assert_eq!(show_reminder, Some(true));
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_1"))))]
    async fn get_show_reminder_certificate_wrong_election(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let election = election_fixture(ElectionCategory::Municipal, CommitteeCategory::CSB, &[]);

        let show_reminder = get_show_reminder(&mut conn, &election).await.unwrap();
        assert_eq!(show_reminder, None);
    }

    fn get_audit_service() -> AuditService {
        let user = User::test_user(Role::Administrator, UserId::from(1));
        AuditService::new(Some(user), None)
    }

    #[test(sqlx::test(fixtures(
        path = "../../fixtures",
        scripts("election_1", "signing_keypair")
    )))]
    async fn get_election_certificate_existing(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();

        let audit_service = get_audit_service();

        let election = election_fixture(ElectionCategory::Municipal, CommitteeCategory::GSB, &[]);

        let cert = get_election_certificate(&mut conn, &audit_service, &election)
            .await
            .expect("should return certificate");

        assert!(cert.starts_with("-----BEGIN CERTIFICATE-----\n"));

        let audit_events = list_all(&mut conn)
            .await
            .expect("should be able to list audit events");

        assert_eq!(audit_events.len(), 0);
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_1"))))]
    async fn get_election_certificate_generated(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();

        let audit_service = get_audit_service();

        let election = election_fixture(ElectionCategory::Municipal, CommitteeCategory::GSB, &[]);

        let cert = get_election_certificate(&mut conn, &audit_service, &election)
            .await
            .expect("should return certificate");

        assert!(cert.starts_with("-----BEGIN CERTIFICATE-----\n"));

        assert_last_event(
            &mut conn,
            AuditEventType::SigningKeypairCreated,
            AuditEventLevel::Success,
            json!({"election_id": &election.id,"election_name": &election.name}),
        )
        .await;
    }

    #[test(sqlx::test)]
    async fn get_election_certificate_wrong_election(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();

        let audit_service = get_audit_service();

        let election = election_fixture(ElectionCategory::Municipal, CommitteeCategory::CSB, &[]);

        let err = get_election_certificate(&mut conn, &audit_service, &election)
            .await
            .expect_err("should return error");

        assert_matches!(err, APIError::NotFound(_, _));
    }
}
