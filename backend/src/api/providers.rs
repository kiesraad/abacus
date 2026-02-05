use sqlx::SqliteConnection;

use crate::{
    domain::{
        committee_session::{CommitteeSessionError, CommitteeSessionId},
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
        polling_station_repo::has_any(self, committee_session_id)
            .await
            .map_err(|_| CommitteeSessionError::ProviderError)
    }
}

impl CommitteeSessionHasInvestigationsProvider for SqliteConnection {
    async fn has_investigations(
        &mut self,
        committee_session_id: CommitteeSessionId,
    ) -> Result<bool, CommitteeSessionError> {
        investigation_repo::has_investigations_for_committee_session(self, committee_session_id)
            .await
            .map_err(|_| CommitteeSessionError::ProviderError)
    }
}

impl DataEntryCompleteResultsProvider for SqliteConnection {
    async fn has_complete_results(
        &mut self,
        committee_session_id: CommitteeSessionId,
    ) -> Result<bool, CommitteeSessionError> {
        data_entry_repo::are_results_complete_for_committee_session(self, committee_session_id)
            .await
            .map_err(|_| CommitteeSessionError::ProviderError)
    }
}
