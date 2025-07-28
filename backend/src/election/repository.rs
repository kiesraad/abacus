use sqlx::{Error, query_as, types::Json};

use super::{Election, ElectionWithPoliticalGroups, NewElection};

use crate::DbConnLike;

pub async fn list(conn: impl DbConnLike<'_>) -> Result<Vec<Election>, Error> {
    let elections: Vec<Election> = query_as(
        "SELECT id, name, counting_method, election_id, location, domain_id, category, number_of_seats, election_date, nomination_date FROM elections",
    )
    .fetch_all(conn)
    .await?;
    Ok(elections)
}

pub async fn get(conn: impl DbConnLike<'_>, id: u32) -> Result<ElectionWithPoliticalGroups, Error> {
    let election: ElectionWithPoliticalGroups = query_as("SELECT * FROM elections WHERE id = ?")
        .bind(id)
        .fetch_one(conn)
        .await?;
    Ok(election)
}

pub async fn create(
    conn: impl DbConnLike<'_>,
    election: NewElection,
) -> Result<ElectionWithPoliticalGroups, Error> {
    query_as(
        r#"
        INSERT INTO elections (
            name,
            counting_method,
            election_id,
            location,
            domain_id,
            category,
            number_of_seats,
            election_date,
            nomination_date,
            political_groups
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING
            id,
            name,
            counting_method,
            election_id,
            location,
            domain_id,
            category,
            number_of_seats,
            election_date,
            nomination_date,
            political_groups
        "#,
    )
    .bind(election.name)
    .bind(election.counting_method)
    .bind(election.election_id)
    .bind(election.location)
    .bind(election.domain_id)
    .bind(election.category)
    .bind(election.number_of_seats)
    .bind(election.election_date)
    .bind(election.nomination_date)
    .bind(Json(election.political_groups))
    .fetch_one(conn)
    .await
}
