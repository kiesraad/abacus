use sqlx::SqliteConnection;

use crate::{
    domain::committee_session_status::{CommitteeSessionError, CommitteeSessionStatusQueries},
    repository::{investigation_repo, polling_station_repo},
    service::data_entry::are_results_complete_for_committee_session,
};

pub struct CommitteeSessionStatusQueriesAdapter<'a>(pub &'a mut SqliteConnection);

impl From<sqlx::Error> for CommitteeSessionError {
    fn from(_: sqlx::Error) -> Self {
        CommitteeSessionError::InvalidStatusTransition
    }
}

impl CommitteeSessionStatusQueries for CommitteeSessionStatusQueriesAdapter<'_> {
    async fn has_polling_stations(
        &mut self,
        committee_session_id: u32,
    ) -> Result<bool, CommitteeSessionError> {
        let polling_stations = polling_station_repo::list(self.0, committee_session_id).await?;
        Ok(!polling_stations.is_empty())
    }

    async fn has_investigations(
        &mut self,
        committee_session_id: u32,
    ) -> Result<bool, CommitteeSessionError> {
        let investigations = investigation_repo::list_investigations_for_committee_session(
            self.0,
            committee_session_id,
        )
        .await?;
        Ok(!investigations.is_empty())
    }

    async fn results_complete(
        &mut self,
        committee_session_id: u32,
    ) -> Result<bool, CommitteeSessionError> {
        Ok(are_results_complete_for_committee_session(self.0, committee_session_id).await?)
        // if !are_results_complete_for_committee_session(conn, committee_session.id).await? {
    }
}
