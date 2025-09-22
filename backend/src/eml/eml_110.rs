use chrono::NaiveDate;
use serde::{Deserialize, Deserializer, Serialize};

use crate::{
    election::{PoliticalGroup, VoteCountingMethod},
    eml::common::{AuthorityAddress, AuthorityIdentifier},
    polling_station::PollingStationRequest,
};

use super::{
    EMLBase,
    common::{
        ContestIdentifier, EMLImportError, ElectionCategory, ElectionDomain, ElectionIdentifier,
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

    fn election_identifier(&self) -> &ElectionIdentifier {
        &self.election().election_identifier
    }

    fn election_domain(&self) -> Option<&ElectionDomain> {
        self.election_identifier().election_domain.as_ref()
    }

    fn contest(&self) -> &Contest {
        &self.election().contest
    }

    pub fn as_abacus_election(&self) -> Result<crate::election::NewElection, EMLImportError> {
        // we need to be importing from a 110a file
        if self.base.id != "110a" {
            return Err(EMLImportError::Needs110a);
        }

        // we currently only support GR elections
        let ElectionCategory::GR = self.election_identifier().election_category else {
            return Err(EMLImportError::OnlyMunicipalSupported);
        };

        // we need the election domain
        let Some(election_domain) = self.election_domain() else {
            return Err(EMLImportError::MissingElectionDomain);
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
        let Some(election_subcategory) = self.election_identifier().election_subcategory else {
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

        // check that the voting method is SPV
        if self.election().contest.voting_method != VotingMethod::SinglePreferenceVote {
            return Err(EMLImportError::InvalidVotingMethod);
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
        let election = crate::election::NewElection {
            name: self.election_identifier().election_name.clone(),
            counting_method: VoteCountingMethod::CSO,
            election_id: self.election_identifier().id.clone(),
            location: election_domain.name.clone(),
            domain_id: election_domain.id.clone(),
            category: crate::election::ElectionCategory::Municipal,
            number_of_seats,
            election_date,
            nomination_date,
            political_groups,
        };

        Ok(election)
    }

    ///
    /// Extract polling places from a 110b
    ///
    pub fn get_polling_stations(
        &self,
    ) -> std::result::Result<Vec<PollingStationRequest>, EMLImportError> {
        // we need to be importing from a 110b file
        if self.base.id != "110b" {
            return Err(EMLImportError::Needs110b);
        }

        // make sure there are polling places
        if self.contest().polling_places.is_empty() {
            return Err(EMLImportError::MissingPollingStations);
        }

        // extract polling places
        let polling_places = self
            .contest()
            .polling_places
            .iter()
            .map(|place| place.try_into())
            .collect::<Result<Vec<PollingStationRequest>, EMLImportError>>()?;

        Ok(polling_places)
    }

    ///
    /// Get number of voters from 110b
    ///
    pub fn get_number_of_voters(&self) -> std::result::Result<u32, EMLImportError> {
        // we need to be importing from a 110b file
        if self.base.id != "110b" {
            return Err(EMLImportError::Needs110b);
        }

        // Get number of voters
        let number_of_voters: u32;
        if let Some(voters) = &self.contest().max_votes {
            number_of_voters = voters
                .parse()
                .or(Err(EMLImportError::InvalidNumberOfVoters))?;
        } else {
            return Err(EMLImportError::InvalidNumberOfVoters);
        }

        Ok(number_of_voters)
    }

    ///
    /// Check if the election id from the polling stations file matches the election
    /// Note: this is optional and should not return an error
    ///
    pub fn polling_station_definition_matches_election(
        &self,
        election: &crate::election::NewElection,
    ) -> std::result::Result<bool, EMLImportError> {
        // we need to be importing from a 110b file
        if self.base.id != "110b" {
            return Err(EMLImportError::Needs110b);
        }

        Ok(election.election_id == self.election_identifier().id)
    }

    pub fn definition_from_abacus_election(
        election: &crate::election::ElectionWithPoliticalGroups,
        transaction_id: &str,
    ) -> Self {
        let now = chrono::Utc::now();
        let subcategory = if election.number_of_seats >= 19 {
            ElectionSubcategory::GR2
        } else {
            ElectionSubcategory::GR1
        };

        Self {
            base: EMLBase::new("110a"),
            transaction_id: transaction_id.to_owned(),
            creation_date_time: now.to_rfc3339_opts(chrono::SecondsFormat::Secs, true),
            issue_date: Some(now.format("%Y-%m-%d").to_string()),
            managing_authority: None,
            election_event: ElectionEvent {
                event_identifier: EventIdentifier {},
                election: Election {
                    election_identifier: ElectionIdentifier::from_election(election, true),
                    contest: Contest {
                        contest_identifier: Some(ContestIdentifier::geen()),
                        voting_method: VotingMethod::SinglePreferenceVote,
                        max_votes: None,
                        polling_places: vec![],
                    },
                    number_of_seats: Some(election.number_of_seats),
                    preference_threshold: Some(if subcategory == ElectionSubcategory::GR2 {
                        25
                    } else {
                        50
                    }),
                    registered_parties: election
                        .political_groups
                        .iter()
                        .map(|group| RegisteredParty {
                            registered_appellation: group.name.clone(),
                        })
                        .collect(),
                },
            },
        }
    }

    pub fn polling_stations_from_election(
        committee_session: &crate::committee_session::CommitteeSession,
        election: &crate::election::ElectionWithPoliticalGroups,
        polling_stations: &[crate::polling_station::PollingStation],
        transaction_id: &str,
    ) -> Self {
        let now = chrono::Utc::now();

        Self {
            base: EMLBase::new("110b"),
            transaction_id: transaction_id.to_string(),
            creation_date_time: now.to_rfc3339_opts(chrono::SecondsFormat::Secs, true),
            issue_date: None,
            managing_authority: Some(ManagingAuthority {
                authority_identifier: AuthorityIdentifier {
                    id: election.domain_id.clone(),
                    name: election.location.clone(),
                    created_by_authority: None,
                },
                authority_address: AuthorityAddress {},
            }),
            election_event: ElectionEvent {
                event_identifier: EventIdentifier {},
                election: Election {
                    election_identifier: ElectionIdentifier::from_election(election, false),
                    contest: Contest {
                        contest_identifier: Some(ContestIdentifier::geen()),
                        voting_method: VotingMethod::Unknown,
                        max_votes: Some(committee_session.number_of_voters.to_string()),
                        polling_places: polling_stations
                            .iter()
                            .map(|ps| PollingPlace {
                                physical_location: PhysicalLocation {
                                    address: Address {
                                        locality: Locality {
                                            locality_name: LocalityName {
                                                name: ps.name.clone(),
                                                locality_type: None,
                                                code: None,
                                            },
                                            postal_code: Some(PostalCode {
                                                postal_code_number: ps.postal_code.clone(),
                                            }),
                                        },
                                    },
                                    polling_station: PollingStation {
                                        number_of_voters: ps.number_of_voters,
                                        id: ps.id.to_string(),
                                    },
                                },
                                channel: VotingChannelType::Polling,
                            })
                            .collect(),
                    },
                    number_of_seats: None,
                    preference_threshold: None,
                    registered_parties: vec![],
                },
            },
        }
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
    #[serde(rename = "@Id")]
    id: String,
    #[serde(deserialize_with = "deserialize_number_of_voters", rename = "$text")]
    number_of_voters: Option<i64>,
}

/// If the string value for number_of_voters contains a positive integer,
/// return the integer and store as number of voters
/// in all other cases; ignore errors and leave empty
fn deserialize_number_of_voters<'de, D>(data: D) -> Result<Option<i64>, D::Error>
where
    D: Deserializer<'de>,
{
    let str = String::deserialize(data)?;

    match str.parse::<i64>() {
        Ok(value) => {
            if value > 0 {
                Ok(Some(value))
            } else {
                Ok(None)
            }
        }
        Err(..) => Ok(None),
    }
}

impl TryInto<PollingStationRequest> for &PollingPlace {
    type Error = EMLImportError;

    fn try_into(self) -> Result<PollingStationRequest, Self::Error> {
        Ok(PollingStationRequest {
            name: self
                .physical_location
                .address
                .locality
                .locality_name
                .name
                .clone(),
            number: Some(
                self.physical_location
                    .polling_station
                    .id
                    .parse::<i64>()
                    .or(Err(EMLImportError::InvalidPollingStation))?,
            ),
            number_of_voters: self.physical_location.polling_station.number_of_voters,
            polling_station_type: None,
            address: "".to_string(),
            postal_code: match self.physical_location.address.locality.postal_code.clone() {
                Some(code) => code.postal_code_number,
                None => "".to_string(),
            },
            locality: "".to_string(),
        })
    }
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
    fn test_election_validate_invalid_election_number_of_seats() {
        let data = include_str!("./tests/eml110a_invalid_election_number_of_seats.eml.xml");
        let doc = EML110::from_str(data).unwrap();
        let res = doc.as_abacus_election().unwrap_err();
        assert!(matches!(res, EMLImportError::MismatchNumberOfSeats));
    }

    #[test]
    fn test_election_validate_invalid_election_subcategory() {
        let data = include_str!("./tests/eml110a_invalid_election_subcategory.eml.xml");
        let doc = EML110::from_str(data).unwrap();
        let res = doc.as_abacus_election().unwrap_err();
        // note: even though the subcategory is wrong in this file, the code is
        // setup to show the mismatch in number of seats as the problem
        assert!(matches!(res, EMLImportError::MismatchNumberOfSeats));
    }

    #[test]
    fn test_election_validate_invalid_election_date_format() {
        let data = include_str!("./tests/eml110a_invalid_election_date_format.eml.xml");
        let doc = EML110::from_str(data).unwrap();
        let res = doc.as_abacus_election().unwrap_err();
        assert!(matches!(res, EMLImportError::InvalidDateFormat));
    }

    #[test]
    fn test_election_validate_invalid_election_missing_nomination_date() {
        let data = include_str!("./tests/eml110a_invalid_election_missing_nomination_date.eml.xml");
        let doc = EML110::from_str(data).unwrap();
        let res = doc.as_abacus_election().unwrap_err();
        assert!(matches!(res, EMLImportError::MissingNominationDate));
    }

    #[test]
    fn test_election_validate_invalid_election_mismatch_preference_threshold() {
        let data =
            include_str!("./tests/eml110a_invalid_election_mismatch_preference_threshold.eml.xml");
        let doc = EML110::from_str(data).unwrap();
        let res = doc.as_abacus_election().unwrap_err();
        assert!(matches!(res, EMLImportError::MismatchPreferenceThreshold));
    }

    #[test]
    fn test_election_validate_invalid_election_mismatch_preference_threshold_small_election() {
        let data = include_str!(
            "./tests/eml110a_invalid_election_mismatch_preference_threshold_small_election.eml.xml"
        );
        let doc = EML110::from_str(data).unwrap();
        let res = doc.as_abacus_election().unwrap_err();
        assert!(matches!(res, EMLImportError::MismatchPreferenceThreshold));
    }

    #[test]
    fn test_election_validate_invalid_election_missing_subcategory() {
        let data = include_str!("./tests/eml110a_invalid_election_missing_subcategory.eml.xml");
        let doc = EML110::from_str(data).unwrap();
        let res = doc.as_abacus_election().unwrap_err();
        assert!(matches!(res, EMLImportError::MissingSubcategory));
    }

    #[test]
    fn test_election_validate_invalid_election_missing_number_of_seats() {
        let data = include_str!("./tests/eml110a_invalid_election_missing_number_of_seats.eml.xml");
        let doc = EML110::from_str(data).unwrap();
        let res = doc.as_abacus_election().unwrap_err();
        assert!(matches!(res, EMLImportError::MissingNumberOfSeats));
    }

    #[test]
    fn test_election_validate_missing_election_domain() {
        let data = include_str!("./tests/eml110a_invalid_election_missing_election_domain.eml.xml");
        let doc = EML110::from_str(data).unwrap();
        let res = doc.as_abacus_election().unwrap_err();
        assert!(matches!(res, EMLImportError::MissingElectionDomain))
    }

    #[test]
    fn test_election_with_invalid_xml() {
        let data = include_str!("./tests/eml110a_invalid_xml.eml.xml");
        let doc = EML110::from_str(data).unwrap_err();
        assert!(matches!(doc, DeError::InvalidXml(_)));
    }

    #[test]
    fn test_cannot_convert_eml110b_to_election() {
        let data = include_str!("./tests/eml110b_test.eml.xml");
        let doc = EML110::from_str(data).unwrap();
        let res = doc.as_abacus_election().unwrap_err();
        assert!(matches!(res, EMLImportError::Needs110a));
    }

    #[test]
    fn test_invalid_election_number_of_seats_not_in_range() {
        let data =
            include_str!("./tests/eml110a_invalid_election_number_of_seats_out_of_range.eml.xml");
        let doc = EML110::from_str(data).unwrap();
        let res = doc.as_abacus_election().unwrap_err();
        assert!(matches!(res, EMLImportError::NumberOfSeatsNotInRange));
    }

    #[test]
    fn test_invalid_election_missing_preference_threshold() {
        let data =
            include_str!("./tests/eml110a_invalid_election_missing_preference_threshold.eml.xml");
        let doc = EML110::from_str(data).unwrap();
        let res = doc.as_abacus_election().unwrap_err();
        assert!(matches!(res, EMLImportError::MissingPreferenceThreshold));
    }

    #[test]
    fn test_invalid_election_date_nomination_format() {
        let data = include_str!("./tests/eml110a_invalid_election_date_nomination_format.eml.xml");
        let doc = EML110::from_str(data).unwrap();
        let res = doc.as_abacus_election().unwrap_err();
        assert!(matches!(res, EMLImportError::InvalidDateFormat));
    }

    #[test]
    fn test_invalid_election_only_municipal_supported() {
        let data =
            include_str!("./tests/eml110a_invalid_election_only_municipal_supported.eml.xml");
        let doc = EML110::from_str(data).unwrap();
        let res = doc.as_abacus_election().unwrap_err();
        assert!(matches!(res, EMLImportError::OnlyMunicipalSupported));
    }

    #[test]
    fn test_invalid_election_voting_method() {
        let data = include_str!("./tests/eml110a_invalid_election_voting_method.eml.xml");
        let doc = EML110::from_str(data).unwrap();
        let res = doc.as_abacus_election().unwrap_err();
        assert!(matches!(res, EMLImportError::InvalidVotingMethod));
    }

    #[test]
    fn test_wrong_polling_station_file() {
        let data = include_str!("./tests/eml110a_test.eml.xml");
        let doc = EML110::from_str(data).unwrap();
        let res = doc.get_polling_stations().unwrap_err();
        assert!(matches!(res, EMLImportError::Needs110b));
    }

    #[test]
    fn test_valid_polling_station_file() {
        let data = include_str!("./tests/eml110b_test.eml.xml");
        let doc = EML110::from_str(data).unwrap();
        let res = doc.get_polling_stations().unwrap();
        assert!(!res.is_empty());
    }

    #[test]
    fn test_empty_polling_station_file() {
        let data = include_str!("./tests/eml110b_empty_polling_station.eml.xml");
        let doc = EML110::from_str(data).unwrap();
        let res = doc.get_polling_stations().unwrap_err();
        assert!(matches!(res, EMLImportError::MissingPollingStations));
    }

    #[test]
    fn test_valid_number_of_voters() {
        let data = include_str!("./tests/eml110b_test.eml.xml");
        let doc = EML110::from_str(data).unwrap();
        let number_of_voters = doc.get_number_of_voters().unwrap();
        assert!(matches!(number_of_voters, 612694));
    }

    #[test]
    fn test_invalid_number_of_voters() {
        let data = include_str!("./tests/eml110b_invalid_number_of_voters.eml.xml");
        let doc = EML110::from_str(data).unwrap();
        let res = doc.get_number_of_voters().unwrap_err();
        assert!(matches!(res, EMLImportError::InvalidNumberOfVoters));
    }

    #[test]
    fn test_polling_station_valid_number_of_voters_parsing() {
        let data = include_str!("./tests/eml110b_less_than_10_stations.eml.xml");
        let doc = EML110::from_str(data).unwrap();
        let polling_stations = doc.get_polling_stations().unwrap();
        assert!(matches!(polling_stations[0].number_of_voters, Some(1273)));
        assert!(polling_stations[1].number_of_voters.is_none());
        assert!(matches!(polling_stations[2].number_of_voters, Some(870)));
        assert!(matches!(polling_stations[3].number_of_voters, Some(867)));
    }

    #[test]
    fn test_polling_station_invalid_number_of_voters() {
        let data = include_str!("./tests/eml110b_invalid_polling_station_number_of_voters.xml");
        let doc = EML110::from_str(data).unwrap();

        // Invalid strings yield a None, not an error
        let polling_stations = doc.get_polling_stations().unwrap();
        assert!(polling_stations[0].number_of_voters.is_none());
        assert!(polling_stations[1].number_of_voters.is_none());
        assert!(polling_stations[2].number_of_voters.is_none());
        assert!(matches!(polling_stations[3].number_of_voters, Some(867)));
    }
}
