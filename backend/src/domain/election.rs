use axum::{
    Json,
    response::{IntoResponse, Response},
};
use chrono::NaiveDate;
use eml_nl::csv::NameResolver;
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Type};
use utoipa::ToSchema;

use crate::domain::identifier::id;

id!(ElectionId);

pub struct InvalidElectionError(pub String);

/// Election without political groups.
///
/// Note: an election within Abacus does not represent the entire election, but
/// rather a single committee (i.e. stembureau at the CSB, HSB or GSB level)
/// within the election.
///
/// When access to the political groups and their candidates is required, use
/// [`ElectionWithPoliticalGroups`] instead. When creating a new election, use
/// [`NewElection`] instead.
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash, FromRow)]
#[serde(deny_unknown_fields)]
pub struct Election {
    /// See [`ElectionWithPoliticalGroups::id`]
    pub id: ElectionId,
    /// See [`ElectionWithPoliticalGroups::name`]
    pub name: String,
    /// See [`ElectionWithPoliticalGroups::committee_category`]
    pub committee_category: CommitteeCategory,
    /// See [`ElectionWithPoliticalGroups::counting_method`]
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub counting_method: Option<VoteCountingMethod>,
    /// See [`ElectionWithPoliticalGroups::election_id`]
    pub election_id: String,
    /// See [`ElectionWithPoliticalGroups::location`]
    pub location: String,
    /// See [`ElectionWithPoliticalGroups::authority_id`]
    pub authority_id: String,
    /// See [`ElectionWithPoliticalGroups::authority_name`]
    pub authority_name: String,
    /// See [`ElectionWithPoliticalGroups::authority_region`]
    pub authority_region: String,
    /// See [`ElectionWithPoliticalGroups::district`]
    pub district: CommitteeDistrict,
    /// See [`ElectionWithPoliticalGroups::domain`]
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub domain: Option<ElectionDomain>,
    /// See [`ElectionWithPoliticalGroups::category`]
    pub category: ElectionCategory,
    /// See [`ElectionWithPoliticalGroups::sub_category`]
    pub sub_category: ElectionSubCategory,
    /// See [`ElectionWithPoliticalGroups::number_of_seats`]
    pub number_of_seats: u32,
    /// See [`ElectionWithPoliticalGroups::number_of_voters`]
    pub number_of_voters: u32,
    /// See [`ElectionWithPoliticalGroups::election_date`]
    #[schema(value_type = String, format = "date")]
    pub election_date: NaiveDate,
    /// See [`ElectionWithPoliticalGroups::nomination_date`]
    #[schema(value_type = String, format = "date")]
    pub nomination_date: NaiveDate,
}

