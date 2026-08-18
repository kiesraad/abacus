use chrono::NaiveDate;
use sqlx::{
    Database, Decode, Encode, Sqlite, SqliteConnection, Type, encode::IsNull, query_as,
    sqlite::SqliteValueRef, types::Json,
};

use crate::domain::election::{
    CommitteeCategory, CommitteeDistrict, Election, ElectionCategory, ElectionDomain, ElectionId,
    ElectionSubCategory, ElectionWithPoliticalGroups, NewElection, RegisteredPoliticalGroup,
    VoteCountingMethod,
};

pub async fn list(
    conn: &mut SqliteConnection,
    filter_committee_category: Option<CommitteeCategory>,
) -> Result<Vec<Election>, sqlx::Error> {
    let elections = query_as!(
        Election,
        r#"SELECT
            id,
            name,
            committee_category,
            counting_method,
            election_id,
            location,
            authority_id,
            authority_name,
            authority_region,
            district,
            domain,
            category,
            sub_category,
            number_of_seats,
            number_of_voters,
            election_date,
            nomination_date
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
    pub authority_id: String,
    pub authority_name: String,
    pub authority_region: String,
    pub district: CommitteeDistrict,
    pub domain: Option<ElectionDomain>,
    pub category: ElectionCategory,
    pub sub_category: ElectionSubCategory,
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
            authority_id: row.authority_id,
            authority_name: row.authority_name,
            authority_region: row.authority_region,
            district: row.district,
            domain: row.domain,
            category: row.category,
            sub_category: row.sub_category,
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

impl Type<Sqlite> for ElectionDomain {
    fn type_info() -> <Sqlite as Database>::TypeInfo {
        <Json<Self> as Type<Sqlite>>::type_info()
    }
}

impl<'q> Encode<'q, Sqlite> for ElectionDomain {
    fn encode_by_ref(
        &self,
        args: &mut <Sqlite as Database>::ArgumentBuffer,
    ) -> Result<IsNull, sqlx::error::BoxDynError> {
        <Json<&Self> as Encode<'q, Sqlite>>::encode_by_ref(&Json(self), args)
    }
}

impl<'r> Decode<'r, Sqlite> for ElectionDomain {
    fn decode(value: SqliteValueRef<'r>) -> Result<Self, sqlx::error::BoxDynError> {
        let json: Json<Self> = <Json<Self> as Decode<'r, Sqlite>>::decode(value)?;
        Ok(json.0)
    }
}

impl Type<Sqlite> for CommitteeDistrict {
    fn type_info() -> <Sqlite as Database>::TypeInfo {
        <Json<Self> as Type<Sqlite>>::type_info()
    }
}

impl<'q> Encode<'q, Sqlite> for CommitteeDistrict {
    fn encode_by_ref(
        &self,
        args: &mut <Sqlite as Database>::ArgumentBuffer,
    ) -> Result<IsNull, sqlx::error::BoxDynError> {
        <Json<&Self> as Encode<'q, Sqlite>>::encode_by_ref(&Json(self), args)
    }
}

impl<'r> Decode<'r, Sqlite> for CommitteeDistrict {
    fn decode(value: SqliteValueRef<'r>) -> Result<Self, sqlx::error::BoxDynError> {
        let json: Json<Self> = <Json<Self> as Decode<'r, Sqlite>>::decode(value)?;
        Ok(json.0)
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
            id,
            name,
            committee_category,
            counting_method,
            election_id,
            location,
            authority_id,
            authority_name,
            authority_region,
            district,
            domain,
            category,
            sub_category,
            number_of_seats,
            number_of_voters,
            election_date,
            nomination_date,
            political_groups
        FROM elections
        WHERE id = ?
        "#,
        election_id
    )
    .fetch_one(conn)
    .await?;
    Ok(row.into())
}

#[expect(clippy::too_many_lines)]
pub async fn create(
    conn: &mut SqliteConnection,
    election: NewElection,
) -> Result<ElectionWithPoliticalGroups, sqlx::Error> {
    let political_groups = Json(election.political_groups);
    let district = Json(election.district);
    let domain = Json(election.domain);
    let row = query_as!(
        ElectionRow,
        r#"
        INSERT INTO elections (
            name,
            committee_category,
            counting_method,
            election_id,
            location,
            authority_id,
            authority_name,
            authority_region,
            district,
            domain,
            category,
            sub_category,
            number_of_seats,
            number_of_voters,
            election_date,
            nomination_date,
            political_groups
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING
            id,
            name,
            committee_category,
            counting_method,
            election_id,
            location,
            authority_id,
            authority_name,
            authority_region,
            district,
            domain,
            category,
            sub_category,
            number_of_seats,
            number_of_voters,
            election_date,
            nomination_date,
            political_groups
        "#,
        election.name,
        election.committee_category,
        election.counting_method,
        election.election_id,
        election.location,
        election.authority_id,
        election.authority_name,
        election.authority_region,
        district,
        domain,
        election.category,
        election.sub_category,
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
            id,
            name,
            committee_category,
            counting_method,
            election_id,
            location,
            authority_id,
            authority_name,
            authority_region,
            district,
            domain,
            category,
            sub_category,
            number_of_seats,
            number_of_voters,
            election_date,
            nomination_date
        "#,
        number_of_voters,
        election_id,
    )
    .fetch_one(conn)
    .await
}
