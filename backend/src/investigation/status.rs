use sqlx::{Error, SqliteConnection};

use super::list_investigations_for_committee_session;

pub async fn all_investigations_for_committee_session_finished(
    conn: &mut SqliteConnection,
    committee_session_id: u32,
) -> Result<bool, Error> {
    let investigations =
        list_investigations_for_committee_session(conn, committee_session_id).await?;
    for investigation in investigations.iter() {
        if let Some(corrected_results) = investigation.corrected_results {
            if corrected_results
                && !crate::data_entry::repository::result_exists(
                    conn,
                    investigation.polling_station_id,
                )
                .await?
            {
                return Ok(false);
            }
        } else {
            return Ok(false);
        }
    }
    Ok(true)
}
