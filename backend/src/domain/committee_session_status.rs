use serde::{Deserialize, Serialize};
use sqlx::Type;
use strum::VariantNames;
use utoipa::ToSchema;

use crate::domain::committee_session::{CommitteeSession, CommitteeSessionResultsQueries};

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
    DataEntryNotStarted,
    DataEntryInProgress,
    DataEntryPaused,
    DataEntryFinished,
}

#[derive(Debug, PartialEq, Eq)]
pub enum CommitteeSessionError {
    CommitteeSessionPaused,
    InvalidCommitteeSessionStatus,
    InvalidDetails,
    InvalidStatusTransition,
}

pub trait CommitteeSessionStatusQueries {
    fn has_polling_stations(
        &mut self,
        committee_session_id: u32,
    ) -> impl Future<Output = Result<bool, CommitteeSessionError>>;

    fn has_investigations(
        &mut self,
        committee_session_id: u32,
    ) -> impl Future<Output = Result<bool, CommitteeSessionError>>;
}

impl CommitteeSessionStatus {
    pub async fn prepare_data_entry(
        self,
        committee_session: &CommitteeSession,
        queries: &mut impl CommitteeSessionStatusQueries,
    ) -> Result<Self, CommitteeSessionError> {
        match self {
            CommitteeSessionStatus::Created => Ok(self),
            CommitteeSessionStatus::DataEntryNotStarted
            | CommitteeSessionStatus::DataEntryInProgress
            | CommitteeSessionStatus::DataEntryPaused
            | CommitteeSessionStatus::DataEntryFinished => {
                if !queries.has_polling_stations(committee_session.id).await?
                    || (committee_session.is_next_session()
                        && !queries.has_investigations(committee_session.id).await?)
                {
                    return Ok(CommitteeSessionStatus::Created);
                }
                Err(CommitteeSessionError::InvalidStatusTransition)
            }
        }
    }

    pub async fn ready_for_data_entry(
        self,
        committee_session: &CommitteeSession,
        queries: &mut impl CommitteeSessionStatusQueries,
    ) -> Result<Self, CommitteeSessionError> {
        match self {
            CommitteeSessionStatus::Created => {
                if !queries.has_polling_stations(committee_session.id).await? {
                    Err(CommitteeSessionError::InvalidStatusTransition)
                } else if committee_session.is_next_session() {
                    if !queries.has_investigations(committee_session.id).await? {
                        Err(CommitteeSessionError::InvalidStatusTransition)
                    } else {
                        Ok(CommitteeSessionStatus::DataEntryNotStarted)
                    }
                } else {
                    Ok(CommitteeSessionStatus::DataEntryNotStarted)
                }
            }
            CommitteeSessionStatus::DataEntryNotStarted => Ok(self),
            CommitteeSessionStatus::DataEntryInProgress
            | CommitteeSessionStatus::DataEntryPaused
            | CommitteeSessionStatus::DataEntryFinished => {
                Err(CommitteeSessionError::InvalidStatusTransition)
            }
        }
    }

    pub fn start_data_entry(self) -> Result<Self, CommitteeSessionError> {
        match self {
            CommitteeSessionStatus::Created => Err(CommitteeSessionError::InvalidStatusTransition),
            CommitteeSessionStatus::DataEntryNotStarted => {
                Ok(CommitteeSessionStatus::DataEntryInProgress)
            }
            CommitteeSessionStatus::DataEntryInProgress => Ok(self),
            CommitteeSessionStatus::DataEntryPaused | CommitteeSessionStatus::DataEntryFinished => {
                Ok(CommitteeSessionStatus::DataEntryInProgress)
            }
        }
    }

