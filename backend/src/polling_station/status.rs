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

/*
#[derive(Debug, Serialize, Deserialize, ToSchema, sqlx::Type, Eq, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum PollingStationStatus {
    NotStarted,            // First entry has not started yet
    FirstEntryInProgress,  // First entry is currently in progress
    FirstEntryUnfinished,  // First entry has been aborted and the data has been saved
    SecondEntry,           // Ready for second entry
    SecondEntryInProgress, // Second entry is currently in progress
    SecondEntryUnfinished, // Second entry has been aborted and the data has been saved
    Definitive,            // First and second entry are finished
}
 */

use std::fmt::Display;

use serde::{Deserialize, Serialize};
use sqlx::{types::Json, FromRow, Type};
use utoipa::ToSchema;

use crate::data_entry::SaveDataEntryRequest;

// TODO: Create table
#[derive(Debug, Serialize, Deserialize, FromRow, ToSchema)]
pub struct PollingStationStatusEntry {
    pub polling_station_id: u32,
    #[schema(value_type = PollingStationStatus)]
    pub status: Json<PollingStationStatus>,
}

impl PollingStationStatusEntry {
    pub fn new(polling_station_id: u32) -> Self {
        Self {
            polling_station_id,
            status: Json(PollingStationStatus::default()),
        }
    }
}

#[derive(Debug)]
pub enum PollingStationTransitionError {
    FirstEntryAlreadyClaimed,
}

#[derive(Debug, Serialize, Deserialize, ToSchema, Clone, PartialEq)]
#[serde(tag = "status", content = "state")]
pub enum PollingStationStatus {
    NotStarted, // First entry has not started yet
    FirstEntryInProgress(FirstEntryInProgress),
    FirstEntryUnfinished,
    SecondEntry,
    SecondEntryInProgress,
    SecondEntryUnfinished,
    Definitive, // First and second entry are finished
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NotStarted;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, Hash, ToSchema, Type)]
pub struct FirstEntryInProgress {
    state: SaveDataEntryRequest,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, Hash)]
pub struct FirstEntryUnfinished;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, Hash)]
pub struct SecondEntry;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, Hash)]
pub struct SecondEntryInProgress;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, Hash)]
pub struct SecondEntryUnfinished;

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
