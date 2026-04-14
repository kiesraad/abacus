use sqlx::{Connection, SqliteConnection, query, query_as, query_scalar, types::Json};

use crate::{
    domain::{
        committee_session::CommitteeSessionId,
        data_entry::{DataEntryId, DataEntryStatus, DataEntryStatusWithSource},
        election::{CommitteeCategory, ElectionId},
        investigation::InvestigationStatus,
        polling_station::{
            PollingStation, PollingStationFirstSession, PollingStationForSession, PollingStationId,
            PollingStationNextSession, PollingStationNumber, PollingStationRequest,
            PollingStationType,
        },
    },
    repository::{
        committee_session_repo,
        common::{PollingStationRow, PollingStationRowLike},
        data_entry_repo,
    },
};

#[derive(Debug)]
pub enum CreateDataEntryError {
    Sqlx(sqlx::Error),
    DataEntryAlreadyLinked,
}

impl From<sqlx::Error> for CreateDataEntryError {
    fn from(err: sqlx::Error) -> Self {
        Self::Sqlx(err)
    }
}

/// Returns the committee category for the related election
pub async fn get_committee_category(
    conn: &mut SqliteConnection,
    polling_station_id: PollingStationId,
) -> Result<CommitteeCategory, sqlx::Error> {
    query_scalar!(
        r#"
        SELECT e.committee_category as "committee_category: _"
        FROM polling_stations AS p
        JOIN committee_sessions AS c ON c.id = p.committee_session_id
        JOIN elections AS e ON c.election_id = e.id
        WHERE p.id = ?
        "#,
        polling_station_id
    )
    .fetch_one(conn)
    .await
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
    .map(PollingStationRow::into_polling_station_for_session)
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
    .map(PollingStationRow::into_polling_station_for_session)
}

/// Create a single polling station for an election, returning its id.
/// The caller is responsible for linking a data entry afterwards.
pub async fn create(
    conn: &mut SqliteConnection,
    election_id: ElectionId,
    new_polling_station: PollingStationRequest,
) -> Result<PollingStationId, sqlx::Error> {
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

    let id = query_scalar!(
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
        RETURNING id AS "id: _"
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
    )
    .fetch_one(&mut *tx)
    .await?;
    tx.commit().await?;
    Ok(id)
}

/// Create many polling stations for an election, returning their ids.
/// The caller is responsible for creating and linking data entries afterwards.
pub async fn create_many(
    conn: &mut SqliteConnection,
    election_id: ElectionId,
    new_polling_stations: Vec<PollingStationRequest>,
) -> Result<Vec<PollingStationId>, sqlx::Error> {
    let mut ids: Vec<PollingStationId> = Vec::new();
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

        let id = query_scalar!(
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
            RETURNING id AS "id: _"
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
        )
        .fetch_one(&mut *tx)
        .await?;
        ids.push(id);
    }
    tx.commit().await?;
    Ok(ids)
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
    )
    .fetch_one(&mut *tx)
    .await?;
    tx.commit().await?;
    Ok(res.into_polling_station_for_session())
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

/// Returns the existing `data_entry_id` for the polling station.
/// Returns `sqlx::Error::RowNotFound` if no data entry is linked.
pub async fn get_data_entry_id(
    conn: &mut SqliteConnection,
    polling_station_id: PollingStationId,
) -> Result<DataEntryId, sqlx::Error> {
    query_scalar!(
        r#"SELECT data_entry_id AS "data_entry_id: _" FROM polling_stations WHERE id = ?"#,
        polling_station_id
    )
    .fetch_one(conn)
    .await?
    .ok_or(sqlx::Error::RowNotFound)
}

/// Creates a new empty data entry, links it to the polling station, and returns its id.
/// Returns an error if a data entry is already linked.
pub async fn create_data_entry(
    conn: &mut SqliteConnection,
    polling_station_id: PollingStationId,
) -> Result<DataEntryId, CreateDataEntryError> {
    let mut tx = conn.begin().await?;
    if get_data_entry_id(&mut tx, polling_station_id).await.is_ok() {
        return Err(CreateDataEntryError::DataEntryAlreadyLinked);
    }
    let data_entry = data_entry_repo::create_empty(&mut tx).await?;
    link_data_entry(&mut tx, polling_station_id, data_entry.id).await?;
    tx.commit().await?;
    Ok(data_entry.id)
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
    .map(PollingStationRow::into_polling_station_for_session)
}

/// Clear `data_entry_id` on a polling station (counterpart to `link_data_entry`).
pub async fn unlink_data_entry(
    conn: &mut SqliteConnection,
    polling_station_id: PollingStationId,
) -> Result<(), sqlx::Error> {
    query!(
        "UPDATE polling_stations SET data_entry_id = NULL WHERE id = ?",
        polling_station_id
    )
    .execute(conn)
    .await?;
    Ok(())
}

/// List all polling stations for a committee session (without session metadata)
pub async fn list_polling_stations(
    conn: &mut SqliteConnection,
    committee_session_id: CommitteeSessionId,
) -> Result<Vec<PollingStation>, sqlx::Error> {
    Ok(list(conn, committee_session_id)
        .await?
        .into_iter()
        .map(PollingStationRow::into_polling_station)
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
        .map(PollingStationRow::into_polling_station_first_session)
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
        .map(PollingStationRow::into_polling_station_next_session)
        .collect())
}