/// Election with political groups.
///
/// Note: an election within Abacus does not represent the entire election, but
/// rather a single committee (i.e. stembureau at the CSB, HSB or GSB level)
/// within the election.
///
/// When you do not need access to political groups and their candidates, you
/// can use [`Election`] instead. When creating a new election, use
/// [`NewElection`] instead.
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash, FromRow)]
#[serde(deny_unknown_fields)]
pub struct ElectionWithPoliticalGroups {
    /// Identifier of the election within Abacus
    pub id: ElectionId,
    /// Name of the election, as defined in the EML_NL election definition.
    pub name: String,
    /// The category (e.g. CSB) of the committee that this struct represents
    pub committee_category: CommitteeCategory,
    /// If this is a GSB committee, this is the counting method used for
    /// vote tabulation. This field is not used for other committee types.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub counting_method: Option<VoteCountingMethod>,
    /// The election identifier as defined in the EML_NL election definition
    pub election_id: String,
    /// The location of the committee.
    ///
    /// For GSB committees this will be the same as the authority region, but
    /// for HSBs and CSBs this may also be a specific town or city within the
    /// authority region.
    pub location: String,
    /// Identifier of the authority/region that this committee is responsible for.
    pub authority_id: String,
    /// Name of the authority. Note that most of the time this is the same as the
    /// region name, but specifically for country wide elections the authority
    /// name may also be "De Kiesraad" instead of the region name of "Nederland".
    pub authority_name: String,
    /// The name of the region that the committee is responsible for.
    pub authority_region: String,
    /// The district that this committee is responsible for. This will be None
    /// for committees within elections that do not have districts. When an
    /// election does have districts this will be All for committees that are
    /// responsible for all districts, or Specific for committees that sit
    /// within a specific district.
    pub district: CommitteeDistrict,
    /// An election wide field: for elections that do not concern the entire
    /// country this field contains the specific domain of that election. For
    /// example for municipal elections this contains the municipality that the
    /// election is for. Note that the election domain id is not always available,
    /// even if a domain is present. For country wide elections this field is None.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub domain: Option<ElectionDomain>,
    /// The category of the election, as defined by EML_NL election definition.
    /// Examples include "Municipal" for municipal elections or "WaterAuthority"
    /// for the water authority elections.
    pub category: ElectionCategory,
    /// The sub-category of the election, as defined by the EML_NL election
    /// definition.
    pub sub_category: ElectionSubCategory,
    /// The number of seats that are to be elected for. For example, this is 150
    /// for elections for the House of Representatives (Tweede Kamer).
    pub number_of_seats: u32,
    /// How many voters are registered for this election.
    pub number_of_voters: u32,
    /// The date of the election, as defined by the EML_NL election definition.
    /// Note: this is the date that the election takes/took place, not necessarily
    /// the date that the committee is in session.
    #[schema(value_type = String, format = "date")]
    pub election_date: NaiveDate,
    /// The date when candidate nominations for this election are/were closed.
    #[schema(value_type = String, format = "date")]
    pub nomination_date: NaiveDate,
    /// The political groups and their candidates that are registered for this
    /// election.
    #[sqlx(json)]
    pub political_groups: Vec<PoliticalGroup>,
}

impl From<ElectionWithPoliticalGroups> for Election {
    fn from(value: ElectionWithPoliticalGroups) -> Self {
        Self {
            id: value.id,
            name: value.name,
            committee_category: value.committee_category,
            counting_method: value.counting_method,
            election_id: value.election_id,
            location: value.location,
            authority_id: value.authority_id,
            authority_name: value.authority_name,
            authority_region: value.authority_region,
            district: value.district,
            domain: value.domain,
            category: value.category,
            sub_category: value.sub_category,
            number_of_seats: value.number_of_seats,
            number_of_voters: value.number_of_voters,
            election_date: value.election_date,
            nomination_date: value.nomination_date,
        }
    }
}

impl IntoResponse for Election {
    fn into_response(self) -> Response {
        Json(self).into_response()
    }
}

impl IntoResponse for ElectionWithPoliticalGroups {
    fn into_response(self) -> Response {
        Json(self).into_response()
    }
}

impl NameResolver for ElectionWithPoliticalGroups {
    fn resolve_affiliation_name(
        &self,
        affiliation_id: eml_nl::utils::AffiliationId,
    ) -> Option<String> {
        let aff_id: u32 = affiliation_id.value().get().try_into().ok()?;
        let aff_id = PGNumber::from(aff_id);

        self.political_groups
            .iter()
            .find(|pg| pg.number == aff_id)
            .map(|pg| pg.name.clone())
    }

    fn resolve_candidate_name(
        &self,
        affiliation_id: eml_nl::utils::AffiliationId,
        candidate_id: eml_nl::utils::CandidateId,
    ) -> Option<String> {
        let aff_id: u32 = affiliation_id.value().get().try_into().ok()?;
        let aff_id = PGNumber::from(aff_id);

        let cand_id: u32 = candidate_id.value().get().try_into().ok()?;
        let cand_id = CandidateNumber::from(cand_id);

        self.political_groups
            .iter()
            .find(|pg| pg.number == aff_id)
            .and_then(|pg| pg.candidates.iter().find(|c| c.number == cand_id))
            .map(|c| {
                let last = &c.last_name;
                let prefix = c.last_name_prefix.as_deref();
                let initials = &c.initials;

                let last_part = if let Some(prefix) = prefix {
                    format!("{} {}", prefix, last)
                } else {
                    last.to_string()
                };

                if !initials.is_empty() {
                    format!("{}, {}", last_part, initials)
                } else {
                    last_part
                }
            })
    }
}

