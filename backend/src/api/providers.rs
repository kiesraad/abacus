use sqlx::SqliteConnection;

use crate::{
    domain::{
        committee_session::{CommitteeSessionError, CommitteeSessionId},
        committee_session_status::{
            CommitteeSessionDataEntriesDefinitiveProvider, CommitteeSessionHasDataEntriesProvider,
            CommitteeSessionHasInvestigationsProvider,
        },
    },
    repository::{data_entry_repo, investigation_repo},
};

impl CommitteeSessionHasDataEntriesProvider for SqliteConnection {
    async fn has_data_entries(
        &mut self,
        committee_session_id: CommitteeSessionId,
    ) -> Result<bool, CommitteeSessionError> {
        data_entry_repo::has_any(self, committee_session_id)
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

impl CommitteeSessionDataEntriesDefinitiveProvider for SqliteConnection {
    async fn data_entries_definitive(
        &mut self,
        committee_session_id: CommitteeSessionId,
    ) -> Result<bool, CommitteeSessionError> {
        data_entry_repo::are_results_complete_for_committee_session(self, committee_session_id)
            .await
            .map_err(|_| CommitteeSessionError::ProviderError)
    }
}
