use sqlx::{Connection, FromRow, SqliteConnection, query, query_as, types::Json};

use crate::{
    domain::{
        committee_session::CommitteeSessionId,
        election::ElectionId,
        investigation::InvestigationStatus,
        polling_station::{
            PollingStation, PollingStationFirstSession, PollingStationForSession, PollingStationId,
            PollingStationNextSession, PollingStationNumber, PollingStationRequest,
            PollingStationType,
        },
        polling_station_data_entry::DataEntryId,
    },
    repository::committee_session_repo,
};

/// Polling station database row, matching the SQL schema
#[derive(FromRow, Debug, Clone)]
struct PollingStationRow {
    id: PollingStationId,
    election_id: ElectionId,
    committee_session_id: CommitteeSessionId,
    committee_session_number: u32,
    prev_data_entry_id: Option<DataEntryId>,
    data_entry_id: Option<DataEntryId>,
    investigation_state: Option<Json<InvestigationStatus>>,
    name: String,
    number: PollingStationNumber,
    number_of_voters: Option<u32>,
    polling_station_type: Option<PollingStationType>,
    address: String,
    postal_code: String,
    locality: String,
}

impl From<PollingStationRow> for PollingStation {
    fn from(row: PollingStationRow) -> Self {
        Self {
            id: row.id,
            election_id: row.election_id,
            name: row.name,
            number: row.number,
            number_of_voters: row.number_of_voters,
            polling_station_type: row.polling_station_type,
            address: row.address,
            postal_code: row.postal_code,
            locality: row.locality,
        }
    }
}

impl From<PollingStationRow> for PollingStationFirstSession {
    fn from(row: PollingStationRow) -> Self {
        let PollingStationRow {
            id,
            election_id,
            committee_session_id,
            committee_session_number: _,
            prev_data_entry_id: _,
            data_entry_id,
            investigation_state: _,
            name,
            number,
            number_of_voters,
            polling_station_type,
            address,
            postal_code,
            locality,
        } = row;
        Self {
            committee_session_id,
            data_entry_id,
            polling_station: PollingStation {
                id,
                election_id,
                name,
                number,
                number_of_voters,
                polling_station_type,
                address,
                postal_code,
                locality,
            },
        }
    }
}

impl From<PollingStationRow> for PollingStationNextSession {
    fn from(row: PollingStationRow) -> Self {
        let PollingStationRow {
            id,
            election_id,
            committee_session_id,
            committee_session_number: _,
            prev_data_entry_id,
            data_entry_id,
            investigation_state,
            name,
            number,
            number_of_voters,
            polling_station_type,
            address,
            postal_code,
            locality,
        } = row;
        Self {
            committee_session_id,
            prev_data_entry_id,
            data_entry_id,
            investigation_status: investigation_state.map(|json| {
                let status = json.0;
                match (&status, data_entry_id) {
                    (InvestigationStatus::ConcludedWithNewResults(_), Some(id)) => {
                        status.with_data_entry_id(id)
                    }
                    _ => status,
                }
            }),
            polling_station: PollingStation {
                id,
                election_id,
                name,
                number,
                number_of_voters,
                polling_station_type,
                address,
                postal_code,
                locality,
            },
        }
    }
}

impl From<PollingStationRow> for PollingStationForSession {
    fn from(row: PollingStationRow) -> Self {
        if row.committee_session_number > 1 {
            Self::Next(PollingStationNextSession::from(row))
        } else {
            Self::First(PollingStationFirstSession::from(row))
        }
    }
}

/// Returns if a committee session has polling stations
pub async fn has_any(
    conn: &mut SqliteConnection,
    committee_session_id: CommitteeSessionId,
) -> Result<bool, sqlx::Error> {
    let result = query!(
        r#"
        SELECT EXISTS(
            SELECT 1 FROM polling_stations
            WHERE committee_session_id = $1
        ) as `exists`"#,
        committee_session_id
    )
    .fetch_one(conn)
    .await?;

    Ok(result.exists == 1)
}

