use axum::extract::FromRef;
use sqlx::types::Json;
use sqlx::{Error, SqlitePool, query_as};

use super::Election;
use super::NewElection;
use crate::AppState;

pub struct Elections(SqlitePool);

impl Elections {
    #[cfg(test)]
    pub fn new(pool: SqlitePool) -> Self {
        Self(pool)
    }

    pub async fn list(&self) -> Result<Vec<Election>, Error> {
        let elections: Vec<Election> = query_as(
            "SELECT id, name, election_id, location, domain_id, number_of_voters, category, number_of_seats, election_date, nomination_date, status FROM elections",
        )
        .fetch_all(&self.0)
        .await?;
        Ok(elections)
    }

    pub async fn get(&self, id: u32) -> Result<Election, Error> {
        let election: Election = query_as("SELECT * FROM elections WHERE id = ?")
            .bind(id)
            .fetch_one(&self.0)
            .await?;
        Ok(election)
    }

    pub async fn create(&self, election: NewElection) -> Result<Election, Error> {
        query_as(
            r#"
            INSERT INTO elections (
              name,
              election_id,
              location,
              domain_id,
              number_of_voters,
              category,
              number_of_seats,
              election_date,
              nomination_date,
              status,
              political_groups
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING
              id,
              name,
              election_id,
              location,
              domain_id,
              number_of_voters,
              category,
              number_of_seats,
              election_date,
              nomination_date,
              status,
              political_groups
            "#,
        )
        .bind(election.name)
        .bind(election.election_id)
        .bind(election.location)
        .bind(election.domain_id)
        .bind(election.number_of_voters)
        .bind(election.category)
        .bind(election.number_of_seats)
        .bind(election.election_date)
        .bind(election.nomination_date)
        .bind(election.status)
        .bind(Json(election.political_groups))
        .fetch_one(&self.0)
        .await
    }
}

impl FromRef<AppState> for Elections {
    fn from_ref(input: &AppState) -> Self {
        Self(input.pool.clone())
    }
}
