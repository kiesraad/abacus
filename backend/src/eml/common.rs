use crate::election::{CandidateGender, structs};
use serde::{Deserialize, Serialize};

/// Managing authority for the EML document
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct ManagingAuthority {
    pub authority_identifier: AuthorityIdentifier,
    pub authority_address: AuthorityAddress,
}

/// Identifier for a managing authority
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct AuthorityIdentifier {
    #[serde(rename = "@Id")]
    pub id: String,
    #[serde(rename = "$text")]
    pub name: String,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        rename(
            serialize = "kr:CreatedByAuthority",
            deserialize = "CreatedByAuthority"
        )
    )]
    pub created_by_authority: Option<CreatedByAuthority>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct CreatedByAuthority {
    #[serde(rename = "@Id")]
    id: String,
    #[serde(rename = "$text")]
    name: String,
}

/// Address of a managing authority
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct AuthorityAddress {}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum ElectionCategory {
    /// Eerste kamer - senate
    EK,
    /// Tweede kamer - house of representatives
    TK,
    /// Europees parlement - European Parliament
    EP,
    /// Provinciale staten - Provincial council
    PS,
    /// Waterschap - Water council
    AB,
    /// Gemeenteraad - Municipal council
    GR,
    /// Eilandsraad - Island council
    ER,
    BC,
    GC,
    NR,
    PR,
    LR,
    IR,
}

impl From<crate::election::ElectionCategory> for ElectionCategory {
    fn from(value: crate::election::ElectionCategory) -> Self {
        match value {
            crate::election::ElectionCategory::Municipal => ElectionCategory::GR,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum ElectionSubcategory {
    /// Provinciale staten (provinicial council), single electoral district
    PS1,
    /// Provinciale staten (provincial council), multiple electoral districts
    PS2,
    /// Waterschap (water council), less than 19 seats
    AB1,
    /// Waterschap (water council), more than 19 seats
    AB2,
    /// Gemeenteraad (municipal council), less than 19 seats
    GR1,
    /// Gemeenteraad (municipal council), more than 19 seats
    GR2,
    /// Eilandsraad (island council), less than 19 seats
    ER1,
    /// Eerste kamer - senate
    EK,
    /// Tweede kamer - house of representatives
    TK,
    /// Europees parlement - European parliament
    EP,
    BC,
    GC,
    NR,
    PR,
    LR,
    IR,
}

/// Identifier for a specific election
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct ElectionIdentifier {
    #[serde(rename = "@Id")]
    pub id: String,
    pub election_name: String,
    pub election_category: ElectionCategory,

    // required in 110a
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        rename(
            serialize = "kr:ElectionSubcategory",
            deserialize = "ElectionSubcategory"
        )
    )]
    pub election_subcategory: Option<ElectionSubcategory>,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        rename(serialize = "kr:ElectionDomain", deserialize = "ElectionDomain")
    )]
    pub election_domain: Option<ElectionDomain>,
    #[serde(rename(serialize = "kr:ElectionDate", deserialize = "ElectionDate"))]
    pub election_date: String,

    // required in 110a, omitted in 110b
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        rename(serialize = "kr:NominationDate", deserialize = "NominationDate")
    )]
    pub nomination_date: Option<String>,
}

