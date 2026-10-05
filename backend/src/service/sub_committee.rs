use chrono::{DateTime, Utc};
use eml_signature::Committee;
use serde::Serialize;
use sqlx::{Connection, SqliteConnection};

use crate::{
    APIError,
    domain::{
        committee_session::{CommitteeSessionError, CommitteeSessionId},
        committee_session_status::CommitteeSessionStatus,
        election::{ElectionId, ElectionWithPoliticalGroups},
        sub_committee::{
            Certificate, NewSubCommittee, SubCommittee, SubCommitteeCertificateError,
            SubCommitteeFirstSession, SubCommitteeId,
        },
    },
    infra::audit_log::{AsAuditEvent, AuditEventLevel, AuditEventType, AuditService},
    repository::{committee_session_repo, data_entry_repo, sub_committee_repo},
};

#[derive(Debug)]
pub enum SubCommitteeServiceError {
    DatabaseError(sqlx::Error),
}

impl From<sqlx::Error> for SubCommitteeServiceError {
    fn from(err: sqlx::Error) -> Self {
        Self::DatabaseError(err)
    }
}

pub async fn create(
    conn: &mut SqliteConnection,
    committee_session_id: CommitteeSessionId,
    subcommittee: NewSubCommittee,
) -> Result<SubCommitteeFirstSession, SubCommitteeServiceError> {
    let mut tx = conn.begin().await?;
    let data_entry = data_entry_repo::create_empty(&mut tx).await?;
    let sub_committee =
        sub_committee_repo::create(&mut tx, committee_session_id, data_entry.id, subcommittee)
            .await?;
    tx.commit().await?;
    Ok(sub_committee)
}

pub async fn list_for_first_session(
    conn: &mut SqliteConnection,
    committee_session_id: CommitteeSessionId,
) -> Result<Vec<SubCommitteeFirstSession>, SubCommitteeServiceError> {
    Ok(sub_committee_repo::list_first_session(conn, committee_session_id).await?)
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
pub async fn add_certificate(
    conn: &mut SqliteConnection,
    audit_service: &AuditService,
    election: &ElectionWithPoliticalGroups,
    certificate: &eml_signature::Certificate,
) -> Result<(SubCommittee, Certificate), APIError> {
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

    let new_certificate = sub_committee.add_certificate(certificate)?;
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
            },
            None,
        )
        .await?;

    Ok((sub_committee, new_certificate))
}

#[cfg(test)]
mod tests {
    use sqlx::SqlitePool;
    use test_log::test;

    use super::*;
    use crate::domain::election::CommitteeCategory;

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_8_csb_with_results"))))]
    async fn test_create_and_list(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let committee_session_id = CommitteeSessionId::from(801);
        let number = 42;
        let name = "Test GSB".to_string();

        // Create a subcommittee
        let created = create(
            &mut conn,
            committee_session_id,
            NewSubCommittee {
                number,
                name: name.clone(),
                category: CommitteeCategory::GSB,
                authority_id: format!("{:0>4}", number),
                authority_name: name,
            },
        )
        .await
        .unwrap();

        assert_eq!(created.number, 42);
        assert_eq!(created.name, "Test GSB");
        assert_eq!(created.committee_session_id, committee_session_id);
        assert_eq!(created.authority_id, "0042");
        assert_eq!(created.authority_name, "Test GSB");

        // List and verify
        let list = list_for_first_session(&mut conn, committee_session_id)
            .await
            .unwrap();

        assert_eq!(list.len(), 2);
        assert_eq!(list[1].id, created.id);
        assert_eq!(list[1].name, "Test GSB");
        assert_eq!(list[1].data_entry_id, created.data_entry_id);
    }
}
