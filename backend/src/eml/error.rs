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
    InvalidDistrict,
    InvalidPollingStation,
    InvalidVotingMethod,
    InvalidZipFile(async_zip::error::ZipError),
    LimitedElectionsSupported,
    MismatchElection,
    MismatchElectionDate,
    MismatchElectionDomain,
    MismatchNumberOfSeats,
    MismatchPreferenceThreshold,
    MismatchSubCommittee,
    MissingCommitteeNumber,
    MissingElectionDomain,
    MissingEmlFileInZip,
    MissingFileName,
    MissingManagingAuthority,
    MissingNominationDate,
    MissingNumberOfSeats,
    MissingPollingStations,
    MissingPreferenceThreshold,
    MissingSubcategory,
    MultipleEmlFilesInZip,
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
    SubCommitteeDataEntryNotEmpty,
    TooManyPoliticalGroups,
    UnknownCommittee,
    UnsupportedDistrictElection,
}

impl From<eml_nl::EMLError> for EMLImportError {
    fn from(value: eml_nl::EMLError) -> Self {
        EMLImportError::EMLError(value)
    }
}