/// Struct for creating a new election in Abacus.
///
/// This struct does not contain the internal Abacus election id, as that is
/// generated by Abacus when creating a new election.
///
/// Note: an election within Abacus does not represent the entire election, but
/// rather a single committee (i.e. stembureau at the CSB, HSB or GSB level)
/// within the election.
///
/// Please take a look at [`ElectionWithPoliticalGroups`] for the full election
/// representation, or [`Election`] for the election representation without
/// political groups and their candidates.
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct NewElection {
    /// See [`ElectionWithPoliticalGroups::name`]
    pub name: String,
    /// See [`ElectionWithPoliticalGroups::committee_category`]
    pub committee_category: CommitteeCategory,
    /// See [`ElectionWithPoliticalGroups::counting_method`]
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub counting_method: Option<VoteCountingMethod>,
    /// See [`ElectionWithPoliticalGroups::election_id`]
    pub election_id: String,
    /// See [`ElectionWithPoliticalGroups::location`]
    pub location: String,
    /// See [`ElectionWithPoliticalGroups::authority_id`]
    pub authority_id: String,
    /// See [`ElectionWithPoliticalGroups::authority_name`]
    pub authority_name: String,
    /// See [`ElectionWithPoliticalGroups::authority_region`]
    pub authority_region: String,
    /// See [`ElectionWithPoliticalGroups::district`]
    pub district: CommitteeDistrict,
    /// See [`ElectionWithPoliticalGroups::domain`]
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub domain: Option<ElectionDomain>,
    /// See [`ElectionWithPoliticalGroups::category`]
    pub category: ElectionCategory,
    /// See [`ElectionWithPoliticalGroups::sub_category`]
    pub sub_category: ElectionSubCategory,
    /// See [`ElectionWithPoliticalGroups::number_of_seats`]
    pub number_of_seats: u32,
    /// See [`ElectionWithPoliticalGroups::number_of_voters`]
    pub number_of_voters: u32,
    /// See [`ElectionWithPoliticalGroups::election_date`]
    #[schema(value_type = String, format = "date")]
    pub election_date: NaiveDate,
    /// See [`ElectionWithPoliticalGroups::nomination_date`]
    #[schema(value_type = String, format = "date")]
    pub nomination_date: NaiveDate,
    /// See [`ElectionWithPoliticalGroups::political_groups`]
    pub political_groups: Vec<RegisteredPoliticalGroup>,
}

/// Election number of voters change request
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema, Type, FromRow)]
#[serde(deny_unknown_fields)]
pub struct ElectionNumberOfVotersChangeRequest {
    pub number_of_voters: u32,
}

/// Election category (limited for now)
#[derive(
    Serialize,
    Deserialize,
    strum::Display,
    strum::EnumString,
    strum::VariantArray,
    ToSchema,
    Clone,
    Copy,
    Debug,
    PartialEq,
    Eq,
    Hash,
    Type,
)]
#[strum(serialize_all = "lowercase", ascii_case_insensitive)]
pub enum ElectionCategory {
    /// Gemeenteraadsverkiezing
    Municipal,
    /// Provinciale Statenverkiezing
    Provincial,
    /// Waterschapsverkiezing
    WaterAuthority,
}

impl ElectionCategory {
    pub fn is_local_election(&self) -> bool {
        match self {
            ElectionCategory::Municipal => true,
            ElectionCategory::Provincial => false,
            ElectionCategory::WaterAuthority => false,
        }
    }

