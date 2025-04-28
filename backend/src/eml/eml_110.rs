use chrono::NaiveDate;
use serde::{Deserialize, Serialize};

use crate::election::PoliticalGroup;

use super::{
    EMLBase,
    common::{
        ContestIdentifier, EMLImportError, ElectionCategory, ElectionIdentifier,
        ElectionSubcategory, ManagingAuthority,
    },
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

impl EML110 {
    fn election(&self) -> &Election {
        &self.election_event.election
    }

    fn election_tree(&self) -> Option<&ElectionTree> {
        self.election().election_tree.as_ref()
    }

    fn election_identifier(&self) -> &ElectionIdentifier {
        &self.election().election_identifier
    }

    fn first_region(&self) -> Option<&Region> {
        self.election_tree().and_then(|t| t.regions.first())
    }

    pub fn as_crate_election(&self) -> Result<crate::election::Election, EMLImportError> {
        // we need to be importing from a 110a file
        if self.base.id != "110a" {
            return Err(EMLImportError::Needs101a);
        }

        // we need a region
        let Some(region) = self.first_region() else {
            return Err(EMLImportError::MissingRegion);
        };

        // we currently only support GR elections
        let ElectionCategory::GR = self.election_identifier().election_category else {
            return Err(EMLImportError::OnlyMunicipalSupported);
        };

        // extract number of seats, if not available: error
        let Some(number_of_seats) = self.election().number_of_seats else {
            return Err(EMLImportError::MissingNumberOfSeats);
        };

        // clippy suggests way less readable alternative
        #[allow(clippy::manual_range_contains)]
        if number_of_seats < 9 || number_of_seats > 45 {
            return Err(EMLImportError::NumberOfSeatsNotInRange);
        }

        // election subcategory is required
        let Some(election_subcategory) = self.election_identifier().election_subcategory.clone()
        else {
            return Err(EMLImportError::MissingSubcategory);
        };

        // preference threshold is required
        let Some(preference_threshold) = self.election().preference_threshold else {
            return Err(EMLImportError::MissingPreferenceThreshold);
        };

        // check for consistency, number of seats, subcategory and preference threshold need to match
        if election_subcategory == ElectionSubcategory::GR1 {
            if number_of_seats >= 19 {
                return Err(EMLImportError::MismatchNumberOfSeats);
            }

            if preference_threshold != 50 {
                return Err(EMLImportError::MismatchPreferenceThreshold);
            }
        }

        if election_subcategory == ElectionSubcategory::GR2 {
            if number_of_seats < 19 {
                return Err(EMLImportError::MismatchNumberOfSeats);
            }

            if preference_threshold != 25 {
                return Err(EMLImportError::MismatchPreferenceThreshold);
            }
        }

        // get and parse the election date
        let Ok(election_date) =
            NaiveDate::parse_from_str(&self.election_identifier().election_date, "%Y-%m-%d")
        else {
            return Err(EMLImportError::InvalidDateFormat);
        };

        // get and parse the nomination date (required for 110a)
        let nomination_date = self
            .election_identifier()
            .nomination_date
            .as_ref()
            .ok_or(EMLImportError::MissingNominationDate)?;
        let Ok(nomination_date) = NaiveDate::parse_from_str(&nomination_date[..], "%Y-%m-%d")
        else {
            return Err(EMLImportError::InvalidDateFormat);
        };

        // extract initial listing of political groups
        let political_groups = self
            .election()
            .registered_parties
            .iter()
            .enumerate()
            .map(|(idx, rp)| {
                Ok(PoliticalGroup {
                    // temporary group number, actual group numbers will be imported from candidate list
                    number: u32::try_from(idx + 1)
                        .or(Err(EMLImportError::TooManyPoliticalGroups))?,
                    name: rp.registered_appellation.clone(),
                    candidates: vec![],
                })
            })
            .collect::<Result<Vec<PoliticalGroup>, EMLImportError>>()?;

        // construct the election
        let election = crate::election::Election {
            id: u32::MAX, // automatically generated once inserted in the database
            name: self.election_identifier().election_name.clone(),
            location: region.region_name.clone(),
            number_of_voters: 0, // max votes is in 110b, so nothing for now
            category: crate::election::ElectionCategory::Municipal,
            number_of_seats,
            election_date,
            nomination_date,
            status: crate::election::ElectionStatus::Created,
            political_groups: Some(political_groups),
        };

        Ok(election)
    }
}

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
    // required in 110a, not in 110b
    #[serde(skip_serializing_if = "Option::is_none", default)]
    number_of_seats: Option<u32>,
    // required in 110a, not in 110b
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
    use quick_xml::DeError;

    use crate::eml::{EML110, EMLDocument, EMLImportError, eml_110::VotingMethod};

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

    #[test]
    fn test_election_validate_invalid_election_missing_region() {
        let data = include_str!("./tests/eml110a_invalid_election_missing_region.eml.xml");
        let doc = EML110::from_str(data).unwrap_err();
        assert!(matches!(doc, DeError::Custom(_)));
    }

    #[test]
    fn test_election_validate_invalid_election_number_of_seats() {
        let data = include_str!("./tests/eml110a_invalid_election_number_of_seats.eml.xml");
        let doc = EML110::from_str(data).unwrap();
        let res = doc.as_crate_election().unwrap_err();
        assert!(matches!(res, EMLImportError::MismatchNumberOfSeats));
    }

    #[test]
    fn test_election_validate_invalid_election_subcategory() {
        let data = include_str!("./tests/eml110a_invalid_election_subcategory.eml.xml");
        let doc = EML110::from_str(data).unwrap();
        let res = doc.as_crate_election().unwrap_err();
        assert!(matches!(res, EMLImportError::MismatchNumberOfSeats));
    }

    #[test]
    fn test_election_validate_invalid_election_date_format() {
        let data = include_str!("./tests/eml110a_invalid_election_date_format.eml.xml");
        let doc = EML110::from_str(data).unwrap();
        let res = doc.as_crate_election().unwrap_err();
        assert!(matches!(res, EMLImportError::InvalidDateFormat));
    }

    #[test]
    fn test_election_validate_invalid_election_missing_nomination_date() {
        let data = include_str!("./tests/eml110a_invalid_election_missing_nomination_date.eml.xml");
        let doc = EML110::from_str(data).unwrap();
        let res = doc.as_crate_election().unwrap_err();
        assert!(matches!(res, EMLImportError::MissingNominationDate));
    }

    #[test]
    fn test_election_validate_invalid_election_mismatch_preference_threshold() {
        let data =
            include_str!("./tests/eml110a_invalid_election_mismatch_preference_threshold.eml.xml");
        let doc = EML110::from_str(data).unwrap();
        let res = doc.as_crate_election().unwrap_err();
        assert!(matches!(res, EMLImportError::MismatchPreferenceThreshold));
    }

    #[test]
    fn test_election_validate_invalid_election_missing_subcategory() {
        let data = include_str!("./tests/eml110a_invalid_election_missing_subcategory.eml.xml");
        let doc = EML110::from_str(data).unwrap();
        let res = doc.as_crate_election().unwrap_err();
        assert!(matches!(res, EMLImportError::MissingSubcategory));
    }

    #[test]
    fn test_election_validate_invalid_election_missing_number_of_seats() {
        let data = include_str!("./tests/eml110a_invalid_election_missing_number_of_seats.eml.xml");
        let doc = EML110::from_str(data).unwrap();
        let res = doc.as_crate_election().unwrap_err();
        assert!(matches!(res, EMLImportError::MissingNumberOfSeats));
    }

    #[test]
    fn test_election_with_invalid_xml() {
        let data = include_str!("./tests/eml110a_invalid_xml.eml.xml");
        let doc = EML110::from_str(data).unwrap_err();
        assert!(matches!(doc, DeError::InvalidXml(_)));
    }
}
