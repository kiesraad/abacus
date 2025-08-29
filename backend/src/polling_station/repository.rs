use sqlx::{query, query_as};

use crate::DbConnLike;

use super::structs::{PollingStation, PollingStationRequest};

/// List all polling stations from an election
pub async fn list(
    conn: impl DbConnLike<'_>,
    election_id: u32,
) -> Result<Vec<PollingStation>, sqlx::Error> {
    query_as!(
        PollingStation,
        r#"
        SELECT
            id AS "id: u32",
            election_id AS "election_id: u32",
            name,
            number AS "number: u32",
            number_of_voters,
            polling_station_type AS "polling_station_type: _",
            address,
            postal_code,
            locality
        FROM polling_stations
        WHERE election_id = $1
        "#,
        election_id
    )
    .fetch_all(conn)
    .await
}

/// Get a single polling station
pub async fn get(conn: impl DbConnLike<'_>, id: u32) -> Result<PollingStation, sqlx::Error> {
    query_as!(
        PollingStation,
        r#"
        SELECT
            id AS "id: u32",
            election_id AS "election_id: u32",
            name,
            number AS "number: u32",
            number_of_voters,
            polling_station_type AS "polling_station_type: _",
            address,
            postal_code,
            locality
        FROM polling_stations
        WHERE id = $1
        "#,
        id
    )
    .fetch_one(conn)
    .await
}

/// Get a single polling station for an election
pub async fn get_for_election(
    conn: impl DbConnLike<'_>,
    election_id: u32,
    id: u32,
) -> Result<PollingStation, sqlx::Error> {
    query_as!(
        PollingStation,
        r#"
        SELECT
            id AS "id: u32",
            election_id AS "election_id: u32",
            name,
            number AS "number: u32",
            number_of_voters,
            polling_station_type AS "polling_station_type: _",
            address,
            postal_code,
            locality
        FROM polling_stations
        WHERE id = $1 AND election_id = $2
        "#,
        id,
        election_id
    )
    .fetch_one(conn)
    .await
}

/// Create a single polling station for an election
pub async fn create(
    conn: impl DbConnLike<'_>,
    election_id: u32,
    new_polling_station: PollingStationRequest,
) -> Result<PollingStation, sqlx::Error> {
    query_as!(
        PollingStation,
        r#"
        INSERT INTO polling_stations (
            election_id,
            name,
            number,
            number_of_voters,
            polling_station_type,
            address,
            postal_code,
            locality
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING
            id AS "id: u32",
            election_id AS "election_id: u32",
            name,
            number AS "number: u32",
            number_of_voters,
            polling_station_type AS "polling_station_type: _",
            address,
            postal_code,
            locality
        "#,
        election_id,
        new_polling_station.name,
        new_polling_station.number,
        new_polling_station.number_of_voters,
        new_polling_station.polling_station_type,
        new_polling_station.address,
        new_polling_station.postal_code,
        new_polling_station.locality,
    )
    .fetch_one(conn)
    .await
}

/// Create many polling stations for an election
pub async fn create_many(
    conn: impl DbConnLike<'_>,
    election_id: u32,
    new_polling_stations: Vec<PollingStationRequest>,
) -> Result<Vec<PollingStation>, sqlx::Error> {
    let mut stations: Vec<PollingStation> = Vec::new();
    let mut tx = conn.begin().await?;
    for new_polling_station in new_polling_stations {
        stations.push(
            query_as!(
                PollingStation,
                r#"
            INSERT INTO polling_stations (
                election_id,
                name,
                number,
                number_of_voters,
                polling_station_type,
                address,
                postal_code,
                locality
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING
                id AS "id: u32",
                election_id AS "election_id: u32",
                name,
                number AS "number: u32",
                number_of_voters,
                polling_station_type AS "polling_station_type: _",
                address,
                postal_code,
                locality
            "#,
                election_id,
                new_polling_station.name,
                new_polling_station.number,
                new_polling_station.number_of_voters,
                new_polling_station.polling_station_type,
                new_polling_station.address,
                new_polling_station.postal_code,
                new_polling_station.locality,
            )
            .fetch_one(&mut *tx)
            .await?,
        );
    }
    tx.commit().await?;

    Ok(stations)
}

/// Update a single polling station for an election
pub async fn update(
    conn: impl DbConnLike<'_>,
    election_id: u32,
    polling_station_id: u32,
    polling_station_update: PollingStationRequest,
) -> Result<PollingStation, sqlx::Error> {
    query_as!(
        PollingStation,
        r#"
        UPDATE polling_stations
        SET
            name = ?,
            number = ?,
            number_of_voters = ?,
            polling_station_type = ?,
            address = ?,
            postal_code = ?,
            locality = ?
        WHERE
            id = ? AND election_id = ?
        RETURNING
            id AS "id: u32",
            election_id AS "election_id: u32",
            name,
            number AS "number: u32",
            number_of_voters,
            polling_station_type AS "polling_station_type: _",
            address,
            postal_code,
            locality
        "#,
        polling_station_update.name,
        polling_station_update.number,
        polling_station_update.number_of_voters,
        polling_station_update.polling_station_type,
        polling_station_update.address,
        polling_station_update.postal_code,
        polling_station_update.locality,
        polling_station_id,
        election_id,
    )
    .fetch_one(conn)
    .await
}

/// Delete a single polling station for an election
pub async fn delete(
    conn: impl DbConnLike<'_>,
    election_id: u32,
    id: u32,
) -> Result<bool, sqlx::Error> {
    let rows_affected = query!(
        r#"DELETE FROM polling_stations WHERE id = ? AND election_id = ?"#,
        id,
        election_id,
    )
    .execute(conn)
    .await?
    .rows_affected();

    Ok(rows_affected > 0)
}
