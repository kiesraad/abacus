use sqlx::{SqliteConnection, query, types::Json};

use crate::data_entry::domain::{
    data_entry_status::DataEntryStatus, election_status::ElectionStatusResponseEntry,
};

/// Get the status for each polling station data entry in a committee session
pub async fn statuses(
    conn: &mut SqliteConnection,
    committee_session_id: u32,
) -> Result<Vec<ElectionStatusResponseEntry>, sqlx::Error> {
    // If this is not the first committee session, we only want to include
    // polling stations with corrected results in this committee session
    query!(
        r#"
            SELECT
                p.id AS "polling_station_id: u32",
                de.state AS "state: Json<DataEntryStatus>"
            FROM polling_stations AS p
            LEFT JOIN committee_sessions AS c ON c.id = p.committee_session_id
            LEFT JOIN polling_station_data_entries AS de ON de.polling_station_id = p.id
            LEFT JOIN polling_station_investigations AS psi ON psi.polling_station_id = p.id
            WHERE c.id = $1 AND (c.number = 1 OR psi.corrected_results = 1)
        "#,
        committee_session_id
    )
    .map(|status| {
        let state = status.state.unwrap_or_default();
        ElectionStatusResponseEntry {
            polling_station_id: status.polling_station_id,
            status: state.status_name(),
            first_entry_user_id: state.get_first_entry_user_id(),
            second_entry_user_id: state.get_second_entry_user_id(),
            first_entry_progress: state.get_first_entry_progress(),
            second_entry_progress: state.get_second_entry_progress(),
            finished_at: state.finished_at().cloned(),
            finalised_with_warnings: state.finalised_with_warnings().cloned(),
        }
    })
    .fetch_all(conn)
    .await
}
