use serde::{Deserialize, Serialize};

use super::{
    EMLBase,
    common::{ContestIdentifier, ElectionIdentifier, ManagingAuthority},
};

/// Election definition (110a and 110b)
///
/// Use the `EMLDocument` methods to serialize to or deserialize from XML.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct EML110 {
    #[serde(flatten)]
    pub base: EMLBase,
    pub transaction_id: String,
    #[serde(rename(serialize = "kr:CreationDateTime", deserialize = "CreationDateTime"))]
    pub creation_date_time: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub issue_date: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub managing_authority: Option<ManagingAuthority>,
    pub election_event: ElectionEvent,
}

impl super::base::EMLDocument for EML110 {}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct ElectionEvent {
    pub event_identifier: EventIdentifier,
    pub election: Election,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct EventIdentifier {}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct Election {
    election_identifier: ElectionIdentifier,
    contest: Contest,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    number_of_seats: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    preference_threshold: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    election_tree: Option<ElectionTree>,
    #[serde(
        with = "registered_parties",
        rename(serialize = "kr:RegisteredParties", deserialize = "RegisteredParties"),
        default
    )]
    registered_parties: Vec<RegisteredParty>,
}

super::util::gen_wrap_list!(
    registered_parties,
    RegisteredParty,
    "kr:RegisteredParty",
    "RegisteredParty"
);

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct Contest {
    // According to EML-NL this element is required, but it is sometimes missing for some imports
    #[serde(skip_serializing_if = "Option::is_none", default)]
    contest_identifier: Option<ContestIdentifier>,
    voting_method: VotingMethod,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    max_votes: Option<String>,
    #[serde(rename = "PollingPlace", default)]
    polling_places: Vec<PollingPlace>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct PollingPlace {
    physical_location: PhysicalLocation,
    #[serde(rename = "@Channel")]
    channel: VotingChannelType,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Copy)]
#[serde(rename_all = "lowercase")]
pub enum VotingChannelType {
    Polling,
    Postal,
    #[serde(other)]
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct PhysicalLocation {
    address: Address,
    polling_station: PollingStation,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct PollingStation {
    #[serde(rename = "$text")]
    token: String,
    #[serde(rename = "@Id")]
    id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct Address {
    locality: Locality,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct Locality {
    #[serde(rename(serialize = "xal:LocalityName", deserialize = "LocalityName"))]
    locality_name: LocalityName,
    #[serde(
        skip_serializing_if = "Option::is_none",
        default,
        rename(serialize = "xal:PostalCode", deserialize = "PostalCode")
    )]
    postal_code: Option<PostalCode>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct PostalCode {
    #[serde(rename(serialize = "xal:PostalCodeNumber", deserialize = "PostalCodeNumber"))]
    postal_code_number: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct LocalityName {
    #[serde(rename = "$text")]
    name: String,
    #[serde(rename = "@Type", skip_serializing_if = "Option::is_none", default)]
    locality_type: Option<String>,
    #[serde(rename = "@Code", skip_serializing_if = "Option::is_none", default)]
    code: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum VotingMethod {
    #[serde(rename = "SPV")]
    SinglePreferenceVote,
    #[serde(other)]
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct ElectionTree {
    #[serde(rename(serialize = "kr:Region", deserialize = "Region"))]
    regions: Vec<Region>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct Region {
    #[serde(rename(serialize = "kr:RegionName", deserialize = "RegionName"))]
    region_name: String,
    #[serde(rename = "@RegionNumber")]
    region_number: Option<String>,
    #[serde(rename = "@RegionCategory")]
    region_category: RegionCategory,
    #[serde(rename = "@RomanNumerals", default)]
    roman_numerals: bool,
    #[serde(rename = "@FrysianExportAllowed", default)]
    frysian_export_allowed: bool,
    #[serde(rename = "@SuperiorRegionNumber")]
    superior_region_number: Option<String>,
    #[serde(rename = "@SuperiorRegionCategory")]
    superior_region_category: Option<RegionCategory>,
    #[serde(rename(serialize = "kr:Committee", deserialize = "Committee"))]
    committees: Vec<Committee>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Copy)]
pub enum RegionCategory {
    #[serde(rename = "DEELGEMEENTE")]
    SubMunicipality,
    #[serde(rename = "GEMEENTE")]
    Municipality,
    #[serde(rename = "KIESKRING")]
    ElectoralDistrict,
    #[serde(rename = "PROVINCIE")]
    Province,
    #[serde(rename = "PROVINCIAAL_KIESKRING")]
    ProvinceElectoralDistrict,
    #[serde(rename = "PROVINCIAAL_STEMBUREAU")]
    ProvincePollingStation,
    #[serde(rename = "STAAT")]
    State,
    #[serde(rename = "STEMBUREAU")]
    PollingStation,
    #[serde(rename = "WATERSCHAP")]
    WaterAuthority,
    #[serde(rename = "WATERSCHAP_KIESKRING")]
    WaterAuthorityElectoralDistrict,
    #[serde(rename = "WATERSCHAP_GEMEENTE")]
    WaterAuthorityMunicipality,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct Committee {
    #[serde(rename = "@CommitteeCategory")]
    category: CommitteeCategory,
    #[serde(rename = "@CommitteeName")]
    name: Option<String>,
    #[serde(rename = "@AcceptCentralSubmissions", default)]
    accept_central_submissions: bool,
}

#[allow(clippy::upper_case_acronyms)]
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Copy)]
pub enum CommitteeCategory {
    CSB,
    HSB,
    #[serde(rename = "PROV_SB")]
    PROVSB,
    PSB,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct RegisteredParty {
    #[serde(rename(
        serialize = "kr:RegisteredAppellation",
        deserialize = "RegisteredAppellation"
    ))]
    registered_appellation: String,
}

#[cfg(test)]
mod tests {
    use crate::eml::{EML110, EMLDocument, eml_110::VotingMethod};

    #[test]
    fn test_deserialize_eml110a() {
        let data = include_str!("./tests/eml110a_test.eml.xml");
        let doc = EML110::from_str(data).unwrap();
        assert_eq!(doc.creation_date_time, "2022-02-04T11:16:26.827");
        assert_eq!(
            doc.election_event.election.contest.voting_method,
            VotingMethod::SinglePreferenceVote
        );
        assert_eq!(
            doc.election_event
                .election
                .election_tree
                .unwrap()
                .regions
                .len(),
            1
        );
    }

    #[test]
    fn test_deserialize_eml110b() {
        let data = include_str!("./tests/eml110b_test.eml.xml");
        let doc = EML110::from_str(data).unwrap();
        assert_eq!(doc.creation_date_time, "2024-05-27T17:05:57");
        assert_eq!(
            doc.election_event.election.contest.polling_places.len(),
            420
        );
    }
}
