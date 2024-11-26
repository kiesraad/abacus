pub use base::*;
use serde::{Deserialize, Serialize};

mod base;
mod util;

/// Vote count data for EML_NL 510
///
/// Use the `EMLDocument` methods to serialize to or deserialize from XML.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct EML510 {
    #[serde(flatten)]
    pub base: EMLBase,
    pub transaction_id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub managing_authority: Option<ManagingAuthority>,
    #[serde(rename(serialize = "kr:CreationDateTime", deserialize = "CreationDateTime"))]
    pub creation_date_time: String,

    pub count: Count,
}

impl base::EMLDocument for EML510 {}

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
    #[serde(default, skip_serializing_if = "Option::is_none", rename = "@Id")]
    pub id: Option<String>,
    #[serde(rename = "$text")]
    pub name: String,
}

/// Address of a managing authority
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct AuthorityAddress {}

/// The count in this EML_NL document, containing a single election event
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct Count {
    event_identifier: EventIdentifier,
    election: Election,
}

/// Identifier for the election event
#[derive(Default, Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct EventIdentifier {
    #[serde(default, skip_serializing_if = "Option::is_none", rename = "@Id")]
    id: Option<String>,
}

impl EventIdentifier {
    pub fn with_id(id: impl Into<String>) -> EventIdentifier {
        EventIdentifier {
            id: Some(id.into()),
        }
    }
}

/// Election in the EML_NL document
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct Election {
    election_identifier: ElectionIdentifier,
    #[serde(with = "contests")]
    contests: Vec<Contest>,
}

util::gen_wrap_list!(mod contests as contest: Contest => Contests);

/// Identifier for a specific election
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct ElectionIdentifier {
    #[serde(rename = "@Id")]
    id: String,
    election_name: String,
    election_category: String,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        rename(
            serialize = "kr:ElectionSubcategory",
            deserialize = "ElectionSubcategory"
        )
    )]
    election_subcategory: Option<String>,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        rename(serialize = "kr:ElectionDomain", deserialize = "ElectionDomain")
    )]
    election_domain: Option<ElectionDomain>,
    #[serde(rename(serialize = "kr:ElectionDate", deserialize = "ElectionDate"))]
    election_date: String,
}

/// Election domain part of election identifier
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct ElectionDomain {
    #[serde(rename = "@Id")]
    id: String,
    #[serde(rename = "$text")]
    name: String,
}

/// Contest contains the voting counts
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct Contest {
    contest_identifier: ContestIdentifier,
    total_votes: TotalVotes,
    reporting_unit_votes: Vec<ReportingUnitVotes>,
}

/// Name and id of the specific contest
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct ContestIdentifier {
    #[serde(rename = "@Id")]
    id: String,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    contest_name: Option<String>,
}

impl ContestIdentifier {
    pub fn new(id: impl Into<String>, contest_name: Option<String>) -> ContestIdentifier {
        ContestIdentifier {
            id: id.into(),
            contest_name,
        }
    }
}

/// The summary votes for a specific contest
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct TotalVotes {
    #[serde(rename = "Selection")]
    selections: Vec<Selection>,
    cast: u64,
    total_counted: u64,
    rejected_votes: Vec<RejectedVotes>,
}

/// The individual votes for a specific reporting unit (i.e. 'stembureau').
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct ReportingUnitVotes {
    reporting_unit_identifier: ReportingUnitIdentifier,
    #[serde(rename = "Selection")]
    selections: Vec<Selection>,
    cast: u64,
    total_counted: u64,
    rejected_votes: Vec<RejectedVotes>,
}

/// Votes rejected with their reasons
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct RejectedVotes {
    #[serde(rename = "@ReasonCode")]
    reason_code: String,
    #[serde(rename = "$text")]
    count: u64,
    #[serde(default, skip_serializing_if = "Option::is_none", rename = "@Reason")]
    reason: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none", rename = "@VoteType")]
    vote_type: Option<String>,
}

impl RejectedVotes {
    pub fn new(reason_code: impl Into<String>, count: u64) -> RejectedVotes {
        RejectedVotes {
            reason_code: reason_code.into(),
            count,
            reason: None,
            vote_type: None,
        }
    }
}

/// Identifier for a reporting unit
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct ReportingUnitIdentifier {
    #[serde(default, skip_serializing_if = "Option::is_none", rename = "@Id")]
    id: Option<String>,
    #[serde(rename = "$text")]
    name: String,
}

