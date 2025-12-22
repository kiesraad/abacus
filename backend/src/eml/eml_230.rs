use chrono::NaiveDate;
use serde::{Deserialize, Serialize};

use super::{
    EMLBase, EMLDocument,
    common::{
        Candidate, ContestIdentifier, EMLImportError, ElectionCategory, ElectionDomain,
        ElectionIdentifier, ManagingAuthority,
    },
};

use crate::{
    election::{
        CandidateGender, CandidateNumber, ElectionWithPoliticalGroups, NewElection, PGNumber,
        PoliticalGroup,
    },
    eml::common::{
        AuthorityAddress, AuthorityIdentifier, CandidateFullName, Country, Gender, Locality,
        NameLine, PersonName, QualifyingAddress, QualifyingAddressData,
    },
};

/// Candidate list (230b)
///
/// Use the `EMLDocument` methods to serialize to or deserialize from XML.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct EML230 {
    #[serde(flatten)]
    pub base: EMLBase,
    pub transaction_id: String,
    #[serde(rename(serialize = "kr:CreationDateTime", deserialize = "CreationDateTime"))]
    pub creation_date_time: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub issue_date: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub managing_authority: Option<ManagingAuthority>,
    pub candidate_list: CandidateList,
}

impl EMLDocument for EML230 {}

impl EML230 {
    fn election(&self) -> &Election {
        &self.candidate_list.election
    }

    fn contest(&self) -> &Contest {
        &self.election().contest
    }

    fn election_identifier(&self) -> &ElectionIdentifier {
        &self.election().election_identifier
    }

    fn election_domain(&self) -> Option<&ElectionDomain> {
        self.election_identifier().election_domain.as_ref()
    }

    #[allow(clippy::too_many_lines)]
    pub fn add_candidate_lists(
        &self,
        mut election: NewElection,
    ) -> std::result::Result<NewElection, EMLImportError> {
        // we need to be importing from a 230b file
        if self.base.id != "230b" {
            return Err(EMLImportError::Needs230b);
        }

        // we need a managing authority
        if self.managing_authority.is_none() {
            return Err(EMLImportError::MissingManagingAuthority);
        }

        // we currently only support GR elections
        let ElectionCategory::GR = self.election_identifier().election_category else {
            return Err(EMLImportError::OnlyMunicipalSupported);
        };

        // make sure candidate list election matches election definition
        if election.election_id != self.election().election_identifier.id {
            return Err(EMLImportError::MismatchElection);
        }

        // we need the election domain
        let Some(election_domain) = self.election_domain() else {
            return Err(EMLImportError::MissingElectionDomain);
        };

        // make sure election domain id matches
        if election.domain_id != election_domain.id {
            return Err(EMLImportError::MismatchElectionDomain);
        }

        // parse the election date
        let Ok(election_date) =
            NaiveDate::parse_from_str(&self.election_identifier().election_date, "%Y-%m-%d")
        else {
            return Err(EMLImportError::InvalidDateFormat);
        };

        // make sure election date matches
        if election.election_date != election_date {
            return Err(EMLImportError::MismatchElectionDate);
        }

        // extract initial listing of political groups with candidates
        let mut previous_pg_number = PGNumber::from(0);
        election.political_groups = self
            .contest()
            .affiliations
            .iter()
            .map(|aff| {
                let pg_number = aff
                    .affiliation_identifier
                    .id
                    .parse::<u32>()
                    .map(PGNumber::from)
                    .or(Err(EMLImportError::TooManyPoliticalGroups))?;
                if pg_number <= previous_pg_number {
                    return Err(EMLImportError::PoliticalGroupNumbersNotIncreasing {
                        expected_larger_than: previous_pg_number,
                        found: pg_number,
                    });
                }

                let mut previous_can_number = CandidateNumber::from(0);
                let political_group = PoliticalGroup {
                    number: pg_number,
                    name: aff.affiliation_identifier.registered_name.clone(),
                    candidates:
                        aff.candidates
                            .iter()
                            .map(|can| {
                                let candidate =
                                    crate::election::structs::Candidate::try_from(
                                        can.clone(),
                                    )?;

                                if candidate.number <= previous_can_number {
                                    return Err(
                                        EMLImportError::CandidateNumbersNotIncreasing {
                                            political_group_number: pg_number,
                                            expected_larger_than: previous_can_number,
                                            found: candidate.number,
                                        },
                                    );
                                }

                                previous_can_number = candidate.number;
                                Ok(candidate)
                            })
                            .collect::<Result<
                                Vec<crate::election::structs::Candidate>,
                                EMLImportError,
                            >>()?,
                };

                previous_pg_number = pg_number;
                Ok(political_group)
            })
            .collect::<Result<Vec<PoliticalGroup>, EMLImportError>>()?;

        Ok(election)
    }

