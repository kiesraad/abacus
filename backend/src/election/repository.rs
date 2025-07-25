use axum::extract::FromRef;
use sqlx::{Error, SqlitePool, query_as, types::Json};

use super::{Election, ElectionWithPoliticalGroups, NewElection};

use crate::AppState;

pub struct Elections(SqlitePool);

impl Elections {
    pub fn new(pool: SqlitePool) -> Self {
        Self(pool)
    }

    pub async fn list(&self) -> Result<Vec<Election>, Error> {
        let elections: Vec<Election> = query_as(
            "SELECT id, name, counting_method, election_id, location, domain_id, category, number_of_seats, election_date, nomination_date FROM elections",
        )
        .fetch_all(&self.0)
        .await?;
        Ok(elections)
    }

    pub async fn get(&self, id: u32) -> Result<ElectionWithPoliticalGroups, Error> {
        let election: ElectionWithPoliticalGroups =
            query_as("SELECT * FROM elections WHERE id = ?")
                .bind(id)
                .fetch_one(&self.0)
                .await?;
        Ok(election)
    }

    pub async fn create(
        &self,
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
        .fetch_one(&self.0)
        .await
    }
}

impl FromRef<AppState> for Elections {
    fn from_ref(input: &AppState) -> Self {
        Self(input.pool.clone())
    }
}
