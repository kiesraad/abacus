use crate::domain::election::{CandidateNumber, PGNumber};

#[derive(Debug)]
pub enum EMLImportError {
    CandidateNumbersNotIncreasing {
        political_group_number: PGNumber,
        expected_larger_than: CandidateNumber,
        found: CandidateNumber,
    },
    CommitteeCategoryForElectionCategoryNotSupported,
    EMLError(eml_nl::EMLError),
    InvalidCandidate,
    InvalidCountType,
    InvalidDateFormat,
    InvalidDistrict,
    InvalidNumberOfContests {
        found: usize,
    },
    InvalidPollingStation,
    InvalidVotingMethod,
    LimitedElectionsSupported,
    MismatchElection,
    MismatchElectionDomain,
    MismatchNumberOfSeats,
    MismatchPreferenceThreshold,
    MissingCommitteeNumber,
    MissingElectionDomain,
    MissingFileName,
    MissingManagingAuthority,
    MissingNominationDate,
    MissingNumberOfSeats,
    MissingPollingStations,
    MissingPreferenceThreshold,
    MissingSubcategory,
    MissingLastName,
    Needs110a,
    Needs110b,
    Needs230b,
    NumberOfPollingStationsNotInRange,
    NumberOfSeatsNotInRange,
    PoliticalGroupNumbersNotIncreasing {
        expected_larger_than: PGNumber,
        found: PGNumber,
    },
    TooManyPoliticalGroups,
    UnknownCommittee,
    UnsupportedDistrictElection,
}

impl From<eml_nl::EMLError> for EMLImportError {
    fn from(value: eml_nl::EMLError) -> Self {
        EMLImportError::EMLError(value)
    }
}
