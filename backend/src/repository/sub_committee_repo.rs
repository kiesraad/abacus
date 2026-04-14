use sqlx::{SqliteConnection, query, query_as, types::Json};

use crate::{
    domain::{
        committee_session::CommitteeSessionId,
        data_entry::{DataEntryId, DataEntrySource, DataEntryStatus, DataEntryStatusWithSource},
        election::CommitteeCategory,
        sub_committee::{
            SubCommittee, SubCommitteeFirstSession, SubCommitteeId, SubCommitteeNumber,
        },
    },
    repository::common::{SubCommitteeRow, SubCommitteeRowLike},
};

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
        .map(SubCommitteeRow::into_sub_committee_first_session)
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
    .map(SubCommitteeRow::into_sub_committee_first_session)
}

/// List all sub committees for a first committee session with their data entry status.
pub async fn list_first_session_with_status(
    conn: &mut SqliteConnection,
    committee_session_id: CommitteeSessionId,
) -> Result<Vec<DataEntryStatusWithSource>, sqlx::Error> {
    query!(
        r#"
        SELECT
            de.id AS "data_entry_id: DataEntryId",
            sc.id AS "id: SubCommitteeId",
            sc.number AS "number: SubCommitteeNumber",
            sc.name,
            sc.category AS "category: CommitteeCategory",
            de.state AS "state!: Json<DataEntryStatus>"
        FROM sub_committees AS sc
        JOIN data_entries AS de ON de.id = sc.data_entry_id
        WHERE sc.committee_session_id = $1
        "#,
        committee_session_id
    )
    .map(|row| DataEntryStatusWithSource {
        data_entry_id: row.data_entry_id,
        source: DataEntrySource::SubCommittee(SubCommitteeFirstSession {
            committee_session_id,
            data_entry_id: row.data_entry_id,
            sub_committee: SubCommittee {
                id: row.id,
                number: row.number,
                name: row.name,
                category: row.category,
            },
        }),
        status: row.state.0,
    })
    .fetch_all(conn)
    .await
}