    pub fn pause_data_entry(self) -> Result<Self, CommitteeSessionError> {
        match self {
            CommitteeSessionStatus::Created | CommitteeSessionStatus::DataEntryNotStarted => {
                Err(CommitteeSessionError::InvalidStatusTransition)
            }
            CommitteeSessionStatus::DataEntryInProgress => {
                Ok(CommitteeSessionStatus::DataEntryPaused)
            }
            CommitteeSessionStatus::DataEntryPaused => Ok(self),
            CommitteeSessionStatus::DataEntryFinished => {
                Err(CommitteeSessionError::InvalidStatusTransition)
            }
        }
    }

    pub async fn finish_data_entry(
        self,
        committee_session: &CommitteeSession,
        results_queries: &mut impl CommitteeSessionResultsQueries,
    ) -> Result<Self, CommitteeSessionError> {
        match self {
            CommitteeSessionStatus::Created | CommitteeSessionStatus::DataEntryNotStarted => {
                Err(CommitteeSessionError::InvalidStatusTransition)
            }
            CommitteeSessionStatus::DataEntryInProgress
            | CommitteeSessionStatus::DataEntryPaused => {
                if !committee_session
                    .are_results_complete(results_queries)
                    .await?
                {
                    Err(CommitteeSessionError::InvalidStatusTransition)
                } else {
                    Ok(CommitteeSessionStatus::DataEntryFinished)
                }
            }
            CommitteeSessionStatus::DataEntryFinished => Ok(self),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[derive(Default)]
    struct CommitteeSessionStatusQueriesMock {
        has_polling_stations: bool,
        has_investigations: bool,
    }

    impl CommitteeSessionStatusQueries for CommitteeSessionStatusQueriesMock {
        async fn has_polling_stations(&mut self, _: u32) -> Result<bool, CommitteeSessionError> {
            Ok(self.has_polling_stations)
        }

        async fn has_investigations(&mut self, _: u32) -> Result<bool, CommitteeSessionError> {
            Ok(self.has_investigations)
        }
    }

    struct CommitteeSessionResultsQueriesMock(bool);

    impl CommitteeSessionResultsQueries for CommitteeSessionResultsQueriesMock {
        async fn polling_stations_finished(
            &mut self,
            _: u32,
        ) -> Result<bool, CommitteeSessionError> {
            Ok(self.0)
        }

        async fn investigations_finished(&mut self, _: u32) -> Result<bool, CommitteeSessionError> {
            panic!("should not call investigations_finished()")
        }
    }

    mod prepare_data_entry {
        use test_log::test;

        use super::*;

        /// Created --> Created
        #[test(tokio::test)]
        async fn created_to_created_no_polling_stations() {
            assert_eq!(
                CommitteeSessionStatus::Created
                    .prepare_data_entry(
                        &CommitteeSession::first_session(),
                        &mut CommitteeSessionStatusQueriesMock::default()
                    )
                    .await,
                Ok(CommitteeSessionStatus::Created)
            );
        }

        /// DataEntryNotStarted --> Created
        #[test(tokio::test)]
        async fn data_entry_not_started_to_created_no_polling_stations() {
            assert_eq!(
                CommitteeSessionStatus::DataEntryNotStarted
                    .prepare_data_entry(
                        &CommitteeSession::first_session(),
                        &mut CommitteeSessionStatusQueriesMock::default()
                    )
                    .await,
                Ok(CommitteeSessionStatus::Created)
            );
        }

        /// DataEntryNotStarted --> Created
        #[test(tokio::test)]
        async fn data_entry_not_started_to_created_with_polling_stations() {
            assert_eq!(
                CommitteeSessionStatus::DataEntryNotStarted
                    .prepare_data_entry(
                        &CommitteeSession::first_session(),
                        &mut CommitteeSessionStatusQueriesMock {
                            has_polling_stations: true,
                            has_investigations: false,
                        }
                    )
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// DataEntryNotStarted --> Created
        #[test(tokio::test)]
        async fn data_entry_not_started_to_created_next_session_no_investigation() {
            assert_eq!(
                CommitteeSessionStatus::DataEntryNotStarted
                    .prepare_data_entry(
                        &CommitteeSession::next_session(),
                        &mut CommitteeSessionStatusQueriesMock::default()
                    )
                    .await,
                Ok(CommitteeSessionStatus::Created)
            );
        }

        /// DataEntryNotStarted --> Created
        #[test(tokio::test)]
        async fn data_entry_not_started_to_created_next_session_with_investigation() {
            assert_eq!(
                CommitteeSessionStatus::DataEntryNotStarted
                    .prepare_data_entry(
                        &CommitteeSession::next_session(),
                        &mut CommitteeSessionStatusQueriesMock {
                            has_polling_stations: true,
                            has_investigations: true,
                        }
                    )
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// DataEntryInProgress --> Created
        #[test(tokio::test)]
        async fn data_entry_in_progress_to_created_no_polling_stations() {
            assert_eq!(
                CommitteeSessionStatus::DataEntryInProgress
                    .prepare_data_entry(
                        &CommitteeSession::first_session(),
                        &mut CommitteeSessionStatusQueriesMock::default()
                    )
                    .await,
                Ok(CommitteeSessionStatus::Created)
            );
        }

        /// DataEntryInProgress --> Created
        #[test(tokio::test)]
        async fn data_entry_in_progress_to_created_with_polling_stations() {
            assert_eq!(
                CommitteeSessionStatus::DataEntryInProgress
                    .prepare_data_entry(
                        &CommitteeSession::first_session(),
                        &mut CommitteeSessionStatusQueriesMock {
                            has_polling_stations: true,
                            has_investigations: false,
                        }
                    )
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// DataEntryInProgress --> Created
        #[test(tokio::test)]
        async fn data_entry_in_progress_to_created_next_session_no_investigation() {
            assert_eq!(
                CommitteeSessionStatus::DataEntryInProgress
                    .prepare_data_entry(
                        &CommitteeSession::next_session(),
                        &mut CommitteeSessionStatusQueriesMock {
                            has_polling_stations: true,
                            has_investigations: false,
                        }
                    )
                    .await,
                Ok(CommitteeSessionStatus::Created)
            );
        }

        /// DataEntryInProgress --> Created
        #[test(tokio::test)]
        async fn data_entry_in_progress_to_created_next_session_with_investigation() {
            assert_eq!(
                CommitteeSessionStatus::DataEntryInProgress
                    .prepare_data_entry(
                        &CommitteeSession::next_session(),
                        &mut CommitteeSessionStatusQueriesMock {
                            has_polling_stations: true,
                            has_investigations: true,
                        }
                    )
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// DataEntryPaused --> Created
        #[test(tokio::test)]
        async fn data_entry_paused_to_created_no_polling_stations() {
            assert_eq!(
                CommitteeSessionStatus::DataEntryPaused
                    .prepare_data_entry(
                        &CommitteeSession::first_session(),
                        &mut CommitteeSessionStatusQueriesMock::default()
                    )
                    .await,
                Ok(CommitteeSessionStatus::Created)
            );
        }

        /// DataEntryPaused --> Created
        #[test(tokio::test)]
        async fn data_entry_paused_to_created_with_polling_stations() {
            assert_eq!(
                CommitteeSessionStatus::DataEntryPaused
                    .prepare_data_entry(
                        &CommitteeSession::first_session(),
                        &mut CommitteeSessionStatusQueriesMock {
                            has_polling_stations: true,
                            has_investigations: true,
                        }
                    )
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// DataEntryPaused --> Created
        #[test(tokio::test)]
        async fn data_entry_paused_to_created_next_session_no_investigation() {
            assert_eq!(
                CommitteeSessionStatus::DataEntryPaused
                    .prepare_data_entry(
                        &CommitteeSession::next_session(),
                        &mut CommitteeSessionStatusQueriesMock {
                            has_polling_stations: true,
                            has_investigations: false,
                        }
                    )
                    .await,
                Ok(CommitteeSessionStatus::Created)
            );
        }

        /// DataEntryPaused --> Created
        #[test(tokio::test)]
        async fn data_entry_paused_to_created_next_session_with_investigation() {
            assert_eq!(
                CommitteeSessionStatus::DataEntryPaused
                    .prepare_data_entry(
                        &CommitteeSession::next_session(),
                        &mut CommitteeSessionStatusQueriesMock {
                            has_polling_stations: true,
                            has_investigations: true,
                        }
                    )
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// DataEntryFinished --> Created
        #[test(tokio::test)]
        async fn data_entry_finished_to_created_no_polling_stations() {
            assert_eq!(
                CommitteeSessionStatus::DataEntryFinished
                    .prepare_data_entry(
                        &CommitteeSession::first_session(),
                        &mut CommitteeSessionStatusQueriesMock {
                            has_polling_stations: false,
                            has_investigations: false,
                        }
                    )
                    .await,
                Ok(CommitteeSessionStatus::Created)
            );
        }

        /// DataEntryFinished --> Created
        #[test(tokio::test)]
        async fn data_entry_finished_to_created_with_polling_stations() {
            assert_eq!(
                CommitteeSessionStatus::DataEntryFinished
                    .prepare_data_entry(
                        &CommitteeSession::first_session(),
                        &mut CommitteeSessionStatusQueriesMock {
                            has_polling_stations: true,
                            has_investigations: false,
                        }
                    )
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// DataEntryFinished --> Created
        #[test(tokio::test)]
        async fn data_entry_finished_to_created_next_session_no_investigation() {
            assert_eq!(
                CommitteeSessionStatus::DataEntryFinished
                    .prepare_data_entry(
                        &CommitteeSession::next_session(),
                        &mut CommitteeSessionStatusQueriesMock {
                            has_polling_stations: true,
                            has_investigations: false,
                        }
                    )
                    .await,
                Ok(CommitteeSessionStatus::Created)
            );
        }

        /// DataEntryFinished --> Created
        #[test(tokio::test)]
        async fn data_entry_finished_to_created_next_session_with_investigation() {
            assert_eq!(
                CommitteeSessionStatus::DataEntryFinished
                    .prepare_data_entry(
                        &CommitteeSession::next_session(),
                        &mut CommitteeSessionStatusQueriesMock {
                            has_polling_stations: true,
                            has_investigations: true,
                        }
                    )
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }
    }

    mod ready_for_data_entry {
        use test_log::test;

        use super::*;

        /// Created --> DataEntryNotStarted
        #[test(tokio::test)]
        async fn created_to_data_entry_not_started_no_polling_stations() {
            assert_eq!(
                CommitteeSessionStatus::Created
                    .ready_for_data_entry(
                        &CommitteeSession::first_session(),
                        &mut CommitteeSessionStatusQueriesMock::default()
                    )
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// Created --> DataEntryNotStarted
        #[test(tokio::test)]
        async fn created_to_data_entry_not_started_with_polling_stations() {
            assert_eq!(
                CommitteeSessionStatus::Created
                    .ready_for_data_entry(
                        &CommitteeSession::first_session(),
                        &mut CommitteeSessionStatusQueriesMock {
                            has_polling_stations: true,
                            has_investigations: false,
                        }
                    )
                    .await,
                Ok(CommitteeSessionStatus::DataEntryNotStarted)
            );
        }

        /// Created --> DataEntryNotStarted
        #[test(tokio::test)]
        async fn created_to_data_entry_not_started_next_session_no_investigation() {
            assert_eq!(
                CommitteeSessionStatus::Created
                    .ready_for_data_entry(
                        &CommitteeSession::next_session(),
                        &mut CommitteeSessionStatusQueriesMock {
                            has_polling_stations: true,
                            has_investigations: false,
                        }
                    )
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// Created --> DataEntryNotStarted
        #[test(tokio::test)]
        async fn created_to_data_entry_not_started_next_session_with_investigation() {
            assert_eq!(
                CommitteeSessionStatus::Created
                    .ready_for_data_entry(
                        &CommitteeSession::next_session(),
                        &mut CommitteeSessionStatusQueriesMock {
                            has_polling_stations: true,
                            has_investigations: true,
                        }
                    )
                    .await,
                Ok(CommitteeSessionStatus::DataEntryNotStarted)
            );
        }

        /// DataEntryNotStarted --> DataEntryNotStarted
        #[test(tokio::test)]
        async fn data_entry_not_started_to_data_entry_not_started() {
            assert_eq!(
                CommitteeSessionStatus::DataEntryNotStarted
                    .ready_for_data_entry(
                        &CommitteeSession::first_session(),
                        &mut CommitteeSessionStatusQueriesMock::default()
                    )
                    .await,
                Ok(CommitteeSessionStatus::DataEntryNotStarted)
            );
        }

        /// DataEntryInProgress --> DataEntryNotStarted
        #[test(tokio::test)]
        async fn data_entry_in_progress_to_data_entry_not_started() {
            assert_eq!(
                CommitteeSessionStatus::DataEntryInProgress
                    .ready_for_data_entry(
                        &CommitteeSession::first_session(),
                        &mut CommitteeSessionStatusQueriesMock::default()
                    )
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// DataEntryPaused --> DataEntryNotStarted
        #[test(tokio::test)]
        async fn data_entry_paused_to_data_entry_not_started() {
            assert_eq!(
                CommitteeSessionStatus::DataEntryPaused
                    .ready_for_data_entry(
                        &CommitteeSession::first_session(),
                        &mut CommitteeSessionStatusQueriesMock::default()
                    )
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// DataEntryFinished --> DataEntryNotStarted
        #[test(tokio::test)]
        async fn data_entry_finished_to_data_entry_not_started() {
            assert_eq!(
                CommitteeSessionStatus::DataEntryFinished
                    .ready_for_data_entry(
                        &CommitteeSession::first_session(),
                        &mut CommitteeSessionStatusQueriesMock {
                            has_polling_stations: true,
                            has_investigations: false,
                        }
                    )
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }
    }

    mod start_data_entry {
        use test_log::test;

        use super::*;

        /// Created --> DataEntryInProgress
        #[test]
        fn created_to_data_entry_in_progress() {
            assert_eq!(
                CommitteeSessionStatus::Created.start_data_entry(),
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// DataEntryNotStarted --> DataEntryInProgress
        #[test]
        fn data_entry_not_started_to_data_entry_in_progress() {
            assert_eq!(
                CommitteeSessionStatus::DataEntryNotStarted.start_data_entry(),
                Ok(CommitteeSessionStatus::DataEntryInProgress)
            );
        }

        /// DataEntryInProgress --> DataEntryInProgress
        #[test]
        fn data_entry_in_progress_to_data_entry_in_progress() {
            assert_eq!(
                CommitteeSessionStatus::DataEntryInProgress.start_data_entry(),
                Ok(CommitteeSessionStatus::DataEntryInProgress)
            );
        }

        /// DataEntryPaused --> DataEntryInProgress
        #[test]
        fn data_entry_paused_to_data_entry_in_progress() {
            assert_eq!(
                CommitteeSessionStatus::DataEntryPaused.start_data_entry(),
                Ok(CommitteeSessionStatus::DataEntryInProgress)
            );
        }

        /// DataEntryFinished --> DataEntryInProgress
        #[test]
        fn data_entry_finished_to_data_entry_in_progress() {
            assert_eq!(
                CommitteeSessionStatus::DataEntryFinished.start_data_entry(),
                Ok(CommitteeSessionStatus::DataEntryInProgress)
            );
        }
    }

    mod pause_data_entry {
        use test_log::test;

        use super::*;

        /// Created --> DataEntryPaused
        #[test]
        fn created_to_data_entry_paused() {
            assert_eq!(
                CommitteeSessionStatus::Created.pause_data_entry(),
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// DataEntryNotStarted --> DataEntryPaused
        #[test]
        fn data_entry_not_started_to_data_entry_paused() {
            assert_eq!(
                CommitteeSessionStatus::DataEntryNotStarted.pause_data_entry(),
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// DataEntryInProgress --> DataEntryPaused
        #[test]
        fn data_entry_in_progress_to_data_entry_paused() {
            assert_eq!(
                CommitteeSessionStatus::DataEntryInProgress.pause_data_entry(),
                Ok(CommitteeSessionStatus::DataEntryPaused)
            );
        }

        /// DataEntryPaused --> DataEntryPaused
        #[test]
        fn data_entry_paused_to_data_entry_paused() {
            assert_eq!(
                CommitteeSessionStatus::DataEntryPaused.pause_data_entry(),
                Ok(CommitteeSessionStatus::DataEntryPaused)
            );
        }

        /// DataEntryFinished --> DataEntryPaused
        #[test]
        fn data_entry_finished_to_data_entry_paused() {
            assert_eq!(
                CommitteeSessionStatus::DataEntryFinished.pause_data_entry(),
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }
    }

    mod finish_data_entry {
        use test_log::test;

        use super::*;

        /// Created --> DataEntryFinished
        #[test(tokio::test)]
        async fn created_to_data_entry_finished() {
            assert_eq!(
                CommitteeSessionStatus::Created
                    .finish_data_entry(
                        &CommitteeSession::first_session(),
                        &mut CommitteeSessionResultsQueriesMock(false)
                    )
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// DataEntryNotStarted --> DataEntryFinished
        #[test(tokio::test)]
        async fn data_entry_not_started_to_data_entry_finished() {
            assert_eq!(
                CommitteeSessionStatus::DataEntryNotStarted
                    .finish_data_entry(
                        &CommitteeSession::first_session(),
                        &mut CommitteeSessionResultsQueriesMock(false),
                    )
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// DataEntryInProgress --> DataEntryFinished
        #[test(tokio::test)]
        async fn data_entry_in_progress_to_data_entry_finished() {
            assert_eq!(
                CommitteeSessionStatus::DataEntryInProgress
                    .finish_data_entry(
                        &CommitteeSession::first_session(),
                        &mut CommitteeSessionResultsQueriesMock(true),
                    )
                    .await,
                Ok(CommitteeSessionStatus::DataEntryFinished)
            );
        }

        /// DataEntryInProgress --> DataEntryFinished
        #[test(tokio::test)]
        async fn data_entry_in_progress_to_data_entry_finished_next_session_not_finished() {
            assert_eq!(
                CommitteeSessionStatus::DataEntryInProgress
                    .finish_data_entry(
                        &CommitteeSession::first_session(),
                        &mut CommitteeSessionResultsQueriesMock(false),
                    )
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// DataEntryPaused --> DataEntryFinished
        #[test(tokio::test)]
        async fn data_entry_paused_to_data_entry_finished() {
            assert_eq!(
                CommitteeSessionStatus::DataEntryPaused
                    .finish_data_entry(
                        &CommitteeSession::first_session(),
                        &mut CommitteeSessionResultsQueriesMock(true),
                    )
                    .await,
                Ok(CommitteeSessionStatus::DataEntryFinished)
            );
        }

        /// DataEntryFinished --> DataEntryFinished
        #[test(tokio::test)]
        async fn data_entry_finished_to_data_entry_finished() {
            assert_eq!(
                CommitteeSessionStatus::DataEntryFinished
                    .finish_data_entry(
                        &CommitteeSession::first_session(),
                        &mut CommitteeSessionResultsQueriesMock(false),
                    )
                    .await,
                Ok(CommitteeSessionStatus::DataEntryFinished)
            );
        }
    }
}