    pub fn to_eml_code(&self) -> &'static str {
        match self {
            ElectionCategory::Municipal => "GR",
            ElectionCategory::Provincial => "PS",
            ElectionCategory::WaterAuthority => "AB",
        }
    }

    /// Returns whether the election should have an election domain.
    ///
    /// An election domain is the specific region that an election takes place in,
    /// i.e. the municipality, province or water authority. Country wide elections
    /// do not have an election domain.
    pub fn has_election_domain(&self) -> bool {
        true
    }

    /// Get the sub category for test elections, only available for tests and test data generation
    #[cfg(any(test, feature = "dev-database"))]
    pub fn sub_category(&self, number_of_seats: u32) -> ElectionSubCategory {
        match self {
            ElectionCategory::Municipal => {
                if number_of_seats < 19 {
                    ElectionSubCategory::GR1
                } else {
                    ElectionSubCategory::GR2
                }
            }
            // Default to PS1
            ElectionCategory::Provincial => ElectionSubCategory::PS1,
            ElectionCategory::WaterAuthority => {
                if number_of_seats < 19 {
                    ElectionSubCategory::AB1
                } else {
                    ElectionSubCategory::AB2
                }
            }
        }
    }
}

/// Category of a region, as defined by EML-NL
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, ToSchema)]
pub enum RegionCategory {
    /// The highest level of government, the 'staat'.
    State,
    /// A 'waterschap'
    WaterAuthority,
    /// A 'provincie'
    Province,
    /// A 'kieskring'
    ElectoralDistrict,
    /// A 'gemeente', the lowest level of government region in mainland Netherlands.
    Municipality,
    /// A 'stembureau' (note: only for Eerste Kamer elections)
    PollingStation,
}

/// Identifies a specific region from the election tree for usage within Abacus.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, ToSchema)]
pub struct RegionKey {
    /// Category of the region, as defined by EML_NL
    pub category: RegionCategory,
    /// Identifier of the region, if it has one.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub number: Option<u16>,
}

/// Identifies a specific region from the election tree for usage within Abacus.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, ToSchema)]
pub struct RegionDetails {
    /// Name of the region
    pub name: String,

    /// Key of the region (combination of category and id)
    pub key: RegionKey,

    /// Whether this region uses roman numerals for its contest id.
    pub roman_numerals: bool,

    /// Whether this region allows Frisian export.
    pub frisian_export_allowed: bool,
}

/// Which district this committee is contained within.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, ToSchema)]
#[serde(tag = "district")]
pub enum CommitteeDistrict {
    /// The election has no districts
    None,
    /// This committee operates over all districts
    All,
    /// This committee operates within a specific district
    Specific(RegionDetails),
}

impl CommitteeDistrict {
    /// Retrieve the region details from the district information if available.
    ///
    /// Note that when the committee district is set to all or none, this
    /// information is not available.
    pub fn region_details(&self) -> Option<&RegionDetails> {
        match self {
            Self::Specific(r) => Some(r),
            _ => None,
        }
    }
}

/// Election domain (i.e. the entity at which the election takes place)
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
pub struct ElectionDomain {
    /// Identifier of the domain
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub id: Option<String>,
    /// Name of the domain
    pub name: String,
}

/// Election sub category (limited for now)
#[derive(
    Serialize, Deserialize, strum::Display, ToSchema, Clone, Copy, Debug, PartialEq, Eq, Hash, Type,
)]
pub enum ElectionSubCategory {
    /// Waterschapsverkiezing < 19 seats
    AB1,
    /// Waterschapsverkiezing >= 19 seats
    AB2,
    /// Gemeenteraadsverkiezing < 19 seats
    GR1,
    /// Gemeenteraadsverkiezing >= 19 seats
    GR2,
    /// Provinciale Statenverkiezing single district
    PS1,
    /// Provinciale Statenverkiezing multiple districts
    PS2,
}

