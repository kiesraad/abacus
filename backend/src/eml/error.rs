use crate::domain::election::{CandidateNumber, PGNumber};

#[derive(Debug)]
pub enum EMLImportError {
    CandidateListWithoutContest,
    PollingStationsWithoutContest,
    InvalidCandidate,
    InvalidDateFormat,
    InvalidVotingMethod,
    InvalidPollingStation,
    InvalidNumberOfVoters,
    MismatchElection,
    MismatchElectionDate,
    MismatchElectionDomain,
    MismatchNumberOfSeats,
    MismatchPreferenceThreshold,
    MissingManagingAuthority,
    MissingNumberOfSeats,
    MissingNominationDate,
    MissingPreferenceThreshold,
    MissingSubcategory,
    MissingElectionDomain,
    MissingFileName,
    MissingPollingStations,
    Needs110a,
    Needs110b,
    Needs230b,
    NumberOfSeatsNotInRange,
    NumberOfPollingStationsNotInRange,
    OnlyMunicipalSupported,
    TooManyPoliticalGroups,
    PoliticalGroupNumbersNotIncreasing {
        expected_larger_than: PGNumber,
        found: PGNumber,
    },
    CandidateNumbersNotIncreasing {
        political_group_number: PGNumber,
        expected_larger_than: CandidateNumber,
        found: CandidateNumber,
    },
    EMLError(eml_nl::EMLError),
}

impl From<eml_nl::EMLError> for EMLImportError {
    fn from(value: eml_nl::EMLError) -> Self {
        EMLImportError::EMLError(value)
    }
}
