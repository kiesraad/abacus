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

pub trait CommitteeSessionHasDataEntriesProvider {
    fn has_data_entries(
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

pub trait CommitteeSessionDataEntriesDefinitiveProvider {
    fn data_entries_definitive(
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
        T: CommitteeSessionHasDataEntriesProvider + CommitteeSessionHasInvestigationsProvider,
    {
        match self {
            CommitteeSessionStatus::Created => Ok(self),
            CommitteeSessionStatus::InPreparation
            | CommitteeSessionStatus::DataEntry
            | CommitteeSessionStatus::Paused
            | CommitteeSessionStatus::Completed => {
                let has_items = if committee_session.is_next_session() {
                    provider.has_investigations(committee_session.id).await?
                } else {
                    provider.has_data_entries(committee_session.id).await?
                };

                if !has_items {
                    Ok(CommitteeSessionStatus::Created)
                } else {
                    Err(CommitteeSessionError::InvalidStatusTransition)
                }
            }
        }
    }

    pub async fn ready_for_data_entry<T>(
        self,
        committee_session: &CommitteeSession,
        provider: &mut T,
    ) -> Result<Self, CommitteeSessionError>
    where
        T: CommitteeSessionHasDataEntriesProvider + CommitteeSessionHasInvestigationsProvider,
    {
        match self {
            CommitteeSessionStatus::Created => {
                let has_items = if committee_session.is_next_session() {
                    provider.has_investigations(committee_session.id).await?
                } else {
                    provider.has_data_entries(committee_session.id).await?
                };

                if has_items {
                    Ok(CommitteeSessionStatus::InPreparation)
                } else {
                    Err(CommitteeSessionError::InvalidStatusTransition)
                }
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
        T: CommitteeSessionDataEntriesDefinitiveProvider,
    {
        match self {
            CommitteeSessionStatus::Created | CommitteeSessionStatus::InPreparation => {
                Err(CommitteeSessionError::InvalidStatusTransition)
            }
            CommitteeSessionStatus::DataEntry | CommitteeSessionStatus::Paused => {
                if provider
                    .data_entries_definitive(committee_session.id)
                    .await?
                {
                    Ok(CommitteeSessionStatus::Completed)
                } else {
                    Err(CommitteeSessionError::InvalidStatusTransition)
                }
            }
            CommitteeSessionStatus::Completed => Ok(self),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // None indicates that we do not expect the provider method to be called
    struct HasDataEntriesOrInvestigationsMock(Option<bool>, Option<bool>);
    struct DataEntriesDefinitiveMock(Option<bool>);

    impl CommitteeSessionHasDataEntriesProvider for HasDataEntriesOrInvestigationsMock {
        async fn has_data_entries(
            &mut self,
            _: CommitteeSessionId,
        ) -> Result<bool, CommitteeSessionError> {
            Ok(self.0.expect("should not call provider method"))
        }
    }

    impl CommitteeSessionHasInvestigationsProvider for HasDataEntriesOrInvestigationsMock {
        async fn has_investigations(
            &mut self,
            _: CommitteeSessionId,
        ) -> Result<bool, CommitteeSessionError> {
            Ok(self.1.expect("should not call provider method"))
        }
    }

    impl CommitteeSessionDataEntriesDefinitiveProvider for DataEntriesDefinitiveMock {
        async fn data_entries_definitive(
            &mut self,
            _: CommitteeSessionId,
        ) -> Result<bool, CommitteeSessionError> {
            Ok(self.0.expect("should not call provider method"))
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
            for (from, session_type, has_data_entries, has_investigations, expected) in [
                // Created stays Created
                (Created, First, None, None, Ok(Created)),
                (Created, Next, None, None, Ok(Created)),
                // First session + no data entries
                (InPreparation, First, Some(false), None, Ok(Created)),
                (DataEntry, First, Some(false), None, Ok(Created)),
                (Paused, First, Some(false), None, Ok(Created)),
                (Completed, First, Some(false), None, Ok(Created)),
                // First session + data entries
                (InPreparation, First, Some(true), None, err()),
                (DataEntry, First, Some(true), None, err()),
                (Paused, First, Some(true), None, err()),
                (Completed, First, Some(true), None, err()),
                // Next session + no investigations
                (InPreparation, Next, None, Some(false), Ok(Created)),
                (DataEntry, Next, None, Some(false), Ok(Created)),
                (Paused, Next, None, Some(false), Ok(Created)),
                (Completed, Next, None, Some(false), Ok(Created)),
                // Next session + investigations
                (InPreparation, Next, None, Some(true), err()),
                (DataEntry, Next, None, Some(true), err()),
                (Paused, Next, None, Some(true), err()),
                (Completed, Next, None, Some(true), err()),
            ] {
                assert_eq!(
                    from.prepare_data_entry(
                        &session(&session_type),
                        &mut HasDataEntriesOrInvestigationsMock(
                            has_data_entries,
                            has_investigations
                        )
                    )
                    .await,
                    expected,
                    "{from:?} (session_type={session_type:?}, has_data_entries={has_data_entries:?}, has_investigations={has_investigations:?})"
                );
            }
        }

        #[test(tokio::test)]
        async fn ready_for_data_entry() {
            use CommitteeSessionStatus::*;
            use SessionType::*;
            for (from, session_type, has_data_entries, has_investigations, expected) in [
                // Created: needs data entries in first session
                (Created, First, Some(false), None, err()),
                (Created, First, Some(true), None, Ok(InPreparation)),
                // Created: needs investigations in next session
                (Created, Next, None, Some(false), err()),
                (Created, Next, None, Some(true), Ok(InPreparation)),
                // InPreparation stays InPreparation
                (InPreparation, First, None, None, Ok(InPreparation)),
                (InPreparation, Next, None, None, Ok(InPreparation)),
                // DataEntry, Paused, Completed are not allowed
                (DataEntry, First, None, None, err()),
                (DataEntry, Next, None, None, err()),
                (Paused, First, None, None, err()),
                (Paused, Next, None, None, err()),
                (Completed, First, None, None, err()),
                (Completed, Next, None, None, err()),
            ] {
                assert_eq!(
                    from.ready_for_data_entry(
                        &session(&session_type),
                        &mut HasDataEntriesOrInvestigationsMock(
                            has_data_entries,
                            has_investigations
                        )
                    )
                    .await,
                    expected,
                    "{from:?} (session_type={session_type:?}, has_data_entries={has_data_entries:?}, has_investigations={has_investigations:?})"
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
            for (from, definitive, expected) in [
                // Created/InPreparation are not allowed
                (Created, None, err()),
                (InPreparation, None, err()),
                // DataEntry/Paused needs complete results
                (DataEntry, Some(false), err()),
                (DataEntry, Some(true), Ok(Completed)),
                (Paused, Some(false), err()),
                (Paused, Some(true), Ok(Completed)),
                // Completed stays Completed
                (Completed, None, Ok(Completed)),
            ] {
                assert_eq!(
                    from.finish_data_entry(
                        &session(&SessionType::First),
                        &mut DataEntriesDefinitiveMock(definitive)
                    )
                    .await,
                    expected,
                    "{from:?} (first session, definitive={definitive:?})"
                );
                assert_eq!(
                    from.finish_data_entry(
                        &session(&SessionType::Next),
                        &mut DataEntriesDefinitiveMock(definitive)
                    )
                    .await,
                    expected,
                    "{from:?} (next session, definitive={definitive:?})"
                );
            }
        }
    }
}
