use sqlx::{query, query_as};

use crate::DbConnLike;

use super::structs::{PollingStation, PollingStationRequest};

/// List all polling stations from an election
pub async fn list(
    conn: impl DbConnLike<'_>,
    election_id: u32,
) -> Result<Vec<PollingStation>, sqlx::Error> {
    let mut tx = conn.begin_immediate().await?;
    let committee_session_id =
        crate::committee_session::repository::get_current_id_for_election(&mut *tx, election_id)
            .await?
            .ok_or(sqlx::Error::RowNotFound)?;

    query_as!(
        PollingStation,
        r#"
        SELECT
            p.id AS "id: u32",
            c.election_id AS "election_id: u32",
            p.committee_session_id AS "committee_session_id: u32",
            p.id_prev_session AS "id_prev_session: _",
            p.name,
            p.number AS "number: u32",
            p.number_of_voters,
            p.polling_station_type AS "polling_station_type: _",
            p.address,
            p.postal_code,
            p.locality
        FROM polling_stations AS p
        JOIN committee_sessions AS c ON c.id = p.committee_session_id
        WHERE c.id = $1
        "#,
        committee_session_id
    )
    .fetch_all(&mut *tx)
    .await
}

/// Get a single polling station
pub async fn get(conn: impl DbConnLike<'_>, id: u32) -> Result<PollingStation, sqlx::Error> {
    query_as!(
        PollingStation,
        r#"
        SELECT
            p.id AS "id: u32",
            c.election_id AS "election_id: u32",
            p.committee_session_id AS "committee_session_id: u32",
            p.id_prev_session AS "id_prev_session: _",
            p.name,
            p.number AS "number: u32",
            p.number_of_voters,
            p.polling_station_type AS "polling_station_type: _",
            p.address,
            p.postal_code,
            p.locality
        FROM polling_stations AS p
        JOIN committee_sessions AS c ON c.id = p.committee_session_id
        WHERE p.id = $1 AND c.number = (
            SELECT MAX(c2.number)
            FROM committee_sessions AS c2
            WHERE c2.election_id = c.election_id
        )
        "#,
        id
    )
    .fetch_one(conn)
    .await
}

