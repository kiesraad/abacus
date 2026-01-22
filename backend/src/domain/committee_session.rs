use axum::{
    Json,
    response::{IntoResponse, Response},
};
use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Type};
use utoipa::ToSchema;

use crate::{
    domain::{
        committee_session_status::{CommitteeSessionError, CommitteeSessionStatus},
        election::ElectionId,
    },
    infra::audit_log,
};

/// Committee session
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema, Type, FromRow)]
#[serde(deny_unknown_fields)]
pub struct CommitteeSession {
    pub id: u32,
    pub number: u32,
    pub election_id: ElectionId,
    pub location: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(value_type = String, format = "date-time", nullable = false)]
    pub start_date_time: Option<NaiveDateTime>,
    pub status: CommitteeSessionStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub results_eml: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub results_pdf: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub overview_pdf: Option<u32>,
}

impl CommitteeSession {
    /// Check if this session is the next session to be held
    pub fn is_next_session(&self) -> bool {
        self.number > 1
    }

    #[cfg(test)]
    pub fn first_session() -> Self {
        CommitteeSession {
            number: 1,
            id: 0,
            election_id: 0.into(),
            location: "".to_string(),
            start_date_time: None,
            status: CommitteeSessionStatus::Created,
            results_eml: None,
            results_pdf: None,
            overview_pdf: None,
        }
    }

    #[cfg(test)]
    pub fn next_session() -> Self {
        CommitteeSession {
            number: 2,
            ..CommitteeSession::first_session()
        }
    }
}

impl From<CommitteeSession> for audit_log::CommitteeSessionDetails {
    fn from(value: CommitteeSession) -> Self {
        Self {
            session_id: value.id,
            session_number: value.number,
            session_election_id: value.election_id,
            session_location: value.location,
            session_start_date_time: value.start_date_time,
            session_status: value.status.to_string(),
            session_results_eml: value.results_eml,
            session_results_pdf: value.results_pdf,
            session_overview_pdf: value.overview_pdf,
        }
    }
}

impl IntoResponse for CommitteeSession {
    fn into_response(self) -> Response {
        Json(self).into_response()
    }
}

/// Committee session create request
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema, Type, FromRow)]
#[serde(deny_unknown_fields)]
pub struct CommitteeSessionCreateRequest {
    pub number: u32,
    pub election_id: ElectionId,
}

/// Committee session update request
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema, Type, FromRow)]
#[serde(deny_unknown_fields)]
pub struct CommitteeSessionUpdateRequest {
    pub location: String,
    pub start_date: String,
    pub start_time: String,
}

/// Committee session files update request
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema, Type, FromRow)]
#[serde(deny_unknown_fields)]
pub struct CommitteeSessionFilesUpdateRequest {
    pub results_eml: Option<u32>,
    pub results_pdf: Option<u32>,
    pub overview_pdf: Option<u32>,
}

pub trait CommitteeSessionResultsQueries {
    fn polling_stations_finished(
        &mut self,
        committee_session_id: u32,
    ) -> impl Future<Output = Result<bool, CommitteeSessionError>>;
    fn investigations_finished(
        &mut self,
        committee_session_id: u32,
    ) -> impl Future<Output = Result<bool, CommitteeSessionError>>;
}

impl CommitteeSession {
    /// Checks if results are complete for a committee session by verifying that
    /// - For first committee session: all new polling stations must have results
    /// - For subsequent committee sessions: all new polling stations and all investigated
    ///   polling stations with corrected results must have results
    pub async fn are_results_complete(
        &self,
        queries: &mut impl CommitteeSessionResultsQueries,
    ) -> Result<bool, CommitteeSessionError> {
        let all_new_ps_have_data = queries.polling_stations_finished(self.id).await?;
        if !all_new_ps_have_data || !self.is_next_session() {
            return Ok(all_new_ps_have_data);
        }

        // Validate that all investigations are finished and have results
        // if corrected_results is true
        let all_investigations_finished = queries.investigations_finished(self.id).await?;
        Ok(all_new_ps_have_data && all_investigations_finished)
    }
}

#[cfg(test)]
mod tests {
    use test_log::test;

    use crate::domain::{
        committee_session::{CommitteeSession, CommitteeSessionResultsQueries},
        committee_session_status::CommitteeSessionError,
    };

    struct CommitteeSessionResultsQueriesMock {
        pub polling_stations_finished: bool,
        pub investigations_finished: Option<bool>,
    }

    impl CommitteeSessionResultsQueries for CommitteeSessionResultsQueriesMock {
        async fn polling_stations_finished(
            &mut self,
            _: u32,
        ) -> Result<bool, CommitteeSessionError> {
            Ok(self.polling_stations_finished)
        }

        async fn investigations_finished(&mut self, _: u32) -> Result<bool, CommitteeSessionError> {
            Ok(self
                .investigations_finished
                .expect("should not call investigations_finished()"))
        }
    }

    #[test(tokio::test)]
    async fn test_are_results_complete_first_session_polling_stations_unfinished() {
        let complete = CommitteeSession::first_session()
            .are_results_complete(&mut CommitteeSessionResultsQueriesMock {
                polling_stations_finished: false,
                investigations_finished: None,
            })
            .await
            .unwrap();
        assert!(!complete);
    }

    #[test(tokio::test)]
    async fn test_are_results_complete_first_session_polling_stations_finished() {
        let complete = CommitteeSession::first_session()
            .are_results_complete(&mut CommitteeSessionResultsQueriesMock {
                polling_stations_finished: true,
                investigations_finished: None,
            })
            .await
            .unwrap();
        assert!(complete);
    }

    #[test(tokio::test)]
    async fn test_are_results_complete_next_session_polling_stations_unfinished() {
        let complete = CommitteeSession::next_session()
            .are_results_complete(&mut CommitteeSessionResultsQueriesMock {
                polling_stations_finished: false,
                investigations_finished: None,
            })
            .await
            .unwrap();
        assert!(!complete);
    }

    #[test(tokio::test)]
    async fn test_are_results_complete_next_session_investigations_unfinished() {
        let complete = CommitteeSession::next_session()
            .are_results_complete(&mut CommitteeSessionResultsQueriesMock {
                polling_stations_finished: true,
                investigations_finished: Some(false),
            })
            .await
            .unwrap();
        assert!(!complete);
    }

    #[test(tokio::test)]
    async fn test_are_results_complete_next_session_investigations_finished() {
        let complete = CommitteeSession::first_session()
            .are_results_complete(&mut CommitteeSessionResultsQueriesMock {
                polling_stations_finished: true,
                investigations_finished: Some(true),
            })
            .await
            .unwrap();
        assert!(complete);
    }
}