/// List all polling stations for a committee session (including session metadata)
pub async fn list_for_session(
    conn: &mut SqliteConnection,
    committee_session_id: CommitteeSessionId,
) -> Result<Vec<PollingStationForSession>, sqlx::Error> {
    Ok(list(conn, committee_session_id)
        .await?
        .into_iter()
        .map(PollingStationRow::into_polling_station_for_session)
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

/// List all polling stations for a first committee session with their data entry status
pub async fn list_first_session_with_status(
    conn: &mut SqliteConnection,
    committee_session_id: CommitteeSessionId,
) -> Result<Vec<DataEntryStatusWithSource>, sqlx::Error> {
    query!(
        r#"
        SELECT
            p.id AS "id: PollingStationId",
            p.committee_session_id AS "committee_session_id: CommitteeSessionId",
            c.number AS "committee_session_number: u32",
            p.prev_data_entry_id AS "prev_data_entry_id: DataEntryId",
            de.id AS "data_entry_id: DataEntryId",
            p.investigation_state AS "investigation_state: Json<InvestigationStatus>",
            p.name,
            p.number AS "number: PollingStationNumber",
            p.number_of_voters AS "number_of_voters: u32",
            p.polling_station_type AS "polling_station_type: PollingStationType",
            p.address,
            p.postal_code,
            p.locality,
            de.state AS "state: Json<DataEntryStatus>"
        FROM polling_stations AS p
        JOIN committee_sessions AS c ON c.id = p.committee_session_id
        JOIN data_entries AS de ON de.id = p.data_entry_id
        WHERE c.id = $1 AND c.number = 1
        "#,
        committee_session_id
    )
    .map(|row| DataEntryStatusWithSource {
        data_entry_id: row.data_entry_id,
        source: PollingStationRow {
            id: row.id,
            committee_session_id: row.committee_session_id,
            committee_session_number: row.committee_session_number,
            prev_data_entry_id: row.prev_data_entry_id,
            data_entry_id: Some(row.data_entry_id),
            investigation_state: row.investigation_state,
            name: row.name,
            number: row.number,
            number_of_voters: row.number_of_voters,
            polling_station_type: row.polling_station_type,
            address: row.address,
            postal_code: row.postal_code,
            locality: row.locality,
        }
        .into_polling_station_data_source(),
        status: row.state.0,
    })
    .fetch_all(conn)
    .await
}

/// List polling stations for a next committee session with their data entry status,
/// filtered to those with `ConcludedWithNewResults` investigation state
pub async fn list_next_session_with_status(
    conn: &mut SqliteConnection,
    committee_session_id: CommitteeSessionId,
) -> Result<Vec<DataEntryStatusWithSource>, sqlx::Error> {
    query!(
        r#"
        SELECT
            p.id AS "id: PollingStationId",
            p.committee_session_id AS "committee_session_id: CommitteeSessionId",
            c.number AS "committee_session_number: u32",
            p.prev_data_entry_id AS "prev_data_entry_id: DataEntryId",
            de.id AS "data_entry_id: DataEntryId",
            p.investigation_state AS "investigation_state: Json<InvestigationStatus>",
            p.name,
            p.number AS "number: PollingStationNumber",
            p.number_of_voters AS "number_of_voters: u32",
            p.polling_station_type AS "polling_station_type: PollingStationType",
            p.address,
            p.postal_code,
            p.locality,
            de.state AS "state: Json<DataEntryStatus>"
        FROM polling_stations AS p
        JOIN committee_sessions AS c ON c.id = p.committee_session_id
        JOIN data_entries AS de ON de.id = p.data_entry_id
        WHERE c.id = $1 AND c.number > 1 AND json_extract(p.investigation_state, '$.status') = 'ConcludedWithNewResults'
        "#,
        committee_session_id
    )
    .map(|row| DataEntryStatusWithSource {
        data_entry_id: row.data_entry_id,
        source: PollingStationRow {
            id: row.id,
            committee_session_id: row.committee_session_id,
            committee_session_number: row.committee_session_number,
            prev_data_entry_id: row.prev_data_entry_id,
            data_entry_id: Some(row.data_entry_id),
            investigation_state: row.investigation_state,
            name: row.name,
            number: row.number,
            number_of_voters: row.number_of_voters,
            polling_station_type: row.polling_station_type,
            address: row.address,
            postal_code: row.postal_code,
            locality: row.locality,
        }
        .into_polling_station_data_source(),
        status: row.state.0,
    })
    .fetch_all(conn)
    .await
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

/// Check if a polling station exists, regardless of the committee session it belongs to
#[cfg(test)]
pub async fn exists(
    conn: &mut SqliteConnection,
    polling_station_id: PollingStationId,
) -> Result<bool, sqlx::Error> {
    let exists = sqlx::query_scalar!(
        r#"SELECT EXISTS(SELECT 1 FROM polling_stations WHERE id = $1)"#,
        polling_station_id,
    )
    .fetch_one(conn)
    .await?;

    Ok(exists != 0)
}
