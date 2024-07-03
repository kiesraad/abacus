use crate::repository::Repository;

use sqlx::{query_as, Error};

use super::Election;

pub struct Elections<'repo>(pub &'repo Repository);

impl Elections<'_> {
    pub async fn list(&self) -> Result<Vec<Election>, Error> {
        let elections: Vec<Election> =
            query_as("SELECT id, name, category, election_date, nomination_date FROM elections")
                .fetch_all(self.0.pool())
                .await?;
        Ok(elections)
    }

    pub async fn get(&self, id: u32) -> Result<Election, Error> {
        let election: Election = query_as("SELECT * FROM elections WHERE id = ?")
            .bind(id)
            .fetch_one(self.0.pool())
            .await?;
        Ok(election)
    }
}
