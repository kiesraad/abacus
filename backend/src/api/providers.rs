use sqlx::SqliteConnection;

use crate::{
    api::committee_session::CommitteeSessionError,
    domain::{
        committee_session::CommitteeSessionId,
        committee_session_status::{
            CommitteeSessionHasInvestigationsProvider, CommitteeSessionHasPollingStationsProvider,
            DataEntryCompleteResultsProvider,
        },
    },
    repository::{data_entry_repo, investigation_repo, polling_station_repo},
};

impl CommitteeSessionHasPollingStationsProvider for SqliteConnection {
    async fn has_polling_stations(
        &mut self,
        committee_session_id: CommitteeSessionId,
    ) -> Result<bool, CommitteeSessionError> {
        let polling_stations = polling_station_repo::list(self, committee_session_id).await?;
        Ok(!polling_stations.is_empty())
    }
}

impl CommitteeSessionHasInvestigationsProvider for SqliteConnection {
    async fn has_investigations(
        &mut self,
        committee_session_id: CommitteeSessionId,
    ) -> Result<bool, CommitteeSessionError> {
        let investigations = investigation_repo::list_investigations_for_committee_session(
            self,
            committee_session_id,
        )
        .await?;
        Ok(!investigations.is_empty())
    }
}

impl DataEntryCompleteResultsProvider for SqliteConnection {
    async fn has_complete_results(
        &mut self,
        committee_session_id: CommitteeSessionId,
    ) -> Result<bool, CommitteeSessionError> {
        Ok(
            data_entry_repo::are_results_complete_for_committee_session(self, committee_session_id)
                .await?,
        )
    }
}
