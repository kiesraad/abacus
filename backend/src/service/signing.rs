use chrono::{DateTime, Utc};
use eml_signature::{
    Certificate, CertificateSubject, Committee, EmlSignatureError, RSA_KEY_BITS, SigningKeyPair,
};
use serde::Serialize;
use sqlx::SqliteConnection;

use crate::{
    APIError,
    domain::{
        committee_session::CommitteeSessionError,
        committee_session_status::CommitteeSessionStatus,
        election::{CommitteeCategory, ElectionId, ElectionWithPoliticalGroups},
        sub_committee::{
            AddCertificateError, Certificate as DomainCertificate, DeleteCertificateError,
            SubCommittee, SubCommitteeId,
        },
    },
    error::ErrorReference,
    infra::audit_log::{AsAuditEvent, AuditEventLevel, AuditEventType, AuditService},
    repository::{committee_session_repo, signing_keypair_repo, sub_committee_repo},
};

/// Signature algorithm of all certificates, which use an RSA key of [`RSA_KEY_BITS`] bits
pub fn signature_algorithm() -> String {
    format!("RSA {RSA_KEY_BITS}-bit")
}

impl From<&Certificate> for DomainCertificate {
    fn from(certificate: &Certificate) -> Self {
        let subject = certificate.subject();
        Self {
            election_identifier: subject.election_identifier.clone(),
            organizational_unit: subject.organizational_unit.clone(),
            common_name: subject.common_name.clone(),
            not_before: certificate.not_before(),
            not_after: certificate.not_after(),
            signature_algorithm: signature_algorithm(),
            public_key: certificate.public_key().to_pem(),
            public_key_fingerprint: certificate.public_key().sha256_fingerprint(),
        }
    }
}

/// Reasons a certificate cannot be added to a sub committee.
#[derive(Debug)]
pub enum SubCommitteeCertificateError {
    /// The file is not a valid certificate.
    InvalidCertificate(EmlSignatureError),
    /// The certificate is for another election.
    WrongElection,
    /// The certificate is for a sub committee that is not part of this election.
    UnknownSubCommittee,
    /// The public key in the certificate was already added to the sub committee.
    AlreadyAdded,
}

impl From<AddCertificateError> for SubCommitteeCertificateError {
    fn from(err: AddCertificateError) -> Self {
        match err {
            AddCertificateError::AlreadyAdded => Self::AlreadyAdded,
        }
    }
}

#[derive(Serialize)]
struct SubCommitteeCertificateAddedAuditData {
    election_id: ElectionId,
    sub_committee_id: SubCommitteeId,
    authority_id: String,
    organizational_unit: String,
    common_name: String,
    not_before: DateTime<Utc>,
    not_after: DateTime<Utc>,
    public_key_fingerprint: String,
}

impl AsAuditEvent for SubCommitteeCertificateAddedAuditData {
    const EVENT_TYPE: AuditEventType = AuditEventType::SubCommitteeCertificateAdded;
    const EVENT_LEVEL: AuditEventLevel = AuditEventLevel::Success;
}

