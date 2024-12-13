/*
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct PollingStationStatusEntry {
    pub id: u32,
    pub status: PollingStationStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    #[schema(maximum = 100)]
    /// Data entry progress between 0 and 100
    pub data_entry_progress: Option<u8>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub finished_at: Option<i64>,
    }
 */

use std::fmt::Display;

use serde::{Deserialize, Serialize};
use sqlx::Type;
use utoipa::ToSchema;

use crate::data_entry::SaveDataEntryRequest;

#[derive(Debug)]
pub enum PollingStationTransitionError {
    FirstEntryAlreadyClaimed,
}

#[derive(Debug, Serialize, Deserialize, ToSchema, Clone, PartialEq)]
#[serde(tag = "status", content = "state")]
pub enum PollingStationStatus {
    NotStarted, // First entry has not started yet
    FirstEntryInProgress(FirstEntryInProgress),
    SecondEntry,
    SecondEntryInProgress,
    Definitive, // First and second entry are finished
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NotStarted;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, Hash, ToSchema, Type)]
pub struct FirstEntryInProgress {
    pub state: SaveDataEntryRequest,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, Hash)]
pub struct SecondEntry;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, Hash)]
pub struct SecondEntryInProgress;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, Hash)]
pub struct Definitive;

impl PollingStationStatus {
    pub fn claim_first_entry(
        &self,
        state: SaveDataEntryRequest,
    ) -> Result<Self, PollingStationTransitionError> {
        let PollingStationStatus::NotStarted = self else {
            return Err(PollingStationTransitionError::FirstEntryAlreadyClaimed);
        };

        Ok(Self::FirstEntryInProgress(FirstEntryInProgress { state }))
    }
}

impl Display for PollingStationTransitionError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PollingStationTransitionError::FirstEntryAlreadyClaimed => {
                write!(f, "First entry already claimed")
            }
        }
    }
}

impl Default for PollingStationStatus {
    fn default() -> Self {
        Self::NotStarted
    }
}