/// Committee category
#[derive(
    Serialize,
    Deserialize,
    strum::Display,
    strum::EnumString,
    strum::VariantArray,
    ToSchema,
    Clone,
    Copy,
    Debug,
    PartialEq,
    Eq,
    Hash,
    Type,
)]
#[strum(serialize_all = "lowercase", ascii_case_insensitive)]
pub enum CommitteeCategory {
    /// Gemeentelijk stembureau
    GSB,
    /// Centraal stembureau
    CSB,
}

#[derive(
    Serialize,
    Deserialize,
    strum::Display,
    strum::EnumString,
    strum::VariantArray,
    ToSchema,
    Clone,
    Copy,
    Debug,
    PartialEq,
    Eq,
    Hash,
    Type,
)]
#[strum(serialize_all = "lowercase", ascii_case_insensitive)]
pub enum VoteCountingMethod {
    /// centralized vote counting method
    CSO,
    /// decentralized vote counting method
    DSO,
}

id!(PGNumber);

/// Political group and its candidates (with registered name as imported from the EML)
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
#[serde(deny_unknown_fields)]
pub struct RegisteredPoliticalGroup {
    /// Political group number
    #[schema(value_type = u32)]
    pub number: PGNumber,
    /// Registered political group name as imported from the candidates list EML (230)
    pub registered_name: String,
    /// List of candidates of the political group
    pub candidates: Vec<Candidate>,
}

/// Political group and its candidates (with name as used for display purposes)
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
#[serde(deny_unknown_fields)]
pub struct PoliticalGroup {
    /// Political group number
    #[schema(value_type = u32)]
    pub number: PGNumber,
    /// Political group name as used for display purposes (with 'Blanco' in case of empty registered name)
    pub name: String,
    /// Registered political group name as imported from the candidates list EML (230)
    #[serde(skip_serializing)]
    pub registered_name: String,
    /// List of candidates of the political group
    pub candidates: Vec<Candidate>,
}

impl From<RegisteredPoliticalGroup> for PoliticalGroup {
    fn from(row: RegisteredPoliticalGroup) -> Self {
        Self {
            number: row.number,
            name: political_group_name(&row.registered_name, &row.candidates),
            registered_name: row.registered_name,
            candidates: row.candidates,
        }
    }
}

fn political_group_name(registered_name: &str, candidates: &[Candidate]) -> String {
    if registered_name.is_empty() {
        let mut name = String::new();
        let first_candidate = candidates
            .first()
            .expect("At least 1 candidate should be present");

        let mut last_name = String::new();

        if let Some(last_name_prefix) = &first_candidate.last_name_prefix {
            last_name.push_str(&format!(
                "{} {}",
                last_name_prefix, first_candidate.last_name
            ));
        } else {
            last_name.push_str(&first_candidate.last_name.to_string());
        }

        name.push_str(&format!(
            "Blanco ({}, {})",
            last_name, first_candidate.initials
        ));
        name
    } else {
        registered_name.to_string()
    }
}

id!(CandidateNumber);

/// Candidate
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
#[serde(deny_unknown_fields)]
pub struct Candidate {
    #[schema(value_type = u32)]
    pub number: CandidateNumber,
    pub initials: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub first_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub last_name_prefix: Option<String>,
    pub last_name: String,
    pub locality: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub country_code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub gender: Option<CandidateGender>,
}

/// Candidate gender
#[derive(Serialize, Deserialize, ToSchema, Clone, Copy, Debug, PartialEq, Eq, Hash)]
#[serde(deny_unknown_fields)]
pub enum CandidateGender {
    Male,
    Female,
    X,
}

#[cfg(test)]
pub(crate) mod tests {
    use chrono::NaiveDate;

    use super::*;

