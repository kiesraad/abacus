use sqlx::{Connection, SqliteConnection};

use crate::{
    domain::{
        committee_session::CommitteeSessionId, election::CommitteeCategory,
        sub_committee::SubCommitteeFirstSession,
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
    name: &str,
    category: CommitteeCategory,
) -> Result<SubCommitteeFirstSession, SubCommitteeServiceError> {
    let mut tx = conn.begin().await?;
    let data_entry = data_entry_repo::create_empty(&mut tx).await?;
    let sub_committee =
        sub_committee_repo::create(&mut tx, committee_session_id, data_entry.id, name, category)
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
