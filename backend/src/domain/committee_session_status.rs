use serde::{Deserialize, Serialize};
use sqlx::Type;
use strum::VariantNames;
use utoipa::ToSchema;

use crate::domain::committee_session::{
    CommitteeSession, CommitteeSessionError, CommitteeSessionId,
};

/// Committee session status
#[derive(
    Serialize,
    Deserialize,
    VariantNames,
    Clone,
    Copy,
    Debug,
    PartialEq,
    Eq,
    Hash,
    ToSchema,
    Type,
    strum::Display,
)]
#[serde(rename_all = "snake_case")]
#[strum(serialize_all = "snake_case")]
#[sqlx(rename_all = "snake_case")]
#[derive(Default)]
pub enum CommitteeSessionStatus {
    #[default]
    Created,
    InPreparation,
    DataEntry,
    Paused,
    Completed,
}

pub trait CommitteeSessionHasPollingStationsProvider {
    fn has_polling_stations(
        &mut self,
        committee_session_id: CommitteeSessionId,
    ) -> impl Future<Output = Result<bool, CommitteeSessionError>>;
}

pub trait CommitteeSessionHasInvestigationsProvider {
    fn has_investigations(
        &mut self,
        committee_session_id: CommitteeSessionId,
    ) -> impl Future<Output = Result<bool, CommitteeSessionError>>;
}

pub trait DataEntryCompleteResultsProvider {
    fn has_complete_results(
        &mut self,
        committee_session_id: CommitteeSessionId,
    ) -> impl Future<Output = Result<bool, CommitteeSessionError>>;
}

impl CommitteeSessionStatus {
    pub async fn prepare_data_entry<T>(
        self,
        committee_session: &CommitteeSession,
        provider: &mut T,
    ) -> Result<Self, CommitteeSessionError>
    where
        T: CommitteeSessionHasPollingStationsProvider + CommitteeSessionHasInvestigationsProvider,
    {
        match self {
            CommitteeSessionStatus::Created => Ok(self),
            CommitteeSessionStatus::InPreparation
            | CommitteeSessionStatus::DataEntry
            | CommitteeSessionStatus::Paused
            | CommitteeSessionStatus::Completed => {
                if !provider.has_polling_stations(committee_session.id).await?
                    || (committee_session.is_next_session()
                        && !provider.has_investigations(committee_session.id).await?)
                {
                    return Ok(CommitteeSessionStatus::Created);
                }
                Err(CommitteeSessionError::InvalidStatusTransition)
            }
        }
    }

    pub async fn ready_for_data_entry<T>(
        self,
        committee_session: &CommitteeSession,
        provider: &mut T,
    ) -> Result<Self, CommitteeSessionError>
    where
        T: CommitteeSessionHasPollingStationsProvider + CommitteeSessionHasInvestigationsProvider,
    {
        match self {
            CommitteeSessionStatus::Created => {
                if !provider.has_polling_stations(committee_session.id).await?
                    || (committee_session.is_next_session()
                        && !provider.has_investigations(committee_session.id).await?)
                {
                    return Err(CommitteeSessionError::InvalidStatusTransition);
                }
                Ok(CommitteeSessionStatus::InPreparation)
            }
            CommitteeSessionStatus::InPreparation => Ok(self),
            CommitteeSessionStatus::DataEntry
            | CommitteeSessionStatus::Paused
            | CommitteeSessionStatus::Completed => {
                Err(CommitteeSessionError::InvalidStatusTransition)
            }
        }
    }

    pub fn start_data_entry(self) -> Result<Self, CommitteeSessionError> {
        match self {
            CommitteeSessionStatus::Created => Err(CommitteeSessionError::InvalidStatusTransition),
            CommitteeSessionStatus::InPreparation => Ok(CommitteeSessionStatus::DataEntry),
            CommitteeSessionStatus::DataEntry => Ok(self),
            CommitteeSessionStatus::Paused | CommitteeSessionStatus::Completed => {
                Ok(CommitteeSessionStatus::DataEntry)
            }
        }
    }