/// Number of votes for a specific selection (i.e. a party or a candidate)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct Selection {
    #[serde(rename = "$value")]
    selector: Selector,
    valid_votes: u64,
}

/// Selection criteria for the selection this is a part of
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Selector {
    AffiliationIdentifier(AffiliationIdentifier),
    Candidate(Candidate),
}

/// An affiliation (i.e. party) identification
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct AffiliationIdentifier {
    #[serde(default, skip_serializing_if = "Option::is_none", rename = "@Id")]
    id: Option<String>,
    registered_name: String,
}

/// A candidate
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct Candidate {
    #[serde(rename = "CandidateIdentifier")]
    id: CandidateIdentifier,
}

/// The identifier for a candidate
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct CandidateIdentifier {
    #[serde(rename = "@Id")]
    id: String,
}

impl CandidateIdentifier {
    pub fn new(id: impl Into<String>) -> CandidateIdentifier {
        CandidateIdentifier { id: id.into() }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_eml510() {
        let value = EML510 {
            base: EMLBase::new("510b"),
            creation_date_time: "2021-09-01T12:00:00".into(),
            transaction_id: "1".into(),
            managing_authority: Some(ManagingAuthority {
                authority_identifier: AuthorityIdentifier {
                    id: Some("HSB1".into()),
                    name: "Test Authority".into(),
                },
                authority_address: AuthorityAddress {},
            }),
            count: Count {
                event_identifier: EventIdentifier::default(),
                election: Election {
                    election_identifier: ElectionIdentifier {
                        id: "GR2022".into(),
                        election_name: "Municipal Election".into(),
                        election_category: "GR".into(),
                        election_subcategory: Some("GR1".into()),
                        election_domain: Some(ElectionDomain {
                            id: "1".into(),
                            name: "Gemeente".into(),
                        }),
                        election_date: "2021-09-01".into(),
                    },
                    contests: vec![Contest {
                        contest_identifier: ContestIdentifier::new("geen", None),
                        total_votes: TotalVotes {
                            selections: vec![
                                Selection {
                                    selector: Selector::AffiliationIdentifier(
                                        AffiliationIdentifier {
                                            id: Some("1".into()),
                                            registered_name: "Test Party".into(),
                                        },
                                    ),
                                    valid_votes: 100,
                                },
                                Selection {
                                    selector: Selector::Candidate(Candidate {
                                        id: CandidateIdentifier::new("1"),
                                    }),
                                    valid_votes: 50,
                                },
                                Selection {
                                    selector: Selector::Candidate(Candidate {
                                        id: CandidateIdentifier::new("2"),
                                    }),
                                    valid_votes: 50,
                                },
                            ],
                            cast: 100,
                            total_counted: 100,
                            rejected_votes: vec![
                                RejectedVotes::new("ongeldig", 0),
                                RejectedVotes::new("blanco", 0),
                            ],
                        },
                        reporting_unit_votes: vec![ReportingUnitVotes {
                            reporting_unit_identifier: ReportingUnitIdentifier {
                                id: Some("HSB1::1234".into()),
                                name: "Op rolletjes".into(),
                            },
                            selections: vec![
                                Selection {
                                    selector: Selector::AffiliationIdentifier(
                                        AffiliationIdentifier {
                                            id: Some("1".into()),
                                            registered_name: "Test Party".into(),
                                        },
                                    ),
                                    valid_votes: 100,
                                },
                                Selection {
                                    selector: Selector::Candidate(Candidate {
                                        id: CandidateIdentifier::new("1"),
                                    }),
                                    valid_votes: 50,
                                },
                                Selection {
                                    selector: Selector::Candidate(Candidate {
                                        id: CandidateIdentifier::new("2"),
                                    }),
                                    valid_votes: 50,
                                },
                            ],
                            cast: 100,
                            total_counted: 100,
                            rejected_votes: vec![
                                RejectedVotes::new("ongeldig", 0),
                                RejectedVotes::new("blanco", 0),
                            ],
                        }],
                    }],
                },
            },
        };

        let res = value.to_xml_string().unwrap();
        println!("{res}");
    }

    #[test]
    fn test_deserialize_eml510() {
        let data = include_str!("./tests/deserialize_eml510b_test.eml.xml");
        let doc = EML510::from_str(data).unwrap();
        assert_eq!(doc.count.election.contests.len(), 1);
        let contest = &doc.count.election.contests[0];
        assert_eq!(contest.total_votes.cast, 100);
    }
}