/// Add a certificate to the GSB sub committee it belongs to.
///
/// The sub committee is found by the `UID` in the certificate subject. A certificate whose public key was already
/// added to that sub committee is rejected, even if the other certificate fields differ. An expired certificate is
/// accepted.
pub async fn add_sub_committee_certificate(
    conn: &mut SqliteConnection,
    audit_service: &AuditService,
    election: &ElectionWithPoliticalGroups,
    certificate: &eml_signature::Certificate,
) -> Result<(SubCommittee, DomainCertificate), APIError> {
    let committee_session =
        committee_session_repo::get_election_committee_session(conn, election.id).await?;
    if committee_session.status == CommitteeSessionStatus::Completed {
        return Err(CommitteeSessionError::InvalidCommitteeSessionStatus.into());
    }

    let subject = certificate.subject();
    if subject.election_identifier != election.election_id {
        return Err(SubCommitteeCertificateError::WrongElection.into());
    }

    let Committee::Gsb { authority_id, .. } = &subject.committee;
    let mut sub_committee = sub_committee_repo::list(conn, committee_session.id)
        .await?
        .into_iter()
        .find(|sub_committee| sub_committee.authority_id == *authority_id)
        .ok_or(SubCommitteeCertificateError::UnknownSubCommittee)?;

    let new_certificate = sub_committee
        .add_certificate(DomainCertificate::from(certificate))
        .map_err(SubCommitteeCertificateError::from)?;
    sub_committee_repo::update_certificates(conn, sub_committee.id, &sub_committee.certificates)
        .await?;

    audit_service
        .log(
            conn,
            &SubCommitteeCertificateAddedAuditData {
                election_id: election.id,
                sub_committee_id: sub_committee.id,
                authority_id: sub_committee.authority_id.clone(),
                organizational_unit: new_certificate.organizational_unit.clone(),
                common_name: new_certificate.common_name.clone(),
                not_before: new_certificate.not_before,
                not_after: new_certificate.not_after,
                public_key_fingerprint: new_certificate.public_key_fingerprint.clone(),
            },
            None,
        )
        .await?;

    Ok((sub_committee, new_certificate))
}

#[derive(Serialize)]
struct SubCommitteeCertificateDeletedAuditData {
    election_id: ElectionId,
    sub_committee_id: SubCommitteeId,
    authority_id: String,
    organizational_unit: String,
    common_name: String,
    not_before: DateTime<Utc>,
    not_after: DateTime<Utc>,
    public_key_fingerprint: String,
}

impl AsAuditEvent for SubCommitteeCertificateDeletedAuditData {
    const EVENT_TYPE: AuditEventType = AuditEventType::SubCommitteeCertificateDeleted;
    const EVENT_LEVEL: AuditEventLevel = AuditEventLevel::Success;
}

/// Delete the certificate with the given public key fingerprint from a sub committee.
pub async fn delete_sub_committee_certificate(
    conn: &mut SqliteConnection,
    audit_service: &AuditService,
    election_id: ElectionId,
    sub_committee_id: SubCommitteeId,
    public_key_fingerprint: &str,
) -> Result<(), APIError> {
    let committee_session =
        committee_session_repo::get_election_committee_session(conn, election_id).await?;
    if committee_session.status == CommitteeSessionStatus::Completed {
        return Err(CommitteeSessionError::InvalidCommitteeSessionStatus.into());
    }

    let mut sub_committee = sub_committee_repo::list(conn, committee_session.id)
        .await?
        .into_iter()
        .find(|sub_committee| sub_committee.id == sub_committee_id)
        .ok_or_else(|| {
            APIError::NotFound(
                "Sub committee not found".into(),
                ErrorReference::EntryNotFound,
            )
        })?;

    let certificate = sub_committee
        .delete_certificate(public_key_fingerprint)
        .map_err(|err| match err {
            DeleteCertificateError::NotFound => APIError::NotFound(
                "Certificate not found".into(),
                ErrorReference::EntryNotFound,
            ),
        })?;

    sub_committee_repo::update_certificates(conn, sub_committee.id, &sub_committee.certificates)
        .await?;
    audit_service
        .log(
            conn,
            &SubCommitteeCertificateDeletedAuditData {
                election_id,
                sub_committee_id,
                authority_id: sub_committee.authority_id,
                organizational_unit: certificate.organizational_unit,
                common_name: certificate.common_name,
                not_before: certificate.not_before,
                not_after: certificate.not_after,
                public_key_fingerprint: certificate.public_key_fingerprint,
            },
            None,
        )
        .await?;
    Ok(())
}

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

/// Get the certificate of an election, generating and storing its keypair if it does not exist yet
pub async fn get_election_certificate(
    conn: &mut SqliteConnection,
    audit_service: &AuditService,
    election: &ElectionWithPoliticalGroups,
) -> Result<Certificate, APIError> {
    ensure_supports_signing(election)?;

    match signing_keypair_repo::get_certificate(conn, election.id).await? {
        Some(certificate) => Certificate::from_pem(certificate.as_bytes())
            .map_err(|e| APIError::DataIntegrityError(e.to_string())),
        None => {
            let keypair = create_keypair(conn, audit_service, election).await?;
            Ok(keypair.certificate().clone())
        }
    }
}