/// Election domain part of election identifier
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct ElectionDomain {
    #[serde(rename = "@Id")]
    pub id: String,
    #[serde(rename = "$text")]
    pub name: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EMLImportError {
    InvalidCandidate,
    InvalidDateFormat,
    InvalidVotingMethod,
    MismatchNumberOfSeats,
    MismatchElectionIdentifier,
    MismatchPreferenceThreshold,
    MissingNumberOfSeats,
    MissingNominationDate,
    MissingPreferenceThreshold,
    MissingRegion,
    MissingSubcategory,
    MissingElectionTree,
    MissingElectionDomain,
    Needs101a,
    Needs230b,
    NumberOfSeatsNotInRange,
    OnlyMunicipalSupported,
    TooManyPoliticalGroups,
}

/// Name and id of the specific contest
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct ContestIdentifier {
    #[serde(rename = "@Id")]
    pub id: String,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub contest_name: Option<String>,
}

impl ContestIdentifier {
    pub fn new(id: impl Into<String>, contest_name: Option<String>) -> ContestIdentifier {
        ContestIdentifier {
            id: id.into(),
            contest_name,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct Candidate {
    pub candidate_identifier: CandidateIdentifier,
    pub candidate_full_name: CandidateFullName,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub gender: Option<Gender>,
    pub qualifying_address: QualifyingAddress,
}

impl TryFrom<Candidate> for structs::Candidate {
    type Error = crate::eml::EMLImportError;

    fn try_from(parsed: Candidate) -> Result<Self, Self::Error> {
        Ok(structs::Candidate {
            number: parsed
                .candidate_identifier
                .id
                .parse()
                .or(Err(EMLImportError::InvalidCandidate))?,
            initials: match parsed.candidate_full_name.person_name.name_line {
                Some(line) => line.value,
                None => return Err(EMLImportError::InvalidCandidate),
            },
            first_name: parsed.candidate_full_name.person_name.first_name,
            last_name_prefix: parsed.candidate_full_name.person_name.name_prefix,
            last_name: parsed.candidate_full_name.person_name.last_name,
            locality: parsed.qualifying_address.locality_name().to_string(),
            country_code: parsed
                .qualifying_address
                .country_name_code()
                .map(|s| s.to_string()),
            gender: match parsed.gender {
                None => None,
                Some(gender) => match gender {
                    Gender::Male => Some(CandidateGender::Male),
                    Gender::Female => Some(CandidateGender::Female),
                    Gender::Unknown => None,
                },
            },
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct CandidateIdentifier {
    #[serde(rename = "@Id")]
    pub id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct CandidateFullName {
    #[serde(rename(serialize = "xnl:PersonName", deserialize = "PersonName"))]
    pub person_name: PersonName,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct PersonName {
    #[serde(rename(serialize = "xnl:NameLine", deserialize = "NameLine"))]
    pub name_line: Option<NameLine>,
    #[serde(rename(serialize = "xnl:FirstName", deserialize = "FirstName"))]
    pub first_name: Option<String>,
    #[serde(
        rename(serialize = "xnl:NamePrefix", deserialize = "NamePrefix"),
        skip_serializing_if = "Option::is_none",
        default
    )]
    pub name_prefix: Option<String>,
    #[serde(rename(serialize = "xnl:LastName", deserialize = "LastName"))]
    pub last_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct NameLine {
    #[serde(rename = "@NameType")]
    pub name_type: String,
    #[serde(rename = "$text")]
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Gender {
    Male,
    Female,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct QualifyingAddress {
    #[serde(rename = "$value")]
    pub data: QualifyingAddressData,
}

impl QualifyingAddress {
    pub fn locality_name(&self) -> &str {
        match &self.data {
            QualifyingAddressData::Locality(locality) => &locality.locality_name,
            QualifyingAddressData::Country(country) => &country.locality.locality_name,
        }
    }

    pub fn country_name_code(&self) -> Option<&str> {
        match &self.data {
            QualifyingAddressData::Locality(_) => None,
            QualifyingAddressData::Country(country) => Some(&country.country_name_code),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub enum QualifyingAddressData {
    #[serde(rename(serialize = "xal:Locality", deserialize = "Locality"))]
    Locality(Locality),
    #[serde(rename(serialize = "xal:Country", deserialize = "Country"))]
    Country(Country),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Country {
    pub country_name_code: String,
    pub locality: Locality,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct Locality {
    #[serde(rename(serialize = "xal:LocalityName", deserialize = "LocalityName"))]
    pub locality_name: String,
}

/// An affiliation (i.e. party) identification
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct AffiliationIdentifier {
    #[serde(default, skip_serializing_if = "Option::is_none", rename = "@Id")]
    pub id: Option<String>,
    pub registered_name: String,
}

pub mod bool_yes_no {
    pub fn serialize<S>(value: &bool, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let s = if *value { "yes" } else { "no" };
        serializer.serialize_str(s)
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<bool, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        use serde::Deserialize;

        let s = String::deserialize(deserializer)?;
        Ok(match &s[..] {
            "yes" => true,
            "no" => false,
            _ => return Err(serde::de::Error::custom("Unknown value")),
        })
    }
}
