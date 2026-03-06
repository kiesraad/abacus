use sqlx::{Connection, SqliteConnection};

use crate::{
    domain::{
        committee_session::CommitteeSessionId,
        election::CommitteeCategory,
        sub_committee::{SubCommitteeFirstSession, SubCommitteeNumber},
    },
    repository::{data_entry_repo, sub_committee_repo},
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
    number: SubCommitteeNumber,
    name: &str,
    category: CommitteeCategory,
) -> Result<SubCommitteeFirstSession, SubCommitteeServiceError> {
    let mut tx = conn.begin().await?;
    let data_entry = data_entry_repo::create_empty(&mut tx).await?;
    let sub_committee = sub_committee_repo::create(
        &mut tx,
        committee_session_id,
        data_entry.id,
        number,
        name,
        category,
    )
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

#[cfg(test)]
mod tests {
    use sqlx::SqlitePool;
    use test_log::test;

    use super::*;

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_8_csb"))))]
    async fn test_create_and_list(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let committee_session_id = CommitteeSessionId::from(8);

        // Create a sub committee
        let created = create(
            &mut conn,
            committee_session_id,
            42,
            "Test GSB",
            CommitteeCategory::GSB,
        )
        .await
        .unwrap();

        assert_eq!(created.sub_committee.number, 42);
        assert_eq!(created.sub_committee.name, "Test GSB");
        assert_eq!(created.sub_committee.category, CommitteeCategory::GSB);
        assert_eq!(created.committee_session_id, committee_session_id);

        // List and verify
        let list = list_for_first_session(&mut conn, committee_session_id)
            .await
            .unwrap();

        assert_eq!(list.len(), 1);
        assert_eq!(list[0].sub_committee.id, created.sub_committee.id);
        assert_eq!(list[0].sub_committee.name, "Test GSB");
        assert_eq!(list[0].sub_committee.category, CommitteeCategory::GSB);
        assert_eq!(list[0].data_entry_id, created.data_entry_id);
    }
}