#[cfg(test)]
pub async fn get_by_previous_id(
    conn: impl DbConnLike<'_>,
    previous_id: u32,
) -> Result<PollingStation, sqlx::Error> {
    query_as!(
        PollingStation,
        r#"
        SELECT
            p.id AS "id: u32",
            c.election_id AS "election_id: u32",
            p.committee_session_id AS "committee_session_id: u32",
            p.id_prev_session AS "id_prev_session: _",
            p.name,
            p.number AS "number: u32",
            p.number_of_voters,
            p.polling_station_type AS "polling_station_type: _",
            p.address,
            p.postal_code,
            p.locality
        FROM polling_stations AS p
        JOIN committee_sessions AS c ON c.id = p.committee_session_id
        WHERE p.id_prev_session = $1
        "#,
        previous_id
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
    let mut conn = conn.acquire().await?;
    let committee_session_id =
        crate::committee_session::repository::get_current_id_for_election(&mut *conn, election_id)
            .await?
            .ok_or(sqlx::Error::RowNotFound)?;

    query_as!(
        PollingStation,
        r#"
        SELECT
            p.id AS "id: u32",
            c.election_id AS "election_id: u32",
            p.committee_session_id AS "committee_session_id: u32",
            p.id_prev_session AS "id_prev_session: _",
            p.name,
            p.number AS "number: u32",
            p.number_of_voters,
            p.polling_station_type AS "polling_station_type: _",
            p.address,
            p.postal_code,
            p.locality
        FROM polling_stations AS p
        JOIN committee_sessions AS c ON c.id = p.committee_session_id
        WHERE p.id = $1 AND c.id = $2
        "#,
        id,
        committee_session_id
    )
    .fetch_one(&mut *conn)
    .await
}

/// Create a single polling station for an election
pub async fn create(
    conn: impl DbConnLike<'_>,
    election_id: u32,
    new_polling_station: PollingStationRequest,
) -> Result<PollingStation, sqlx::Error> {
    let mut tx = conn.begin_immediate().await?;
    let committee_session_id =
        crate::committee_session::repository::get_current_id_for_election(&mut *tx, election_id)
            .await?
            .ok_or(sqlx::Error::RowNotFound)?;

    let res = query_as!(
        PollingStation,
        r#"
        INSERT INTO polling_stations (
            committee_session_id,
            id_prev_session,
            name,
            number,
            number_of_voters,
            polling_station_type,
            address,
            postal_code,
            locality
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING
            id AS "id: u32",
            ? AS "election_id!: u32", -- Workaround to get election_id in the result without a temporary struct
            committee_session_id AS "committee_session_id: u32",
            id_prev_session AS "id_prev_session: _",
            name,
            number AS "number: u32",
            number_of_voters,
            polling_station_type AS "polling_station_type: _",
            address,
            postal_code,
            locality
        "#,
        committee_session_id,
        None::<u32> as _,
        new_polling_station.name,
        new_polling_station.number,
        new_polling_station.number_of_voters,
        new_polling_station.polling_station_type,
        new_polling_station.address,
        new_polling_station.postal_code,
        new_polling_station.locality,
        election_id,
    )
    .fetch_one(&mut *tx)
    .await?;
    tx.commit().await?;
    Ok(res)
}

/// Create many polling stations for an election
pub async fn create_many(
    conn: impl DbConnLike<'_>,
    election_id: u32,
    new_polling_stations: Vec<PollingStationRequest>,
) -> Result<Vec<PollingStation>, sqlx::Error> {
    let mut stations: Vec<PollingStation> = Vec::new();
    let mut tx = conn.begin_immediate().await?;

    let committee_session_id =
        crate::committee_session::repository::get_current_id_for_election(&mut *tx, election_id)
            .await?
            .ok_or(sqlx::Error::RowNotFound)?;

    for new_polling_station in new_polling_stations {
        stations.push(
            query_as!(
                PollingStation,
                r#"
            INSERT INTO polling_stations (
                committee_session_id,
                id_prev_session,
                name,
                number,
                number_of_voters,
                polling_station_type,
                address,
                postal_code,
                locality
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING
                id AS "id: u32",
                ? AS "election_id!: u32", -- Workaround to get election_id in the result without a temporary struct
                committee_session_id AS "committee_session_id: u32",
                id_prev_session AS "id_prev_session: _",
                name,
                number AS "number: u32",
                number_of_voters,
                polling_station_type AS "polling_station_type: _",
                address,
                postal_code,
                locality
            "#,
                committee_session_id,
                None::<u32> as _,
                new_polling_station.name,
                new_polling_station.number,
                new_polling_station.number_of_voters,
                new_polling_station.polling_station_type,
                new_polling_station.address,
                new_polling_station.postal_code,
                new_polling_station.locality,
                election_id,
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
    let mut tx = conn.begin_immediate().await?;
    let committee_session_id =
        crate::committee_session::repository::get_current_id_for_election(&mut *tx, election_id)
            .await?
            .ok_or(sqlx::Error::RowNotFound)?;

    let res = query_as!(
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
            id = ? AND committee_session_id = ?
        RETURNING
            id AS "id: u32",
            ? AS "election_id!: u32", -- Workaround to get election_id in the result without a temporary struct
            committee_session_id AS "committee_session_id: u32",
            id_prev_session AS "id_prev_session: _",
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
        committee_session_id,
        election_id,
    )
    .fetch_one(&mut *tx)
    .await?;
    tx.commit().await?;
    Ok(res)
}

/// Delete a single polling station for an election
pub async fn delete(
    conn: impl DbConnLike<'_>,
    election_id: u32,
    id: u32,
) -> Result<bool, sqlx::Error> {
    let mut tx = conn.begin_immediate().await?;
    let committee_session_id =
        crate::committee_session::repository::get_current_id_for_election(&mut *tx, election_id)
            .await?
            .ok_or(sqlx::Error::RowNotFound)?;

    let rows_affected = query!(
        r#"DELETE FROM polling_stations WHERE id = ? AND committee_session_id = ?"#,
        id,
        committee_session_id,
    )
    .execute(&mut *tx)
    .await?
    .rows_affected();

    tx.commit().await?;

    Ok(rows_affected > 0)
}

pub async fn duplicate_for_committee_session(
    conn: impl DbConnLike<'_>,
    from_committee_session_id: u32,
    to_committee_session_id: u32,
) -> Result<(), sqlx::Error> {
    query!(
        r#"
        INSERT INTO polling_stations (
            committee_session_id,
            id_prev_session,
            name,
            number,
            number_of_voters,
            polling_station_type,
            address,
            postal_code,
            locality
        )
        SELECT
            ? AS committee_session_id,
            id AS id_prev_session,
            name,
            number,
            number_of_voters,
            polling_station_type,
            address,
            postal_code,
            locality
        FROM polling_stations
        WHERE committee_session_id = ?
        "#,
        to_committee_session_id,
        from_committee_session_id
    )
    .execute(conn)
    .await?;
    Ok(())
}
