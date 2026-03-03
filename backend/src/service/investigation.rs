#[derive(Debug)]
pub enum InvestigationServiceError {
    DatabaseError(sqlx::Error),
}

impl From<sqlx::Error> for InvestigationServiceError {
    fn from(err: sqlx::Error) -> Self {
        Self::DatabaseError(err)
    }
}

impl From<super::data_entry::DataEntryServiceError> for InvestigationServiceError {
    fn from(err: super::data_entry::DataEntryServiceError) -> Self {
        match err {
            super::data_entry::DataEntryServiceError::DatabaseError(e) => Self::DatabaseError(e),
        }
    }
}

#[cfg(test)]
pub async fn create_test_investigation(
    conn: &mut sqlx::SqliteConnection,
    polling_station_id: crate::domain::polling_station::PollingStationId,
    corrected_results: Option<bool>,
) -> Result<(), InvestigationServiceError> {
    use crate::{repository::investigation_repo, service::create_empty_data_entry};

    investigation_repo::insert_test_investigation(conn, polling_station_id, corrected_results)
        .await?;

    if corrected_results == Some(true) {
        create_empty_data_entry(conn, polling_station_id).await?;
    }

    Ok(())
}