    #[allow(clippy::too_many_lines)]
    pub fn candidates_from_abacus_election(
        election: &ElectionWithPoliticalGroups,
        transaction_id: &str,
    ) -> EML230 {
        let now = chrono::Utc::now();

        EML230 {
            base: EMLBase::new("230b"),
            transaction_id: transaction_id.to_owned(),
            creation_date_time: now.to_rfc3339_opts(chrono::SecondsFormat::Secs, true),
            issue_date: Some(now.format("%Y-%m-%d").to_string()),
            managing_authority: Some(ManagingAuthority {
                authority_identifier: AuthorityIdentifier {
                    id: election.domain_id.clone(),
                    name: election.location.clone(),
                    created_by_authority: None,
                },
                authority_address: AuthorityAddress {},
            }),
            candidate_list: CandidateList {
                election: Election {
                    election_identifier: ElectionIdentifier::from_election(election, true),
                    contest: Contest {
                        contest_identifier: ContestIdentifier::geen(),
                        affiliations: election
                            .political_groups
                            .iter()
                            .map(|pg| Affiliation {
                                affiliation_identifier: AffiliationIdentifier {
                                    id: pg.number.to_string(),
                                    registered_name: pg.name.clone(),
                                },
                                affiliation_type: AffiliationType::StandAloneList,
                                list_data: ListData {
                                    publication_language: "nl".to_string(),
                                    publish_gender: true,
                                },
                                candidates: pg
                                    .candidates
                                    .iter()
                                    .map(|candidate| Candidate {
                                        candidate_identifier: super::common::CandidateIdentifier {
                                            id: candidate.number.to_string(),
                                        },
                                        candidate_full_name: CandidateFullName {
                                            person_name: PersonName {
                                                name_line: Some(NameLine {
                                                    name_type: "Initials".to_string(),
                                                    value: candidate.initials.clone(),
                                                }),
                                                first_name: candidate.first_name.clone(),
                                                name_prefix: candidate.last_name_prefix.clone(),
                                                last_name: candidate.last_name.clone(),
                                            },
                                        },
                                        gender: candidate.gender.as_ref().map(
                                            |gender| match gender {
                                                CandidateGender::Male => Gender::Male,
                                                CandidateGender::Female => Gender::Female,
                                                CandidateGender::X => Gender::Unknown,
                                            },
                                        ),
                                        qualifying_address: if candidate.locality.trim().is_empty()
                                        {
                                            None
                                        } else {
                                            Some(QualifyingAddress {
                                                data: if let Some(country) = &candidate.country_code
                                                {
                                                    QualifyingAddressData::Country(Country {
                                                        country_name_code: country.clone(),
                                                        locality: Locality {
                                                            locality_name: candidate
                                                                .locality
                                                                .clone(),
                                                        },
                                                    })
                                                } else {
                                                    QualifyingAddressData::Locality(Locality {
                                                        locality_name: candidate.locality.clone(),
                                                    })
                                                },
                                            })
                                        },
                                    })
                                    .collect(),
                            })
                            .collect(),
                    },
                },
            },
        }
    }
}

