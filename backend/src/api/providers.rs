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
        Ok(polling_station_repo::has_any(self, committee_session_id).await?)
    }
}

impl CommitteeSessionHasInvestigationsProvider for SqliteConnection {
    async fn has_investigations(
        &mut self,
        committee_session_id: CommitteeSessionId,
    ) -> Result<bool, CommitteeSessionError> {
        Ok(
            investigation_repo::has_investigations_for_committee_session(
                self,
                committee_session_id,
            )
            .await?,
        )
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
