#[cfg(test)]
use crate::repository::polling_station_repo;

#[cfg(test)]
#[derive(Debug)]
pub enum InvestigationServiceError {
    DatabaseError(sqlx::Error),
    DataEntryAlreadyLinked,
}

#[cfg(test)]
impl From<sqlx::Error> for InvestigationServiceError {
    fn from(err: sqlx::Error) -> Self {
        Self::DatabaseError(err)
    }
}

#[cfg(test)]
impl From<polling_station_repo::CreateDataEntryError> for InvestigationServiceError {
    fn from(err: polling_station_repo::CreateDataEntryError) -> Self {
        match err {
            polling_station_repo::CreateDataEntryError::Sqlx(e) => Self::DatabaseError(e),
            polling_station_repo::CreateDataEntryError::DataEntryAlreadyLinked => {
                Self::DataEntryAlreadyLinked
            }
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
        domain::investigation::InvestigationStatus,
        repository::{investigation_repo, polling_station_repo},
    };

    let status = match corrected_results {
        None => InvestigationStatus::new("Test reason".to_string()),
        Some(false) => InvestigationStatus::new("Test reason".to_string())
            .conclude_without_new_results("Test findings".to_string(), false)
            .expect("conclude_without_new_results should succeed"),
        Some(true) => {
            let data_entry_id =
                polling_station_repo::create_data_entry(conn, polling_station_id).await?;
            InvestigationStatus::new("Test reason".to_string())
                .conclude_with_new_results("Test findings".to_string(), data_entry_id)
                .expect("conclude_with_new_results should succeed")
        }
    };

    investigation_repo::insert_test_investigation(conn, polling_station_id, &status).await?;
    Ok(())
}
