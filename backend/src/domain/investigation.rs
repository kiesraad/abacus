use axum::{
    Json,
    response::{IntoResponse, Response},
};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::domain::{data_entry::DataEntryId, polling_station::PollingStationId};

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
#[serde(deny_unknown_fields, tag = "status", content = "state")]
pub enum InvestigationStatus {
    InProgress(InvestigationInProgress),
    ConcludedWithoutNewResults(InvestigationConcludedWithoutNewResults),
    ConcludedWithNewResults(InvestigationConcludedWithNewResults),
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct InvestigationInProgress {
    pub reason: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct InvestigationConcludedWithoutNewResults {
    pub reason: String,
    pub findings: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct InvestigationConcludedWithNewResults {
    pub reason: String,
    pub findings: String,
    #[serde(skip, default)]
    pub data_entry_id: DataEntryId,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum InvestigationStatusName {
    InProgress,
    ConcludedWithoutNewResults,
    ConcludedWithNewResults,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum InvestigationTransitionError {
    Invalid,
    RequiresCorrectedResults,
}

impl InvestigationStatus {
    /// Create a new investigation (initial state)
    pub fn new(reason: String) -> Self {
        Self::InProgress(InvestigationInProgress { reason })
    }

    /// InProgress -> ConcludedWithoutNewResults
    ///
    /// `has_previous_results` must be true (the polling station must have results
    /// from a previous session), otherwise corrected results are required.
    pub fn conclude_without_new_results(
        self,
        findings: String,
        has_previous_results: bool,
    ) -> Result<Self, InvestigationTransitionError> {
        match self {
            Self::InProgress(state) => {
                if !has_previous_results {
                    return Err(InvestigationTransitionError::RequiresCorrectedResults);
                }
                Ok(Self::ConcludedWithoutNewResults(
                    InvestigationConcludedWithoutNewResults {
                        reason: state.reason,
                        findings,
                    },
                ))
            }
            _ => Err(InvestigationTransitionError::Invalid),
        }
    }

    /// InProgress -> ConcludedWithNewResults
    pub fn conclude_with_new_results(
        self,
        findings: String,
        data_entry_id: DataEntryId,
    ) -> Result<Self, InvestigationTransitionError> {
        match self {
            Self::InProgress(state) => Ok(Self::ConcludedWithNewResults(
                InvestigationConcludedWithNewResults {
                    reason: state.reason,
                    findings,
                    data_entry_id,
                },
            )),
            _ => Err(InvestigationTransitionError::Invalid),
        }
    }

    /// Concluded* -> InProgress.
    pub fn reopen(self) -> Result<Self, InvestigationTransitionError> {
        match self {
            Self::ConcludedWithoutNewResults(state) => {
                Ok(Self::InProgress(InvestigationInProgress {
                    reason: state.reason,
                }))
            }
            Self::ConcludedWithNewResults(state) => Ok(Self::InProgress(InvestigationInProgress {
                reason: state.reason,
            })),
            Self::InProgress(_) => Err(InvestigationTransitionError::Invalid),
        }
    }

    /// Concluded* -> ConcludedWithoutNewResults (switch corrected_results to false)
    pub fn switch_to_without_new_results(
        self,
        reason: String,
        findings: String,
        has_previous_results: bool,
    ) -> Result<Self, InvestigationTransitionError> {
        match self {
            Self::ConcludedWithoutNewResults(_) | Self::ConcludedWithNewResults(_) => {
                if !has_previous_results {
                    return Err(InvestigationTransitionError::RequiresCorrectedResults);
                }
                Ok(Self::ConcludedWithoutNewResults(
                    InvestigationConcludedWithoutNewResults { reason, findings },
                ))
            }
            _ => Err(InvestigationTransitionError::Invalid),
        }
    }

    /// Concluded* -> ConcludedWithNewResults (switch corrected_results to true)
    pub fn switch_to_with_new_results(
        self,
        reason: String,
        findings: String,
        data_entry_id: DataEntryId,
    ) -> Result<Self, InvestigationTransitionError> {
        match self {
            Self::ConcludedWithoutNewResults(_) | Self::ConcludedWithNewResults(_) => Ok(
                Self::ConcludedWithNewResults(InvestigationConcludedWithNewResults {
                    reason,
                    findings,
                    data_entry_id,
                }),
            ),
            _ => Err(InvestigationTransitionError::Invalid),
        }
    }

    /// Self-loop: update reason while InProgress
    pub fn update_in_progress(
        &mut self,
        reason: String,
    ) -> Result<(), InvestigationTransitionError> {
        match self {
            Self::InProgress(state) => {
                state.reason = reason;
                Ok(())
            }
            _ => Err(InvestigationTransitionError::Invalid),
        }
    }

    /// Populate data_entry_id from the polling station database column
    ///
    /// Called by repo functions after deserializing from JSON,
    /// should only be called when the status is `ConcludedWithNewResults`.
    pub(crate) fn with_data_entry_id(mut self, id: DataEntryId) -> Self {
        match &mut self {
            Self::ConcludedWithNewResults(s) => {
                s.data_entry_id = id;
            }
            _ => {
                debug_assert!(
                    false,
                    "with_data_entry_id called on non-ConcludedWithNewResults status"
                );
            }
        }
        self
    }

    pub fn status_name(&self) -> InvestigationStatusName {
        match self {
            Self::InProgress(_) => InvestigationStatusName::InProgress,
            Self::ConcludedWithoutNewResults(_) => {
                InvestigationStatusName::ConcludedWithoutNewResults
            }
            Self::ConcludedWithNewResults(_) => InvestigationStatusName::ConcludedWithNewResults,
        }
    }

    pub fn reason(&self) -> &str {
        match self {
            Self::InProgress(s) => &s.reason,
            Self::ConcludedWithoutNewResults(s) => &s.reason,
            Self::ConcludedWithNewResults(s) => &s.reason,
        }
    }

    pub fn findings(&self) -> Option<&str> {
        match self {
            Self::InProgress(_) => None,
            Self::ConcludedWithoutNewResults(s) => Some(&s.findings),
            Self::ConcludedWithNewResults(s) => Some(&s.findings),
        }
    }

    pub fn data_entry_id(&self) -> Option<DataEntryId> {
        match self {
            Self::ConcludedWithNewResults(s) => Some(s.data_entry_id),
            _ => None,
        }
    }

    fn corrected_results(&self) -> Option<bool> {
        match self {
            Self::InProgress(_) => None,
            Self::ConcludedWithoutNewResults(_) => Some(false),
            Self::ConcludedWithNewResults(_) => Some(true),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct PollingStationInvestigation {
    pub polling_station_id: PollingStationId,
    pub reason: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub findings: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub corrected_results: Option<bool>,
}

impl From<(PollingStationId, &InvestigationStatus)> for PollingStationInvestigation {
    fn from((ps_id, status): (PollingStationId, &InvestigationStatus)) -> Self {
        Self {
            polling_station_id: ps_id,
            reason: status.reason().to_owned(),
            findings: status.findings().map(str::to_owned),
            corrected_results: status.corrected_results(),
        }
    }
}

impl IntoResponse for PollingStationInvestigation {
    fn into_response(self) -> Response {
        Json(self).into_response()
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct PollingStationInvestigationCreateRequest {
    pub reason: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct PollingStationInvestigationConcludeRequest {
    pub findings: String,
    pub corrected_results: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct PollingStationInvestigationUpdateRequest {
    pub reason: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub findings: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub corrected_results: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub accept_data_entry_deletion: Option<bool>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn in_progress() -> InvestigationStatus {
        InvestigationStatus::new("reason".into())
    }

    fn concluded_without() -> InvestigationStatus {
        InvestigationStatus::ConcludedWithoutNewResults(InvestigationConcludedWithoutNewResults {
            reason: "reason".into(),
            findings: "findings".into(),
        })
    }

    fn concluded_with(de_id: DataEntryId) -> InvestigationStatus {
        InvestigationStatus::ConcludedWithNewResults(InvestigationConcludedWithNewResults {
            reason: "reason".into(),
            findings: "findings".into(),
            data_entry_id: de_id,
        })
    }

    #[test]
    fn test_new_creates_in_progress() {
        let s = InvestigationStatus::new("my reason".into());
        assert_eq!(s.status_name(), InvestigationStatusName::InProgress);
        assert_eq!(s.reason(), "my reason");
        assert_eq!(s.findings(), None);
        assert_eq!(s.data_entry_id(), None);
        assert_eq!(s.corrected_results(), None);
    }

    #[test]
    fn test_conclude_without_new_results_ok() {
        let s = in_progress()
            .conclude_without_new_results("findings".into(), true)
            .unwrap();
        assert_eq!(
            s.status_name(),
            InvestigationStatusName::ConcludedWithoutNewResults
        );
        assert_eq!(s.findings(), Some("findings"));
        assert_eq!(s.corrected_results(), Some(false));
    }

    #[test]
    fn test_conclude_without_new_results_requires_previous() {
        let err = in_progress()
            .conclude_without_new_results("findings".into(), false)
            .unwrap_err();
        assert_eq!(err, InvestigationTransitionError::RequiresCorrectedResults);
    }

    #[test]
    fn test_conclude_without_new_results_wrong_state() {
        let err = concluded_without()
            .conclude_without_new_results("findings".into(), true)
            .unwrap_err();
        assert_eq!(err, InvestigationTransitionError::Invalid);
    }

    #[test]
    fn test_conclude_with_new_results_ok() {
        let de_id = DataEntryId::from(42);
        let s = in_progress()
            .conclude_with_new_results("findings".into(), de_id)
            .unwrap();
        assert_eq!(
            s.status_name(),
            InvestigationStatusName::ConcludedWithNewResults
        );
        assert_eq!(s.findings(), Some("findings"));
        assert_eq!(s.data_entry_id(), Some(de_id));
        assert_eq!(s.corrected_results(), Some(true));
    }

    #[test]
    fn test_conclude_with_new_results_wrong_state() {
        let err = concluded_without()
            .conclude_with_new_results("findings".into(), DataEntryId::from(1))
            .unwrap_err();
        assert_eq!(err, InvestigationTransitionError::Invalid);
    }

    #[test]
    fn test_reopen_from_concluded_without() {
        let s = concluded_without().reopen().unwrap();
        assert_eq!(s.status_name(), InvestigationStatusName::InProgress);
    }

    #[test]
    fn test_reopen_from_concluded_with() {
        let s = concluded_with(DataEntryId::from(42)).reopen().unwrap();
        assert_eq!(s.status_name(), InvestigationStatusName::InProgress);
    }

    #[test]
    fn test_reopen_from_in_progress_fails() {
        let err = in_progress().reopen().unwrap_err();
        assert_eq!(err, InvestigationTransitionError::Invalid);
    }

    #[test]
    fn test_switch_to_without_from_concluded_with() {
        let s = concluded_with(DataEntryId::from(1))
            .switch_to_without_new_results("new reason".into(), "new findings".into(), true)
            .unwrap();
        assert_eq!(
            s.status_name(),
            InvestigationStatusName::ConcludedWithoutNewResults
        );
        assert_eq!(s.reason(), "new reason");
        assert_eq!(s.findings(), Some("new findings"));
        assert_eq!(s.corrected_results(), Some(false));
    }

    #[test]
    fn test_switch_to_without_from_concluded_without() {
        let s = concluded_without()
            .switch_to_without_new_results("new reason".into(), "new findings".into(), true)
            .unwrap();
        assert_eq!(
            s.status_name(),
            InvestigationStatusName::ConcludedWithoutNewResults
        );
        assert_eq!(s.reason(), "new reason");
    }

    #[test]
    fn test_switch_to_without_requires_previous_results() {
        let err = concluded_with(DataEntryId::from(1))
            .switch_to_without_new_results("r".into(), "f".into(), false)
            .unwrap_err();
        assert_eq!(err, InvestigationTransitionError::RequiresCorrectedResults);
    }

    #[test]
    fn test_switch_to_without_from_in_progress_fails() {
        let err = in_progress()
            .switch_to_without_new_results("r".into(), "f".into(), true)
            .unwrap_err();
        assert_eq!(err, InvestigationTransitionError::Invalid);
    }

    #[test]
    fn test_switch_to_with_from_concluded_without() {
        let de_id = DataEntryId::from(42);
        let s = concluded_without()
            .switch_to_with_new_results("new reason".into(), "new findings".into(), de_id)
            .unwrap();
        assert_eq!(
            s.status_name(),
            InvestigationStatusName::ConcludedWithNewResults
        );
        assert_eq!(s.reason(), "new reason");
        assert_eq!(s.findings(), Some("new findings"));
        assert_eq!(s.data_entry_id(), Some(de_id));
        assert_eq!(s.corrected_results(), Some(true));
    }

    #[test]
    fn test_switch_to_with_from_concluded_with() {
        let de_id = DataEntryId::from(99);
        let s = concluded_with(DataEntryId::from(1))
            .switch_to_with_new_results("new reason".into(), "new findings".into(), de_id)
            .unwrap();
        assert_eq!(
            s.status_name(),
            InvestigationStatusName::ConcludedWithNewResults
        );
        assert_eq!(s.data_entry_id(), Some(de_id));
    }

    #[test]
    fn test_switch_to_with_from_in_progress_fails() {
        let err = in_progress()
            .switch_to_with_new_results("r".into(), "f".into(), DataEntryId::from(1))
            .unwrap_err();
        assert_eq!(err, InvestigationTransitionError::Invalid);
    }

    #[test]
    fn test_update_in_progress_ok() {
        let mut s = in_progress();
        s.update_in_progress("new reason".into()).unwrap();
        assert_eq!(s.reason(), "new reason");
    }

    #[test]
    fn test_update_in_progress_wrong_state() {
        let mut s = concluded_without();
        let err = s.update_in_progress("new reason".into()).unwrap_err();
        assert_eq!(err, InvestigationTransitionError::Invalid);
    }

    #[test]
    fn test_json_roundtrip_in_progress() {
        let s = in_progress();
        let json = serde_json::to_string(&s).unwrap();
        assert_eq!(
            json,
            r#"{"status":"InProgress","state":{"reason":"reason"}}"#
        );
        let deserialized: InvestigationStatus = serde_json::from_str(&json).unwrap();
        assert_eq!(s, deserialized);
    }

    #[test]
    fn test_json_roundtrip_concluded_without() {
        let s = concluded_without();
        let json = serde_json::to_string(&s).unwrap();
        let deserialized: InvestigationStatus = serde_json::from_str(&json).unwrap();
        assert_eq!(s, deserialized);
    }

    #[test]
    fn test_json_roundtrip_concluded_with() {
        let s = concluded_with(DataEntryId::from(99));
        let json = serde_json::to_string(&s).unwrap();
        // data_entry_id is excluded from serialization
        assert_eq!(
            json,
            r#"{"status":"ConcludedWithNewResults","state":{"reason":"reason","findings":"findings"}}"#
        );
        // deserialization gives default DataEntryId (0)
        let deserialized: InvestigationStatus = serde_json::from_str(&json).unwrap();
        let s = s.with_data_entry_id(DataEntryId::default());
        assert_eq!(s, deserialized);
    }

    #[test]
    fn test_compat_from_in_progress() {
        let ps_id = PollingStationId::from(10);
        let status = in_progress();
        let compat = PollingStationInvestigation::from((ps_id, &status));
        assert_eq!(compat.polling_station_id, ps_id);
        assert_eq!(compat.reason, "reason");
        assert_eq!(compat.findings, None);
        assert_eq!(compat.corrected_results, None);
    }

    #[test]
    fn test_compat_from_concluded_without() {
        let ps_id = PollingStationId::from(10);
        let status = concluded_without();
        let compat = PollingStationInvestigation::from((ps_id, &status));
        assert_eq!(compat.findings, Some("findings".into()));
        assert_eq!(compat.corrected_results, Some(false));
    }

    #[test]
    fn test_compat_from_concluded_with() {
        let ps_id = PollingStationId::from(10);
        let status = concluded_with(DataEntryId::from(1));
        let compat = PollingStationInvestigation::from((ps_id, &status));
        assert_eq!(compat.findings, Some("findings".into()));
        assert_eq!(compat.corrected_results, Some(true));
    }
}
