use crate::{
    committee_session::CommitteeSessionId, election::ElectionId, polling_station::PollingStationId,
};

use super::structs::{PollingStation, PollingStationRequest};
use sqlx::{Connection, SqliteConnection, query, query_as};

/// List all polling stations from a committee session
pub async fn list(
    conn: &mut SqliteConnection,
    committee_session_id: CommitteeSessionId,
) -> Result<Vec<PollingStation>, sqlx::Error> {
    query_as!(
        PollingStation,
        r#"
        SELECT
            p.id AS "id: PollingStationId",
            c.election_id AS "election_id: ElectionId",
            p.committee_session_id AS "committee_session_id: CommitteeSessionId",
            p.id_prev_session AS "id_prev_session: _",
            p.name,
            p.number AS "number: u32",
            p.number_of_voters AS "number_of_voters: _",
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
    .fetch_all(conn)
    .await
}

/// Get a single polling station
pub async fn get(
    conn: &mut SqliteConnection,
    polling_station_id: PollingStationId,
) -> Result<PollingStation, sqlx::Error> {
    query_as!(
        PollingStation,
        r#"
        SELECT
            p.id AS "id: PollingStationId",
            c.election_id AS "election_id: ElectionId",
            p.committee_session_id AS "committee_session_id: CommitteeSessionId",
            p.id_prev_session AS "id_prev_session: _",
            p.name,
            p.number AS "number: u32",
            p.number_of_voters AS "number_of_voters: _",
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
        polling_station_id,
    )
    .fetch_one(conn)
    .await
}

/// Get a single polling station for an election
pub async fn get_for_election(
    conn: &mut SqliteConnection,
    election_id: ElectionId,
    polling_station_id: PollingStationId,
) -> Result<PollingStation, sqlx::Error> {
    let committee_session_id =
        crate::committee_session::repository::get_current_id_for_election(conn, election_id)
            .await?
            .ok_or(sqlx::Error::RowNotFound)?;

    query_as!(
        PollingStation,
        r#"
        SELECT
            p.id AS "id: PollingStationId",
            c.election_id AS "election_id: ElectionId",
            p.committee_session_id AS "committee_session_id: CommitteeSessionId",
            p.id_prev_session AS "id_prev_session: _",
            p.name,
            p.number AS "number: u32",
            p.number_of_voters AS "number_of_voters: _",
            p.polling_station_type AS "polling_station_type: _",
            p.address,
            p.postal_code,
            p.locality
        FROM polling_stations AS p
        JOIN committee_sessions AS c ON c.id = p.committee_session_id
        WHERE p.id = $1 AND c.id = $2
        "#,
        polling_station_id,
        committee_session_id
    )
    .fetch_one(&mut *conn)
    .await
}

/// Create a single polling station for an election
pub async fn create(
    conn: &mut SqliteConnection,
    election_id: ElectionId,
    new_polling_station: PollingStationRequest,
) -> Result<PollingStation, sqlx::Error> {
    let mut tx = conn.begin().await?;
    let committee_session_id =
        crate::committee_session::repository::get_current_id_for_election(&mut tx, election_id)
            .await?
            .ok_or(sqlx::Error::RowNotFound)?;

    if new_polling_station.number.is_none() {
        return Err(sqlx::Error::InvalidArgument(
            "number is required".to_string(),
        ));
    }

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
            id AS "id: PollingStationId",
            ? AS "election_id!: ElectionId", -- Workaround to get election_id in the result without a temporary struct
            committee_session_id AS "committee_session_id: CommitteeSessionId",
            id_prev_session AS "id_prev_session: _",
            name,
            number AS "number: u32",
            number_of_voters AS "number_of_voters: _",
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
    conn: &mut SqliteConnection,
    election_id: ElectionId,
    new_polling_stations: Vec<PollingStationRequest>,
) -> Result<Vec<PollingStation>, sqlx::Error> {
    let mut stations: Vec<PollingStation> = Vec::new();
    let mut tx = conn.begin().await?;

    let committee_session_id =
        crate::committee_session::repository::get_current_id_for_election(&mut tx, election_id)
            .await?
            .ok_or(sqlx::Error::RowNotFound)?;

    for new_polling_station in new_polling_stations {
        if new_polling_station.number.is_none() {
            return Err(sqlx::Error::InvalidArgument(
                "number is required".to_string(),
            ));
        }

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
                id AS "id: PollingStationId",
                ? AS "election_id!: ElectionId", -- Workaround to get election_id in the result without a temporary struct
                committee_session_id AS "committee_session_id: CommitteeSessionId",
                id_prev_session AS "id_prev_session: _",
                name,
                number AS "number: u32",
                number_of_voters AS "number_of_voters: _",
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
    conn: &mut SqliteConnection,
    election_id: ElectionId,
    polling_station_id: PollingStationId,
    polling_station_update: PollingStationRequest,
) -> Result<PollingStation, sqlx::Error> {
    let mut tx = conn.begin().await?;
    let committee_session_id =
        crate::committee_session::repository::get_current_id_for_election(&mut tx, election_id)
            .await?
            .ok_or(sqlx::Error::RowNotFound)?;

    let polling_station = get(&mut tx, polling_station_id).await?;
    if polling_station.id_prev_session.is_some() && polling_station_update.number.is_some() {
        return Err(sqlx::Error::InvalidArgument(
            "number cannot be updated for polling stations linked to a previous session"
                .to_string(),
        ));
    }

    let res = query_as!(
        PollingStation,
        r#"
        UPDATE polling_stations
        SET
            name = ?,
            number = COALESCE(?, number),
            number_of_voters = ?,
            polling_station_type = ?,
            address = ?,
            postal_code = ?,
            locality = ?
        WHERE
            id = ? AND committee_session_id = ?
        RETURNING
            id AS "id: PollingStationId",
            ? AS "election_id!: ElectionId", -- Workaround to get election_id in the result without a temporary struct
            committee_session_id AS "committee_session_id: CommitteeSessionId",
            id_prev_session AS "id_prev_session: _",
            name,
            number AS "number: u32",
            number_of_voters AS "number_of_voters: _",
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
    conn: &mut SqliteConnection,
    election_id: ElectionId,
    polling_station_id: PollingStationId,
) -> Result<bool, sqlx::Error> {
    let mut tx = conn.begin().await?;
    let committee_session_id =
        crate::committee_session::repository::get_current_id_for_election(&mut tx, election_id)
            .await?
            .ok_or(sqlx::Error::RowNotFound)?;

    let rows_affected = query!(
        r#"DELETE FROM polling_stations WHERE id = ? AND committee_session_id = ?"#,
        polling_station_id,
        committee_session_id,
    )
    .execute(&mut *tx)
    .await?
    .rows_affected();

    tx.commit().await?;

    Ok(rows_affected > 0)
}

pub async fn duplicate_for_committee_session(
    conn: &mut SqliteConnection,
    from_committee_session_id: CommitteeSessionId,
    to_committee_session_id: CommitteeSessionId,
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

#[cfg(test)]
pub async fn insert_test_polling_station(
    conn: &mut SqliteConnection,
    polling_station_id: PollingStationId,
    committee_session_id: CommitteeSessionId,
    id_prev_session: Option<PollingStationId>,
    number: u32,
) -> Result<(), sqlx::Error> {
    query!(
        "INSERT INTO polling_stations (id, committee_session_id, id_prev_session, name, number, address, postal_code, locality) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        polling_station_id,
        committee_session_id,
        id_prev_session,
        "Test name",
        number,
        "Test address",
        "1234 AB",
        "Test location",
    )
    .execute(conn)
    .await?;
    Ok(())
}
