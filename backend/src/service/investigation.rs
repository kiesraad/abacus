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
    use crate::{
        domain::investigation::InvestigationStatus, repository::investigation_repo,
        service::create_empty_data_entry,
    };

    let status = match corrected_results {
        None => InvestigationStatus::new("Test reason".to_string()),
        Some(false) => InvestigationStatus::new("Test reason".to_string())
            .conclude_without_new_results("Test findings".to_string(), true)
            .expect("conclude_without_new_results should succeed"),
        Some(true) => {
            let ps = create_empty_data_entry(conn, polling_station_id).await?;
            let data_entry_id = ps
                .data_entry_id
                .expect("create_empty_data_entry should set data_entry_id");
            InvestigationStatus::new("Test reason".to_string())
                .conclude_with_new_results("Test findings".to_string(), data_entry_id)
                .expect("conclude_with_new_results should succeed")
        }
    };

    investigation_repo::insert_test_investigation(conn, polling_station_id, &status).await?;
    Ok(())
}
