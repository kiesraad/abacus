use crate::domain::election::{CandidateNumber, PGNumber};

#[derive(Debug)]
pub enum EMLImportError {
    CandidateListWithoutContest,
    CandidateNumbersNotIncreasing {
        political_group_number: PGNumber,
        expected_larger_than: CandidateNumber,
        found: CandidateNumber,
    },
    CommitteeCategoryForElectionCategoryNotSupported,
    EMLError(eml_nl::EMLError),
    InvalidCandidate,
    InvalidDateFormat,
    InvalidNumberOfVoters,
    InvalidPollingStation,
    InvalidVotingMethod,
    LimitedElectionsSupported,
    MismatchElection,
    MismatchElectionCategoryAndSubCategory,
    MismatchElectionDate,
    MismatchElectionDomain,
    MismatchNumberOfSeats,
    MismatchPreferenceThreshold,
    MissingElectionDomain,
    MissingFileName,
    MissingManagingAuthority,
    MissingNominationDate,
    MissingNumberOfSeats,
    MissingPollingStations,
    MissingPreferenceThreshold,
    MissingSubcategory,
    Needs110a,
    Needs110b,
    Needs230b,
    NumberOfPollingStationsNotInRange,
    NumberOfSeatsNotInRange,
    PoliticalGroupNumbersNotIncreasing {
        expected_larger_than: PGNumber,
        found: PGNumber,
    },
    PollingStationsWithoutContest,
    TooManyPoliticalGroups,
}

impl From<eml_nl::EMLError> for EMLImportError {
    fn from(value: eml_nl::EMLError) -> Self {
        EMLImportError::EMLError(value)
    }
}
