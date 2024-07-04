use sqlx::{query_as, Error, SqlitePool};

use crate::election::Election;

pub async fn get_elections(pool: SqlitePool) -> Result<Vec<Election>, Error> {
    let elections: Vec<Election> =
        query_as("SELECT id, name, category, election_date, nomination_date FROM elections")
            .fetch_all(&pool)
            .await?;
    Ok(elections)
}

pub async fn get_election(pool: SqlitePool, id: u32) -> Result<Election, Error> {
    let election: Election = query_as("SELECT * FROM elections WHERE id = ?")
        .bind(id)
        .fetch_one(&pool)
        .await?;
    Ok(election)
}