    /// Creates a vector of political groups with candidates, where the number of candidates in each
    /// political group is equal to the value in the slice at that index.
    pub fn political_groups_with_candidates(
        political_groups_candidates: &[u32],
    ) -> Vec<PoliticalGroup> {
        political_groups_candidates
            .iter()
            .enumerate()
            .map(|(i, &candidates)| PoliticalGroup {
                number: PGNumber::try_from(i + 1).unwrap(),
                name: format!("Political group {}", i + 1),
                registered_name: format!("Political group {}", i + 1),
                candidates: (0..candidates)
                    .map(|j| Candidate {
                        number: CandidateNumber::from(j + 1),
                        initials: "A.B.".to_string(),
                        first_name: Some(format!("Candidate {}", j + 1)),
                        last_name_prefix: Some("van".to_string()),
                        last_name: format!("PG {}", i + 1),
                        locality: "Juinen".to_string(),
                        country_code: Some("NL".to_string()),
                        gender: Some(CandidateGender::X),
                    })
                    .collect(),
            })
            .collect()
    }

    /// Create a test election with some political groups and a given number of seats.
    /// The number of political groups is the length of the `political_groups_candidates` slice.
    /// The number of candidates in each political group is equal to the value in the slice at that index.
    pub fn election_fixture_with_given_number_of_seats(
        election_category: ElectionCategory,
        committee_category: CommitteeCategory,
        political_groups_candidates: &[u32],
        number_of_seats: u32,
    ) -> ElectionWithPoliticalGroups {
        ElectionWithPoliticalGroups {
            id: ElectionId::from(1),
            name: "Test".to_string(),
            committee_category,
            counting_method: if committee_category == CommitteeCategory::GSB {
                Some(VoteCountingMethod::CSO)
            } else {
                None
            },
            election_id: "GR2023_Test".to_string(),
            location: "Test".to_string(),
            authority_id: match committee_category {
                CommitteeCategory::GSB => "0000".to_string(),
                CommitteeCategory::CSB => "CSB".to_string(),
            },
            authority_name: "Test".to_string(),
            authority_region: "Test".to_string(),
            district: CommitteeDistrict::None,
            domain: Some(ElectionDomain {
                id: if election_category != ElectionCategory::Provincial {
                    Some("0000".to_string()) // provincial elections do not have a domain id
                } else {
                    None
                },
                name: "Test".to_string(),
            }),
            category: election_category,
            sub_category: election_category.sub_category(number_of_seats),
            number_of_seats,
            number_of_voters: 1000,
            election_date: NaiveDate::from_ymd_opt(2023, 11, 1).unwrap(),
            nomination_date: NaiveDate::from_ymd_opt(2023, 11, 1).unwrap(),
            political_groups: political_groups_with_candidates(political_groups_candidates),
        }
    }

    /// Create a test election with some political groups.
    /// The number of political groups is the length of the `political_groups_candidates` slice.
    /// The number of candidates in each political group is equal to the value in the slice at that index.
    pub fn election_fixture(
        election_category: ElectionCategory,
        committee_category: CommitteeCategory,
        political_groups_candidates: &[u32],
    ) -> ElectionWithPoliticalGroups {
        election_fixture_with_given_number_of_seats(
            election_category,
            committee_category,
            political_groups_candidates,
            29,
        )
    }

    pub struct ElectionBuilder {
        election_category: ElectionCategory,
        committee_category: Option<CommitteeCategory>,
        counting_method: Option<VoteCountingMethod>,
    }

    impl ElectionBuilder {
        pub fn municipal() -> Self {
            Self {
                election_category: ElectionCategory::Municipal,
                committee_category: None,
                counting_method: None,
            }
        }

        pub fn with_committee_category(&self, committee_category: CommitteeCategory) -> Self {
            Self {
                committee_category: Some(committee_category),
                ..*self
            }
        }

        pub fn with_counting_method(&self, counting_method: Option<VoteCountingMethod>) -> Self {
            Self {
                counting_method,
                ..*self
            }
        }
        pub fn build(self) -> ElectionWithPoliticalGroups {
            let Some(category) = self.committee_category else {
                panic!("CommitteeCategory is mandatory");
            };

            let mut election = election_fixture(self.election_category, category, &[2]);
            election.counting_method = self.counting_method;
            election
        }
    }
}