/// Get the signing keypair of an election, generating and storing it if it does not exist yet
pub async fn get_signing_keypair(
    conn: &mut SqliteConnection,
    audit_service: &AuditService,
    election: &ElectionWithPoliticalGroups,
) -> Result<SigningKeyPair, APIError> {
    ensure_supports_signing(election)?;

    match signing_keypair_repo::get_keypair(conn, election.id).await? {
        Some((certificate, private_key)) => Certificate::from_pem(certificate.as_bytes())
            .and_then(|certificate| SigningKeyPair::new(private_key, certificate))
            .map_err(|e| APIError::DataIntegrityError(e.to_string())),
        None => create_keypair(conn, audit_service, election).await,
    }
}

fn ensure_supports_signing(election: &ElectionWithPoliticalGroups) -> Result<(), APIError> {
    if election.committee_category.supports_signing() {
        Ok(())
    } else {
        Err(APIError::NotFound(
            "No certificate for this election".into(),
            ErrorReference::EntryNotFound,
        ))
    }
}

async fn create_keypair(
    conn: &mut SqliteConnection,
    audit_service: &AuditService,
    election: &ElectionWithPoliticalGroups,
) -> Result<SigningKeyPair, APIError> {
    let keypair = generate_keypair(election).await?;
    let certificate = keypair.certificate().to_pem();
    let private_key = keypair.private_key_der().to_owned();

    signing_keypair_repo::create(conn, election.id, certificate, private_key).await?;

    audit_service
        .log(conn, &SigningKeypairCreatedAuditData::from(election), None)
        .await?;

    Ok(keypair)
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
    use zeroize::Zeroizing;

    use super::*;
    use crate::{
        domain::{
            election::{ElectionCategory, tests::election_fixture},
            role::Role,
        },
        infra::audit_log::{assert_last_event, list_all},
        repository::user_repo::{User, UserId},
    };

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

        assert!(cert.to_pem().starts_with("-----BEGIN CERTIFICATE-----\n"));

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

        assert!(cert.to_pem().starts_with("-----BEGIN CERTIFICATE-----\n"));

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

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_1"))))]
    async fn get_signing_keypair_generated_once(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();

        let audit_service = get_audit_service();

        let election = election_fixture(ElectionCategory::Municipal, CommitteeCategory::GSB, &[]);

        let keypair = get_signing_keypair(&mut conn, &audit_service, &election)
            .await
            .expect("should generate keypair");

        // The stored keypair is reused, not regenerated
        let certificate = get_election_certificate(&mut conn, &audit_service, &election)
            .await
            .expect("should return certificate");

        assert_eq!(&certificate, keypair.certificate());

        let audit_events = list_all(&mut conn)
            .await
            .expect("should be able to list audit events");

        assert_eq!(audit_events.len(), 1);
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_1"))))]
    async fn get_election_certificate_invalid_stored_certificate(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();

        let audit_service = get_audit_service();

        let election = election_fixture(ElectionCategory::Municipal, CommitteeCategory::GSB, &[]);

        signing_keypair_repo::create(
            &mut conn,
            election.id,
            String::from("not a certificate"),
            Zeroizing::new(Vec::from("not a key")),
        )
        .await
        .unwrap();

        let err = get_election_certificate(&mut conn, &audit_service, &election)
            .await
            .expect_err("should return error");

        assert_matches!(err, APIError::DataIntegrityError(_));
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_1"))))]
    async fn get_signing_keypair_invalid_stored_keypair(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();

        let audit_service = get_audit_service();

        let election = election_fixture(ElectionCategory::Municipal, CommitteeCategory::GSB, &[]);

        signing_keypair_repo::create(
            &mut conn,
            election.id,
            String::from("not a certificate"),
            Zeroizing::new(Vec::from("not a key")),
        )
        .await
        .unwrap();

        let err = get_signing_keypair(&mut conn, &audit_service, &election)
            .await
            .err()
            .expect("should return error");

        assert_matches!(err, APIError::DataIntegrityError(_));
    }
}