    pub fn pause_data_entry(self) -> Result<Self, CommitteeSessionError> {
        match self {
            CommitteeSessionStatus::Created | CommitteeSessionStatus::InPreparation => {
                Err(CommitteeSessionError::InvalidStatusTransition)
            }
            CommitteeSessionStatus::DataEntry => Ok(CommitteeSessionStatus::Paused),
            CommitteeSessionStatus::Paused => Ok(self),
            CommitteeSessionStatus::Completed => {
                Err(CommitteeSessionError::InvalidStatusTransition)
            }
        }
    }

    pub async fn finish_data_entry<T>(
        self,
        committee_session: &CommitteeSession,
        provider: &mut T,
    ) -> Result<Self, CommitteeSessionError>
    where
        T: DataEntryCompleteResultsProvider,
    {
        match self {
            CommitteeSessionStatus::Created | CommitteeSessionStatus::InPreparation => {
                Err(CommitteeSessionError::InvalidStatusTransition)
            }
            CommitteeSessionStatus::DataEntry | CommitteeSessionStatus::Paused => {
                if !provider.has_complete_results(committee_session.id).await? {
                    return Err(CommitteeSessionError::InvalidStatusTransition);
                }
                Ok(CommitteeSessionStatus::Completed)
            }
            CommitteeSessionStatus::Completed => Ok(self),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    struct HasPollingStationsOrInvestigationsMock(bool, bool);
    struct HasCompleteResultsMock(bool);

    impl CommitteeSessionHasPollingStationsProvider for HasPollingStationsOrInvestigationsMock {
        async fn has_polling_stations(
            &mut self,
            _: CommitteeSessionId,
        ) -> Result<bool, CommitteeSessionError> {
            Ok(self.0)
        }
    }

    impl CommitteeSessionHasInvestigationsProvider for HasPollingStationsOrInvestigationsMock {
        async fn has_investigations(
            &mut self,
            _: CommitteeSessionId,
        ) -> Result<bool, CommitteeSessionError> {
            Ok(self.1)
        }
    }

    impl DataEntryCompleteResultsProvider for HasCompleteResultsMock {
        async fn has_complete_results(
            &mut self,
            _: CommitteeSessionId,
        ) -> Result<bool, CommitteeSessionError> {
            Ok(self.0)
        }
    }

    mod status_transitions {
        use test_log::test;

        use super::*;

        #[derive(Debug)]
        enum SessionType {
            First,
            Next,
        }

        fn err() -> Result<CommitteeSessionStatus, CommitteeSessionError> {
            Err(CommitteeSessionError::InvalidStatusTransition)
        }

        fn session(session_type: &SessionType) -> CommitteeSession {
            match session_type {
                SessionType::First => CommitteeSession::first_session(),
                SessionType::Next => CommitteeSession::next_session(),
            }
        }

        #[test(tokio::test)]
        async fn prepare_data_entry() {
            use CommitteeSessionStatus::*;
            use SessionType::*;
            for (from, session_type, has_polling_stations, has_investigations, expected) in [
                // Created stays Created
                (Created, First, false, false, Ok(Created)),
                (Created, First, true, false, Ok(Created)),
                (Created, Next, true, true, Ok(Created)),
                (Created, Next, true, false, Ok(Created)),
                // No polling stations
                (InPreparation, First, false, false, Ok(Created)),
                (DataEntry, First, false, false, Ok(Created)),
                (Paused, First, false, false, Ok(Created)),
                (Completed, First, false, false, Ok(Created)),
                // First session + polling stations
                (InPreparation, First, true, false, err()),
                (DataEntry, First, true, false, err()),
                (Paused, First, true, false, err()),
                (Completed, First, true, false, err()),
                // Next session + polling stations but no investigations
                (InPreparation, Next, true, false, Ok(Created)),
                (DataEntry, Next, true, false, Ok(Created)),
                (Paused, Next, true, false, Ok(Created)),
                (Completed, Next, true, false, Ok(Created)),
                // Next session + polling stations + investigations
                (InPreparation, Next, true, true, err()),
                (DataEntry, Next, true, true, err()),
                (Paused, Next, true, true, err()),
                (Completed, Next, true, true, err()),
            ] {
                assert_eq!(
                    from.prepare_data_entry(
                        &session(&session_type),
                        &mut HasPollingStationsOrInvestigationsMock(
                            has_polling_stations,
                            has_investigations
                        )
                    )
                    .await,
                    expected,
                    "{from:?} (session_type={session_type:?}, has_polling_stations={has_polling_stations}, has_investigations={has_investigations})"
                );
            }
        }

        #[test(tokio::test)]
        async fn ready_for_data_entry() {
            use CommitteeSessionStatus::*;
            use SessionType::*;
            for (from, session_type, has_polling_stations, has_investigations, expected) in [
                // Created: needs polling stations in first session
                (Created, First, false, false, err()),
                (Created, First, true, false, Ok(InPreparation)),
                // Created: needs polling stations and investigations in next session
                (Created, Next, false, false, err()),
                (Created, Next, true, false, err()),
                (Created, Next, true, true, Ok(InPreparation)),
                // InPreparation stays InPreparation
                (InPreparation, First, true, false, Ok(InPreparation)),
                (InPreparation, Next, true, true, Ok(InPreparation)),
                // DataEntry, Paused, Completed are not allowed
                (DataEntry, First, true, false, err()),
                (DataEntry, Next, true, true, err()),
                (Paused, First, true, false, err()),
                (Paused, Next, true, true, err()),
                (Completed, First, true, false, err()),
                (Completed, Next, true, true, err()),
            ] {
                assert_eq!(
                    from.ready_for_data_entry(
                        &session(&session_type),
                        &mut HasPollingStationsOrInvestigationsMock(
                            has_polling_stations,
                            has_investigations
                        )
                    )
                    .await,
                    expected,
                    "{from:?} (session_type={session_type:?}, has_polling_stations={has_polling_stations}, has_investigations={has_investigations})"
                );
            }
        }

        #[test]
        fn start_data_entry() {
            use CommitteeSessionStatus::*;
            for (from, expected) in [
                (Created, err()),
                (InPreparation, Ok(DataEntry)),
                (DataEntry, Ok(DataEntry)),
                (Paused, Ok(DataEntry)),
                (Completed, Ok(DataEntry)),
            ] {
                assert_eq!(from.start_data_entry(), expected, "{from:?}");
            }
        }

        #[test]
        fn pause_data_entry() {
            use CommitteeSessionStatus::*;
            for (from, expected) in [
                (Created, err()),
                (InPreparation, err()),
                (DataEntry, Ok(Paused)),
                (Paused, Ok(Paused)),
                (Completed, err()),
            ] {
                assert_eq!(from.pause_data_entry(), expected, "{from:?}");
            }
        }

        #[test(tokio::test)]
        async fn finish_data_entry() {
            use CommitteeSessionStatus::*;
            for (from, has_complete_results, expected) in [
                // Created/InPreparation are not allowed
                (Created, false, err()),
                (Created, true, err()),
                (InPreparation, false, err()),
                (InPreparation, true, err()),
                // DataEntry/Paused needs complete results
                (DataEntry, false, err()),
                (DataEntry, true, Ok(Completed)),
                (Paused, false, err()),
                (Paused, true, Ok(Completed)),
                // Completed stays Completed
                (Completed, false, Ok(Completed)),
                (Completed, true, Ok(Completed)),
            ] {
                assert_eq!(
                    from.finish_data_entry(
                        &session(&SessionType::First),
                        &mut HasCompleteResultsMock(has_complete_results)
                    )
                    .await,
                    expected,
                    "{from:?} (first session, has_complete_results={has_complete_results})"
                );
                assert_eq!(
                    from.finish_data_entry(
                        &session(&SessionType::Next),
                        &mut HasCompleteResultsMock(has_complete_results)
                    )
                    .await,
                    expected,
                    "{from:?} (next session, has_complete_results={has_complete_results})"
                );
            }
        }
    }
}
