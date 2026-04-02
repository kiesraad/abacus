use chrono::NaiveDate;
use sqlx::{SqliteConnection, query_as, types::Json};

use crate::domain::election::{
    CommitteeCategory, Election, ElectionCategory, ElectionId, ElectionWithPoliticalGroups,
    NewElection, RegisteredPoliticalGroup, VoteCountingMethod,
};

pub async fn list(
    conn: &mut SqliteConnection,
    filter_committee_category: Option<CommitteeCategory>,
) -> Result<Vec<Election>, sqlx::Error> {
    let elections = query_as!(
        Election,
        r#"SELECT
            id as "id: ElectionId",
            name, 
            committee_category as "committee_category: _",
            counting_method as "counting_method: _",
            election_id, 
            location, 
            domain_id, 
            category as "category: _",
            number_of_seats as "number_of_seats: u32",
            number_of_voters as "number_of_voters: u32",
            election_date as "election_date: _",
            nomination_date as "nomination_date: _"
        FROM elections 
        WHERE ($1 IS NULL OR committee_category = $1)
        "#,
        filter_committee_category
    )
    .fetch_all(conn)
    .await?;
    Ok(elections)
}

/// ElectionRow
pub struct ElectionRow {
    pub id: ElectionId,
    pub name: String,
    pub committee_category: CommitteeCategory,
    pub counting_method: Option<VoteCountingMethod>,
    pub election_id: String,
    pub location: String,
    pub domain_id: String,
    pub category: ElectionCategory,
    pub number_of_seats: u32,
    pub number_of_voters: u32,
    pub election_date: NaiveDate,
    pub nomination_date: NaiveDate,
    pub political_groups: Json<Vec<RegisteredPoliticalGroup>>,
}

impl From<ElectionRow> for ElectionWithPoliticalGroups {
    fn from(row: ElectionRow) -> Self {
        Self {
            id: row.id,
            name: row.name,
            committee_category: row.committee_category,
            counting_method: row.counting_method,
            election_id: row.election_id,
            location: row.location,
            domain_id: row.domain_id,
            category: row.category,
            number_of_seats: row.number_of_seats,
            number_of_voters: row.number_of_voters,
            election_date: row.election_date,
            nomination_date: row.nomination_date,
            political_groups: row
                .political_groups
                .0
                .into_iter()
                .map(|pg| pg.into())
                .collect(),
        }
    }
}

pub async fn get(
    conn: &mut SqliteConnection,
    election_id: ElectionId,
) -> Result<ElectionWithPoliticalGroups, sqlx::Error> {
    let row = query_as!(
        ElectionRow,
        r#"
        SELECT
            id as "id: ElectionId",
            name,
            committee_category as "committee_category: CommitteeCategory",
            counting_method as "counting_method: VoteCountingMethod",
            election_id,
            location,
            domain_id,
            category as "category: ElectionCategory",
            number_of_seats as "number_of_seats: u32",
            number_of_voters as "number_of_voters: u32",
            election_date as "election_date: NaiveDate",
            nomination_date as "nomination_date: NaiveDate",
            political_groups as "political_groups: Json<Vec<RegisteredPoliticalGroup>>"
        FROM elections
        WHERE id = ?
        "#,
        election_id
    )
    .fetch_one(conn)
    .await?;
    Ok(row.into())
}

pub async fn create(
    conn: &mut SqliteConnection,
    election: NewElection,
) -> Result<ElectionWithPoliticalGroups, sqlx::Error> {
    let political_groups = Json(election.political_groups);
    let row = query_as!(
        ElectionRow,
        r#"
        INSERT INTO elections (
            name,
            committee_category,
            counting_method,
            election_id,
            location,
            domain_id,
            category,
            number_of_seats,
            number_of_voters,
            election_date,
            nomination_date,
            political_groups
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING
            id as "id: ElectionId",
            name,
            committee_category as "committee_category: CommitteeCategory",
            counting_method as "counting_method: VoteCountingMethod",
            election_id,
            location,
            domain_id,
            category as "category: ElectionCategory",
            number_of_seats as "number_of_seats: u32",
            number_of_voters as "number_of_voters: u32",
            election_date as "election_date: NaiveDate",
            nomination_date as "nomination_date: NaiveDate",
            political_groups as "political_groups: Json<Vec<RegisteredPoliticalGroup>>"
        "#,
        election.name,
        election.committee_category,
        election.counting_method,
        election.election_id,
        election.location,
        election.domain_id,
        election.category,
        election.number_of_seats,
        election.number_of_voters,
        election.election_date,
        election.nomination_date,
        political_groups,
    )
    .fetch_one(conn)
    .await?;
    Ok(row.into())
}

pub async fn change_number_of_voters(
    conn: &mut SqliteConnection,
    election_id: ElectionId,
    number_of_voters: u32,
) -> Result<Election, sqlx::Error> {
    query_as!(
        Election,
        r#"
        UPDATE elections
        SET number_of_voters = ?
        WHERE id = ?
        RETURNING
            id as "id: ElectionId",
            name,
            committee_category as "committee_category: _",
            counting_method as "counting_method: _", 
            election_id,
            location,
            domain_id,
            category as "category: _",
            number_of_seats as "number_of_seats: u32",
            number_of_voters as "number_of_voters: u32",
            election_date as "election_date: _",
            nomination_date as "nomination_date: _"
        "#,
        number_of_voters,
        election_id,
    )
    .fetch_one(conn)
    .await
}