impl EML230 {
    #[cfg(test)]
    pub fn affiliations(&self) -> &[Affiliation] {
        &self.candidate_list.election.contest.affiliations
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct CandidateList {
    election: Election,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct Election {
    election_identifier: ElectionIdentifier,
    contest: Contest,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct Contest {
    contest_identifier: ContestIdentifier,
    #[serde(rename = "Affiliation")]
    affiliations: Vec<Affiliation>,
}

/// Political group and their candidates
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct Affiliation {
    affiliation_identifier: AffiliationIdentifier,
    #[serde(rename = "Type")]
    affiliation_type: AffiliationType,
    #[serde(rename(serialize = "kr:ListData", deserialize = "ListData"))]
    list_data: ListData,
    #[serde(rename = "Candidate")]
    candidates: Vec<Candidate>,
}

/// Identifier for the political group
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct AffiliationIdentifier {
    #[serde(rename = "@Id")]
    id: String,
    registered_name: String,
}

/// Type of the political group
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AffiliationType {
    #[serde(rename = "lijstengroep")]
    GroupOfLists,
    #[serde(rename = "stel gelijkluidende lijsten")]
    SetOfEqualLists,
    #[serde(rename = "op zichzelf staande lijst")]
    StandAloneList,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct ListData {
    #[serde(rename = "@PublicationLanguage")]
    publication_language: String,
    #[serde(rename = "@PublishGender")]
    publish_gender: bool,
}

#[cfg(test)]
mod tests {
    use crate::{
        election::{CandidateNumber, PGNumber},
        eml::{EML110, EML230, EMLDocument, EMLImportError},
    };
    use quick_xml::DeError;

    #[test]
    fn test_deserialize_eml230b() {
        let data = include_str!("./tests/eml230b_test.eml.xml");
        let doc = EML230::from_str(data).unwrap();
        assert_eq!(doc.creation_date_time, "2022-02-04T11:16:26.827");
        let affiliations = doc.affiliations();
        assert_eq!(affiliations.len(), 3);
        let first_pg = affiliations.first().unwrap();
        assert_eq!(first_pg.candidates.len(), 12);
        let candidate = first_pg.candidates.first().unwrap();
        assert_eq!(
            candidate
                .qualifying_address
                .as_ref()
                .unwrap()
                .locality_name(),
            "Heemdamseburg"
        );
        assert_eq!(
            candidate
                .qualifying_address
                .as_ref()
                .unwrap()
                .country_name_code(),
            Some("NL")
        );

        let second_candidate = first_pg.candidates.get(1).unwrap();
        assert_eq!(
            second_candidate
                .qualifying_address
                .as_ref()
                .unwrap()
                .locality_name(),
            "Heemdamseburgsebuurt"
        );
        assert_eq!(
            second_candidate
                .qualifying_address
                .as_ref()
                .unwrap()
                .country_name_code(),
            None
        );

        let candidate = affiliations.get(1).unwrap().candidates.get(3).unwrap();
        assert_eq!(
            candidate.candidate_full_name.person_name.first_name,
            Some("Frédérique".into())
        );
    }

    #[test]
    fn test_import_without_candidate_addresses() {
        let data = include_str!("./tests/eml230b_test_without_addresses.eml.xml");
        let doc = EML230::from_str(data).unwrap();
        let affiliations = doc.affiliations();
        assert_eq!(affiliations.len(), 3);
        let first_pg = affiliations.first().unwrap();
        assert_eq!(first_pg.candidates.len(), 12);
        let candidate = first_pg.candidates.first().unwrap();
        assert!(candidate.qualifying_address.is_none());
    }

    #[test]
    fn test_add_candidates_for_correct_election() {
        let data = include_str!("./tests/eml110a_test.eml.xml");
        let doc = EML110::from_str(data).unwrap();
        let new_election = doc.as_abacus_election().unwrap();

        let candidate_data = include_str!("./tests/eml230b_test.eml.xml");
        let candidates = EML230::from_str(candidate_data).unwrap();
        candidates.add_candidate_lists(new_election).unwrap();
    }

    #[test]
    fn test_add_candidates_for_correct_election_with_gaps() {
        let data = include_str!("./tests/eml110a_test.eml.xml");
        let doc = EML110::from_str(data).unwrap();
        let new_election = doc.as_abacus_election().unwrap();

        let candidate_data = include_str!("./tests/eml230b_test_with_gaps.eml.xml");
        let candidates = EML230::from_str(candidate_data).unwrap();
        candidates.add_candidate_lists(new_election).unwrap();
    }

    #[test]
    fn test_add_candidates_for_affiliation_id_not_increasing() {
        let data = include_str!("./tests/eml110a_test.eml.xml");
        let doc = EML110::from_str(data).unwrap();
        let new_election = doc.as_abacus_election().unwrap();

        let candidate_data =
            include_str!("./tests/eml230b_invalid_affiliation_id_not_increasing.eml.xml");
        let candidates = EML230::from_str(candidate_data).unwrap();
        let res = candidates.add_candidate_lists(new_election).unwrap_err();

        let expected = EMLImportError::PoliticalGroupNumbersNotIncreasing {
            expected_larger_than: PGNumber::from(2),
            found: PGNumber::from(1),
        };
        assert_eq!(res, expected);
    }

    #[test]
    fn test_add_candidates_for_candidate_id_not_increasing() {
        let data = include_str!("./tests/eml110a_test.eml.xml");
        let doc = EML110::from_str(data).unwrap();
        let new_election = doc.as_abacus_election().unwrap();

        let candidate_data =
            include_str!("./tests/eml230b_invalid_candidate_id_not_increasing.eml.xml");
        let candidates = EML230::from_str(candidate_data).unwrap();
        let res = candidates.add_candidate_lists(new_election).unwrap_err();

        let expected = EMLImportError::CandidateNumbersNotIncreasing {
            political_group_number: PGNumber::from(1),
            expected_larger_than: CandidateNumber::from(1),
            found: CandidateNumber::from(1),
        };
        assert_eq!(res, expected);
    }

    #[test]
    fn test_add_candidates_for_wrong_document_type() {
        let data = include_str!("./tests/eml110a_test.eml.xml");
        let doc = EML110::from_str(data).unwrap();
        let new_election = doc.as_abacus_election().unwrap();

        let candidate_data = include_str!("./tests/eml230b_invalid_document_type.eml.xml");
        let candidates = EML230::from_str(candidate_data).unwrap();
        let res = candidates.add_candidate_lists(new_election).unwrap_err();

        assert!(matches!(res, EMLImportError::Needs230b));
    }

    #[test]
    fn test_add_candidates_for_incorrect_election() {
        let data = include_str!("./tests/eml110a_test.eml.xml");
        let doc = EML110::from_str(data).unwrap();
        let new_election = doc.as_abacus_election().unwrap();

        let candidate_data = include_str!("./tests/eml230b_invalid_incorrect_election.eml.xml");
        let candidates = EML230::from_str(candidate_data).unwrap();
        let res = candidates.add_candidate_lists(new_election).unwrap_err();

        assert!(matches!(res, EMLImportError::MismatchElection));
    }

    #[test]
    fn test_add_candidates_with_missing_authority() {
        let data = include_str!("./tests/eml110a_test.eml.xml");
        let doc = EML110::from_str(data).unwrap();
        let new_election = doc.as_abacus_election().unwrap();

        let candidate_data = include_str!("./tests/eml230b_invalid_missing_authority.eml.xml");
        let candidates = EML230::from_str(candidate_data).unwrap();
        let res = candidates.add_candidate_lists(new_election).unwrap_err();

        assert!(matches!(res, EMLImportError::MissingManagingAuthority));
    }

    #[test]
    fn test_add_candidates_with_wrong_election_type() {
        let data = include_str!("./tests/eml110a_test.eml.xml");
        let doc = EML110::from_str(data).unwrap();
        let new_election = doc.as_abacus_election().unwrap();

        let candidate_data = include_str!("./tests/eml230b_invalid_missing_authority.eml.xml");
        let candidates = EML230::from_str(candidate_data).unwrap();
        let res = candidates.add_candidate_lists(new_election).unwrap_err();

        assert!(matches!(res, EMLImportError::MissingManagingAuthority));
    }

    #[test]
    fn test_add_candidates_with_missing_election_domain() {
        let data = include_str!("./tests/eml110a_test.eml.xml");
        let doc = EML110::from_str(data).unwrap();
        let new_election = doc.as_abacus_election().unwrap();

        let candidate_data =
            include_str!("./tests/eml230b_invalid_missing_election_domain.eml.xml");
        let candidates = EML230::from_str(candidate_data).unwrap();
        let res = candidates.add_candidate_lists(new_election).unwrap_err();

        assert!(matches!(res, EMLImportError::MissingElectionDomain));
    }

    #[test]
    fn test_add_candidates_with_incorrect_election_domain() {
        let data = include_str!("./tests/eml110a_test.eml.xml");
        let doc = EML110::from_str(data).unwrap();
        let new_election = doc.as_abacus_election().unwrap();

        let candidate_data =
            include_str!("./tests/eml230b_invalid_incorrect_election_domain.eml.xml");
        let candidates = EML230::from_str(candidate_data).unwrap();
        let res = candidates.add_candidate_lists(new_election).unwrap_err();

        assert!(matches!(res, EMLImportError::MismatchElectionDomain));
    }

    #[test]
    fn test_add_candidates_with_incorrect_election_date() {
        let data = include_str!("./tests/eml110a_test.eml.xml");
        let doc = EML110::from_str(data).unwrap();
        let new_election = doc.as_abacus_election().unwrap();

        let candidate_data =
            include_str!("./tests/eml230b_invalid_incorrect_election_date.eml.xml");
        let candidates = EML230::from_str(candidate_data).unwrap();
        let res = candidates.add_candidate_lists(new_election).unwrap_err();

        assert!(matches!(res, EMLImportError::MismatchElectionDate));
    }

    #[test]
    fn test_add_candidates_with_empty_affiliated() {
        let candidate_data = include_str!("./tests/eml230b_invalid_empty_affiliates.eml.xml");

        // This error is caught by the parser
        let doc = EML230::from_str(candidate_data).unwrap_err();

        assert!(matches!(doc, DeError::Custom(_)));
    }

    #[test]
    fn test_add_candidates_with_empty_candidates() {
        let candidate_data = include_str!("./tests/eml230b_invalid_empty_candidates.eml.xml");

        // This error is caught by the parser
        let doc = EML230::from_str(candidate_data).unwrap_err();

        assert!(matches!(doc, DeError::Custom(_)));
    }
}
