use sqlx::{SqliteConnection, query_as, types::Json};

use crate::domain::election::{Election, ElectionId, ElectionWithPoliticalGroups, NewElection};

pub async fn list(conn: &mut SqliteConnection) -> Result<Vec<Election>, sqlx::Error> {
    let elections: Vec<Election> = query_as(
        "SELECT id, name, role, counting_method, election_id, location, domain_id, category, number_of_seats, number_of_voters, election_date, nomination_date FROM elections",
    )
    .fetch_all(conn)
    .await?;
    Ok(elections)
}

pub async fn get(
    conn: &mut SqliteConnection,
    election_id: ElectionId,
) -> Result<ElectionWithPoliticalGroups, sqlx::Error> {
    let election: ElectionWithPoliticalGroups = query_as("SELECT * FROM elections WHERE id = ?")
        .bind(election_id)
        .fetch_one(conn)
        .await?;
    Ok(election)
}

pub async fn create(
    conn: &mut SqliteConnection,
    election: NewElection,
) -> Result<ElectionWithPoliticalGroups, sqlx::Error> {
    query_as(
        r#"
        INSERT INTO elections (
            name,
            role,
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
            id,
            name,
            role,
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
        "#,
    )
    .bind(election.name)
    .bind(election.role)
    .bind(election.counting_method)
    .bind(election.election_id)
    .bind(election.location)
    .bind(election.domain_id)
    .bind(election.category)
    .bind(election.number_of_seats)
    .bind(election.number_of_voters)
    .bind(election.election_date)
    .bind(election.nomination_date)
    .bind(Json(election.political_groups))
    .fetch_one(conn)
    .await
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
            role as "role: _",
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
