use sqlx::{FromRow, SqliteConnection, query_as};

use crate::domain::{
    committee_session::CommitteeSessionId,
    data_entry::DataEntryId,
    election::CommitteeCategory,
    sub_committee::{SubCommittee, SubCommitteeFirstSession, SubCommitteeId, SubCommitteeNumber},
};

/// Sub electoral committee database row, matching the SQL schema
#[derive(FromRow, Debug, Clone)]
struct SubCommitteeRow {
    id: SubCommitteeId,
    committee_session_id: CommitteeSessionId,
    data_entry_id: DataEntryId,
    number: SubCommitteeNumber,
    name: String,
    category: CommitteeCategory,
}

impl From<SubCommitteeRow> for SubCommitteeFirstSession {
    fn from(row: SubCommitteeRow) -> Self {
        let SubCommitteeRow {
            id,
            committee_session_id,
            data_entry_id,
            number,
            name,
            category,
        } = row;
        Self {
            committee_session_id,
            data_entry_id,
            sub_committee: SubCommittee {
                id,
                number,
                name,
                category,
            },
        }
    }
}

/// List all sub electoral committees for a committee session
async fn list(
    conn: &mut SqliteConnection,
    committee_session_id: CommitteeSessionId,
) -> Result<Vec<SubCommitteeRow>, sqlx::Error> {
    query_as!(
        SubCommitteeRow,
        r#"
        SELECT
            id AS "id: _",
            committee_session_id AS "committee_session_id: _",
            data_entry_id AS "data_entry_id!: _",
            number AS "number: SubCommitteeNumber",
            name,
            category AS "category: _"
        FROM sub_committees
        WHERE committee_session_id = $1
        "#,
        committee_session_id
    )
    .fetch_all(conn)
    .await
}

/// List all sub electoral committees for a first committee session
pub async fn list_first_session(
    conn: &mut SqliteConnection,
    committee_session_id: CommitteeSessionId,
) -> Result<Vec<SubCommitteeFirstSession>, sqlx::Error> {
    Ok(list(conn, committee_session_id)
        .await?
        .into_iter()
        .map(SubCommitteeFirstSession::from)
        .collect())
}

/// Create a single sub electoral committee for a committee session
pub async fn create(
    conn: &mut SqliteConnection,
    committee_session_id: CommitteeSessionId,
    data_entry_id: DataEntryId,
    number: SubCommitteeNumber,
    name: &str,
    category: CommitteeCategory,
) -> Result<SubCommitteeFirstSession, sqlx::Error> {
    query_as!(
        SubCommitteeRow,
        r#"
        INSERT INTO sub_committees (
            committee_session_id,
            data_entry_id,
            number,
            name,
            category
        ) VALUES (?, ?, ?, ?, ?)
        RETURNING
            id AS "id: _",
            committee_session_id AS "committee_session_id: _",
            data_entry_id AS "data_entry_id!: _",
            number AS "number: SubCommitteeNumber",
            name,
            category AS "category: _"
        "#,
        committee_session_id,
        data_entry_id,
        number,
        name,
        category,
    )
    .fetch_one(conn)
    .await
    .map(SubCommitteeFirstSession::from)
}