/// List all polling stations from a committee session
async fn list(
    conn: &mut SqliteConnection,
    committee_session_id: CommitteeSessionId,
) -> Result<Vec<PollingStationRow>, sqlx::Error> {
    query_as!(
        PollingStationRow,
        r#"
        SELECT
            p.id AS "id: _",
            c.election_id AS "election_id: _",
            p.committee_session_id AS "committee_session_id: _",
            c.number AS "committee_session_number: u32",
            p.prev_data_entry_id AS "prev_data_entry_id: _",
            p.data_entry_id AS "data_entry_id: _",
            p.investigation_state AS "investigation_state: Json<InvestigationStatus>",
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

/// Get a single polling station in the current (latest) committee session
pub async fn get(
    conn: &mut SqliteConnection,
    polling_station_id: PollingStationId,
) -> Result<PollingStationForSession, sqlx::Error> {
    query_as!(
        PollingStationRow,
        r#"
        SELECT
            p.id AS "id: _",
            c.election_id AS "election_id: _",
            p.committee_session_id AS "committee_session_id: _",
            c.number AS "committee_session_number: u32",
            p.prev_data_entry_id AS "prev_data_entry_id: _",
            p.data_entry_id AS "data_entry_id: _",
            p.investigation_state AS "investigation_state: Json<InvestigationStatus>",
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
    .map(PollingStationForSession::from)
}

/// Get a single polling station for an election
pub async fn get_for_election(
    conn: &mut SqliteConnection,
    election_id: ElectionId,
    polling_station_id: PollingStationId,
) -> Result<PollingStationForSession, sqlx::Error> {
    let committee_session_id =
        committee_session_repo::get_current_id_for_election(conn, election_id)
            .await?
            .ok_or(sqlx::Error::RowNotFound)?;

    query_as!(
        PollingStationRow,
        r#"
        SELECT
            p.id AS "id: _",
            c.election_id AS "election_id: _",
            p.committee_session_id AS "committee_session_id: _",
            c.number AS "committee_session_number: u32",
            p.prev_data_entry_id AS "prev_data_entry_id: _",
            p.data_entry_id AS "data_entry_id: _",
            p.investigation_state AS "investigation_state: Json<InvestigationStatus>",
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
    .map(PollingStationForSession::from)
}

/// Create a single polling station for an election
pub async fn create(
    conn: &mut SqliteConnection,
    election_id: ElectionId,
    new_polling_station: PollingStationRequest,
) -> Result<PollingStationForSession, sqlx::Error> {
    let mut tx = conn.begin().await?;
    let committee_session_id =
        committee_session_repo::get_current_id_for_election(&mut tx, election_id)
            .await?
            .ok_or(sqlx::Error::RowNotFound)?;

    if new_polling_station.number.is_none() {
        return Err(sqlx::Error::InvalidArgument(
            "number is required".to_string(),
        ));
    }

    let res = query_as!(
        PollingStationRow,
        r#"
        INSERT INTO polling_stations (
            committee_session_id,
            prev_data_entry_id,
            name,
            number,
            number_of_voters,
            polling_station_type,
            address,
            postal_code,
            locality
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING
            id AS "id: _",
            ? AS "election_id!: _", -- Workaround to get election_id in the result without a temporary struct
            committee_session_id AS "committee_session_id: _",
            (SELECT c.number FROM committee_sessions AS c WHERE c.id = committee_session_id) AS "committee_session_number!: u32",
            prev_data_entry_id AS "prev_data_entry_id: _",
            data_entry_id AS "data_entry_id: _",
            investigation_state AS "investigation_state: Json<InvestigationStatus>",
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
    Ok(PollingStationForSession::from(res))
}

/// Create many polling stations for an election
#[allow(clippy::too_many_lines)]
pub async fn create_many(
    conn: &mut SqliteConnection,
    election_id: ElectionId,
    new_polling_stations: Vec<PollingStationRequest>,
) -> Result<Vec<PollingStationForSession>, sqlx::Error> {
    let mut stations: Vec<PollingStationForSession> = Vec::new();
    let mut tx = conn.begin().await?;

    let committee_session_id =
        committee_session_repo::get_current_id_for_election(&mut tx, election_id)
            .await?
            .ok_or(sqlx::Error::RowNotFound)?;

    for new_polling_station in new_polling_stations {
        if new_polling_station.number.is_none() {
            return Err(sqlx::Error::InvalidArgument(
                "number is required".to_string(),
            ));
        }

        stations.push(PollingStationForSession::from(
            query_as!(
                PollingStationRow,
                r#"
            INSERT INTO polling_stations (
                committee_session_id,
                prev_data_entry_id,
                name,
                number,
                number_of_voters,
                polling_station_type,
                address,
                postal_code,
                locality
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING
                id AS "id: _",
                ? AS "election_id!: ElectionId", -- Workaround to get election_id in the result without a temporary struct
                committee_session_id AS "committee_session_id: _",
                (SELECT c.number FROM committee_sessions AS c WHERE c.id = committee_session_id) AS "committee_session_number!: u32",
                prev_data_entry_id AS "prev_data_entry_id: _",
                data_entry_id AS "data_entry_id: _",
                investigation_state AS "investigation_state: Json<InvestigationStatus>",
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
        ));
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
) -> Result<PollingStationForSession, sqlx::Error> {
    let mut tx = conn.begin().await?;
    let committee_session_id =
        committee_session_repo::get_current_id_for_election(&mut tx, election_id)
            .await?
            .ok_or(sqlx::Error::RowNotFound)?;

    let polling_station = get(&mut tx, polling_station_id).await?;
    if polling_station.prev_data_entry_id().is_some() && polling_station_update.number.is_some() {
        return Err(sqlx::Error::InvalidArgument(
            "number cannot be updated for polling stations linked to a previous session"
                .to_string(),
        ));
    }

    let res = query_as!(
        PollingStationRow,
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
            id AS "id: _",
            ? AS "election_id!: _", -- Workaround to get election_id in the result without a temporary struct
            committee_session_id AS "committee_session_id: _",
            (SELECT c.number FROM committee_sessions AS c WHERE c.id = committee_session_id) AS "committee_session_number!: u32",
            prev_data_entry_id AS "prev_data_entry_id: _",
            data_entry_id AS "data_entry_id: _",
            investigation_state AS "investigation_state: Json<InvestigationStatus>",
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
    Ok(PollingStationForSession::from(res))
}

/// Delete a single polling station for an election
pub async fn delete(
    conn: &mut SqliteConnection,
    election_id: ElectionId,
    polling_station_id: PollingStationId,
) -> Result<bool, sqlx::Error> {
    let mut tx = conn.begin().await?;
    let committee_session_id =
        committee_session_repo::get_current_id_for_election(&mut tx, election_id)
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

/// Set `data_entry_id` on a polling station and return the updated row.
pub async fn link_data_entry(
    conn: &mut SqliteConnection,
    polling_station_id: PollingStationId,
    data_entry_id: DataEntryId,
) -> Result<PollingStationForSession, sqlx::Error> {
    query_as!(
        PollingStationRow,
        r#"
            UPDATE polling_stations
            SET data_entry_id = ?
            WHERE id = ?
            RETURNING
                id AS "id: _",
                (SELECT c.election_id FROM committee_sessions AS c WHERE c.id = committee_session_id) AS "election_id!: _",
                committee_session_id AS "committee_session_id: _",
                (SELECT c.number FROM committee_sessions AS c WHERE c.id = committee_session_id) AS "committee_session_number!: u32",
                prev_data_entry_id AS "prev_data_entry_id: _",
                data_entry_id AS "data_entry_id: _",
                investigation_state AS "investigation_state: Json<InvestigationStatus>",
                name,
                number AS "number: u32",
                number_of_voters AS "number_of_voters: _",
                polling_station_type AS "polling_station_type: _",
                address,
                postal_code,
                locality
        "#,
        data_entry_id,
        polling_station_id,
    )
    .fetch_one(conn)
    .await
    .map(PollingStationForSession::from)
}

/// List all polling stations for a committee session (without session metadata)
pub async fn list_polling_stations(
    conn: &mut SqliteConnection,
    committee_session_id: CommitteeSessionId,
) -> Result<Vec<PollingStation>, sqlx::Error> {
    Ok(list(conn, committee_session_id)
        .await?
        .into_iter()
        .map(PollingStation::from)
        .collect())
}

/// List all polling stations for a first committee session
pub async fn list_first_session(
    conn: &mut SqliteConnection,
    committee_session_id: CommitteeSessionId,
) -> Result<Vec<PollingStationFirstSession>, sqlx::Error> {
    Ok(list(conn, committee_session_id)
        .await?
        .into_iter()
        .map(PollingStationFirstSession::from)
        .collect())
}

/// List all polling stations for a next committee session
pub async fn list_next_session(
    conn: &mut SqliteConnection,
    committee_session_id: CommitteeSessionId,
) -> Result<Vec<PollingStationNextSession>, sqlx::Error> {
    Ok(list(conn, committee_session_id)
        .await?
        .into_iter()
        .map(PollingStationNextSession::from)
        .collect())
}

/// Get a single polling station typed for a next committee session
pub async fn get_next_session(
    conn: &mut SqliteConnection,
    polling_station_id: PollingStationId,
) -> Result<PollingStationNextSession, sqlx::Error> {
    match get(conn, polling_station_id).await? {
        PollingStationForSession::Next(ps) => Ok(ps),
        PollingStationForSession::First(_) => Err(sqlx::Error::RowNotFound),
    }
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
            prev_data_entry_id,
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
            COALESCE(data_entry_id, prev_data_entry_id) AS prev_data_entry_id,
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
    prev_data_entry_id: Option<DataEntryId>,
    number: u32,
) -> Result<(), sqlx::Error> {
    query!(
        "INSERT INTO polling_stations (id, committee_session_id, prev_data_entry_id, name, number, address, postal_code, locality) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        polling_station_id,
        committee_session_id,
        prev_data_entry_id,
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
