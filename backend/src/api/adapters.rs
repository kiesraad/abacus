use sqlx::SqliteConnection;

use crate::{
    domain::{
        committee_session::CommitteeSessionResultsQueries,
        committee_session_status::{CommitteeSessionError, CommitteeSessionStatusQueries},
    },
    repository::{investigation_repo, polling_station_repo, polling_station_result_repo},
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
}

pub struct CommitteeSessionResultsQueriesAdapter<'a>(pub &'a mut SqliteConnection);

impl CommitteeSessionResultsQueries for CommitteeSessionResultsQueriesAdapter<'_> {
    async fn polling_stations_finished(
        &mut self,
        committee_session_id: u32,
    ) -> Result<bool, CommitteeSessionError> {
        let all_new_ps_have_data = polling_station_result_repo::all_polling_stations_have_results(
            self.0,
            committee_session_id,
        )
        .await?;
        Ok(all_new_ps_have_data)
    }

    async fn investigations_finished(
        &mut self,
        committee_session_id: u32,
    ) -> Result<bool, CommitteeSessionError> {
        let all_investigations_finished =
            polling_station_result_repo::all_investigations_finished(self.0, committee_session_id)
                .await?;
        Ok(all_investigations_finished)
    }
}
