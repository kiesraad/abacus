use axum::extract::FromRef;
use sqlx::{query_as, Error, SqlitePool};

use crate::AppState;

use super::Election;

pub struct Elections(SqlitePool);

impl Elections {
    #[cfg(test)]
    pub fn new(pool: SqlitePool) -> Self {
        Self(pool)
    }

    pub async fn list(&self) -> Result<Vec<Election>, Error> {
        let elections: Vec<Election> = query_as(
            "SELECT id, name, location, number_of_voters, category, election_date, nomination_date FROM elections",
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
}

impl FromRef<AppState> for Elections {
    fn from_ref(input: &AppState) -> Self {
        Self(input.pool.clone())
    }
}
