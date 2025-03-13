use chrono::Datelike;
use serde::{Deserialize, Serialize};

use crate::{
    data_entry::{PoliticalGroupVotes, PollingStationResults},
    polling_station::PollingStation,
    summary::ElectionSummary,
};

use super::{
    EMLBase,
    common::{
        AuthorityAddress, AuthorityIdentifier, ElectionCategory, ElectionIdentifier,
        ElectionSubcategory, ManagingAuthority,
    },
};

/// Vote count data for EML_NL 510
///
/// Use the `EMLDocument` methods to serialize to or deserialize from XML.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct EML510 {
    #[serde(flatten)]
    pub base: EMLBase,
    pub transaction_id: String,
    pub managing_authority: ManagingAuthority,
    #[serde(rename(serialize = "kr:CreationDateTime", deserialize = "CreationDateTime"))]
    pub creation_date_time: String,
    pub count: Count,
}

impl EML510 {
    pub fn from_results(
        election: &crate::election::Election,
        results: &[(PollingStation, PollingStationResults)],
        summary: &ElectionSummary,
        creation_date_time: &chrono::DateTime<chrono::Local>,
    ) -> EML510 {
        let authority_id = "0000".to_string(); // TODO: replace with actual authority id from election definition (i.e. data from election tree)
        let total_votes = TotalVotes::from_summary(election, summary);
        let reporting_unit_votes = results
            .iter()
            .map(|(ps, results)| {
                ReportingUnitVotes::from_polling_station(election, &authority_id, ps, results)
            })
            .collect();
        let contest = Contest {
            contest_identifier: ContestIdentifier::new(
                election.id.to_string(),     // TODO: set contest id from election definition
                Some(election.name.clone()), // TODO: set contest name in contest id from election definition (optional value)
            ),
            total_votes,
            reporting_unit_votes,
        };
        let election_eml = Election {
            election_identifier: ElectionIdentifier {
                id: format!(
                    "{}{}",
                    election.category.to_eml_code(),
                    election.election_date.year()
                ), // TODO: set election id from election definition instead of this generated id
                election_name: election.name.clone(),
                election_category: ElectionCategory::from(election.category),
                election_subcategory: election_subcategory(election),
                election_domain: None, // TODO: set election domain from election definition
                election_date: election.election_date.format("%Y-%m-%d").to_string(),
                nomination_date: None,
            },
            contests: vec![contest],
        };
        let count = Count {
            event_identifier: EventIdentifier::default(), // TODO: set election event identifier from election definition (optional value)
            election: election_eml,
        };
        EML510 {
            base: EMLBase::new("510b"),
            transaction_id: "1".into(), // TODO: set transaction id from election definition
            managing_authority: ManagingAuthority {
                authority_identifier: AuthorityIdentifier {
                    id: authority_id,
                    name: election.location.clone(), // TODO: replace with authority name from election definition (i.e. data from election tree)
                    created_by_authority: None,
                },
                authority_address: AuthorityAddress {},
            },
            creation_date_time: creation_date_time
                .to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
            count,
        }
    }
}

impl super::base::EMLDocument for EML510 {}

fn election_subcategory(election: &crate::election::Election) -> Option<ElectionSubcategory> {
    match (&election.category, election.number_of_seats) {
        (crate::election::ElectionCategory::Municipal, ..19) => Some(ElectionSubcategory::GR1),
        (crate::election::ElectionCategory::Municipal, 19..) => Some(ElectionSubcategory::GR2),
    }
}

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
pub struct EventIdentifier {}

/// Election in the EML_NL document
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct Election {
    election_identifier: ElectionIdentifier,
    #[serde(with = "contests")]
    contests: Vec<Contest>,
}

super::util::gen_wrap_list!(contests, Contest, "Contest");

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
    #[serde(default)]
    uncounted_votes: Vec<UncountedVotes>,
}

impl TotalVotes {
    pub fn from_summary(
        election: &crate::election::Election,
        summary: &ElectionSummary,
    ) -> TotalVotes {
        TotalVotes {
            selections: Selection::from_political_group_votes(
                election,
                &summary.political_group_votes,
            ),
            cast: summary.votes_counts.total_votes_cast_count as u64,
            total_counted: summary.votes_counts.votes_candidates_count as u64,
            rejected_votes: vec![
                RejectedVotes::new(
                    RejectedVotesReason::Blank,
                    summary.votes_counts.blank_votes_count as u64,
                ),
                RejectedVotes::new(
                    RejectedVotesReason::Invalid,
                    summary.votes_counts.invalid_votes_count as u64,
                ),
            ],
            uncounted_votes: vec![
                UncountedVotes::new(
                    UncountedVotesReason::PollCard,
                    summary.voters_counts.poll_card_count as u64,
                ),
                UncountedVotes::new(
                    UncountedVotesReason::ProxyCertificate,
                    summary.voters_counts.proxy_certificate_count as u64,
                ),
                UncountedVotes::new(
                    UncountedVotesReason::VoterCard,
                    summary.voters_counts.voter_card_count as u64,
                ),
                UncountedVotes::new(
                    UncountedVotesReason::TotalAdmittedVoters,
                    summary.voters_counts.total_admitted_voters_count as u64,
                ),
                UncountedVotes::new(
                    UncountedVotesReason::MoreBallots,
                    summary.differences_counts.more_ballots_count.count as u64,
                ),
                UncountedVotes::new(
                    UncountedVotesReason::FewerBallots,
                    summary.differences_counts.fewer_ballots_count.count as u64,
                ),
                UncountedVotes::new(
                    UncountedVotesReason::UnreturnedBallots,
                    summary.differences_counts.unreturned_ballots_count.count as u64,
                ),
                UncountedVotes::new(
                    UncountedVotesReason::TooFewBallotsHandedOut,
                    summary
                        .differences_counts
                        .too_few_ballots_handed_out_count
                        .count as u64,
                ),
                UncountedVotes::new(
                    UncountedVotesReason::TooManyBallotsHandedOut,
                    summary
                        .differences_counts
                        .too_many_ballots_handed_out_count
                        .count as u64,
                ),
                UncountedVotes::new(
                    UncountedVotesReason::OtherExplanation,
                    summary.differences_counts.other_explanation_count.count as u64,
                ),
                UncountedVotes::new(
                    UncountedVotesReason::NoExplanation,
                    summary.differences_counts.no_explanation_count.count as u64,
                ),
            ],
        }
    }
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
    #[serde(default)]
    uncounted_votes: Vec<UncountedVotes>,
}

impl ReportingUnitVotes {
    pub fn from_polling_station(
        election: &crate::election::Election,
        authority_id: &str,
        polling_station: &PollingStation,
        results: &PollingStationResults,
    ) -> ReportingUnitVotes {
        ReportingUnitVotes {
            reporting_unit_identifier: ReportingUnitIdentifier {
                id: format!("{authority_id}::SB{}", polling_station.number),
                name: format!(
                    "{} (postcode: {})",
                    polling_station.name, polling_station.postal_code
                ),
            },
            selections: Selection::from_political_group_votes(
                election,
                &results.political_group_votes,
            ),
            cast: results.votes_counts.total_votes_cast_count as u64,
            total_counted: results.votes_counts.votes_candidates_count as u64,
            rejected_votes: vec![
                RejectedVotes::new(
                    RejectedVotesReason::Blank,
                    results.votes_counts.blank_votes_count as u64,
                ),
                RejectedVotes::new(
                    RejectedVotesReason::Invalid,
                    results.votes_counts.invalid_votes_count as u64,
                ),
            ],
            uncounted_votes: vec![
                UncountedVotes::new(
                    UncountedVotesReason::PollCard,
                    results.latest_voters_counts().poll_card_count as u64,
                ),
                UncountedVotes::new(
                    UncountedVotesReason::ProxyCertificate,
                    results.latest_voters_counts().proxy_certificate_count as u64,
                ),
                UncountedVotes::new(
                    UncountedVotesReason::VoterCard,
                    results.latest_voters_counts().voter_card_count as u64,
                ),
                UncountedVotes::new(
                    UncountedVotesReason::TotalAdmittedVoters,
                    results.latest_voters_counts().total_admitted_voters_count as u64,
                ),
                UncountedVotes::new(
                    UncountedVotesReason::MoreBallots,
                    results.differences_counts.more_ballots_count as u64,
                ),
                UncountedVotes::new(
                    UncountedVotesReason::FewerBallots,
                    results.differences_counts.fewer_ballots_count as u64,
                ),
                UncountedVotes::new(
                    UncountedVotesReason::UnreturnedBallots,
                    results.differences_counts.unreturned_ballots_count as u64,
                ),
                UncountedVotes::new(
                    UncountedVotesReason::TooFewBallotsHandedOut,
                    results.differences_counts.too_few_ballots_handed_out_count as u64,
                ),
                UncountedVotes::new(
                    UncountedVotesReason::TooManyBallotsHandedOut,
                    results.differences_counts.too_many_ballots_handed_out_count as u64,
                ),
                UncountedVotes::new(
                    UncountedVotesReason::OtherExplanation,
                    results.differences_counts.other_explanation_count as u64,
                ),
                UncountedVotes::new(
                    UncountedVotesReason::NoExplanation,
                    results.differences_counts.no_explanation_count as u64,
                ),
            ],
        }
    }
}

/// Votes rejected with their reasons
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct RejectedVotes {
    #[serde(rename = "@ReasonCode")]
    reason_code: RejectedVotesReason,
    #[serde(rename = "$text")]
    count: u64,
    #[serde(default, skip_serializing_if = "Option::is_none", rename = "@Reason")]
    reason: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none", rename = "@VoteType")]
    vote_type: Option<String>,
}

impl RejectedVotes {
    pub fn new(reason_code: RejectedVotesReason, count: u64) -> RejectedVotes {
        RejectedVotes {
            reason_code,
            count,
            reason: None,
            vote_type: None,
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum RejectedVotesReason {
    #[serde(rename = "blanco")]
    Blank,
    #[serde(rename = "ongeldig")]
    Invalid,
}

/// Votes (and non-vote) numbers that were uncounted
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct UncountedVotes {
    #[serde(rename = "@ReasonCode")]
    reason_code: UncountedVotesReason,
    #[serde(rename = "$text")]
    count: u64,
    #[serde(default, skip_serializing_if = "Option::is_none", rename = "@Reason")]
    reason: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none", rename = "@VoteType")]
    vote_type: Option<String>,
}

impl UncountedVotes {
    pub fn new(reason_code: UncountedVotesReason, count: u64) -> UncountedVotes {
        UncountedVotes {
            reason_code,
            count,
            reason: None,
            vote_type: None,
        }
    }
}

/// Reason code for a specific uncounted votes entry
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum UncountedVotesReason {
    #[serde(rename = "geldige stempassen")]
    PollCard,
    #[serde(rename = "geldige volmachtbewijzen")]
    ProxyCertificate,
    #[serde(rename = "geldige kiezerspassen")]
    VoterCard,
    #[serde(rename = "toegelaten kiezers")]
    TotalAdmittedVoters,
    #[serde(rename = "meer getelde stembiljetten")]
    MoreBallots,
    #[serde(rename = "minder getelde stembiljetten")]
    FewerBallots,
    #[serde(rename = "meegenomen stembiljetten")]
    UnreturnedBallots,
    #[serde(rename = "te weinig uitgereikte stembiljetten")]
    TooFewBallotsHandedOut,
    #[serde(rename = "te veel uitgereikte stembiljetten")]
    TooManyBallotsHandedOut,
    #[serde(rename = "andere verklaring")]
    OtherExplanation,
    #[serde(rename = "geen verklaring")]
    NoExplanation,
}

/// Identifier for a reporting unit
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct ReportingUnitIdentifier {
    #[serde(rename = "@Id")]
    id: String,
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

impl Selection {
    pub fn from_political_group_votes(
        election: &crate::election::Election,
        votes: &[PoliticalGroupVotes],
    ) -> Vec<Selection> {
        let mut selections = vec![];
        for pg in votes {
            let epg = election
                .political_groups
                .as_ref()
                .and_then(|pgs| pgs.iter().find(|p| p.number == pg.number));

            selections.push(Selection {
                selector: Selector::AffiliationIdentifier(AffiliationIdentifier {
                    id: Some(pg.number.to_string()),
                    registered_name: epg.map(|epg| epg.name.clone()).unwrap_or_default(),
                }),
                valid_votes: pg.total as u64,
            });

            for candidate in &pg.candidate_votes {
                selections.push(Selection {
                    selector: Selector::Candidate(Candidate {
                        id: CandidateIdentifier::new(candidate.number.to_string()),
                    }),
                    valid_votes: candidate.votes as u64,
                })
            }
        }

        selections
    }
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
    use crate::eml::{EMLDocument, common::ElectionDomain};

    use super::*;
    use test_log::test;

    #[test]
    fn test_eml510() {
        let value = EML510 {
            base: EMLBase::new("510b"),
            creation_date_time: "2021-09-01T12:00:00".into(),
            transaction_id: "1".into(),
            managing_authority: ManagingAuthority {
                authority_identifier: AuthorityIdentifier {
                    id: "HSB1".into(),
                    name: "Test Authority".into(),
                    created_by_authority: None,
                },
                authority_address: AuthorityAddress {},
            },
            count: Count {
                event_identifier: EventIdentifier::default(),
                election: Election {
                    election_identifier: ElectionIdentifier {
                        id: "GR2022".into(),
                        election_name: "Municipal Election".into(),
                        election_category: ElectionCategory::GR,
                        election_subcategory: Some(ElectionSubcategory::GR1),
                        election_domain: Some(ElectionDomain {
                            id: "1".into(),
                            name: "Gemeente".into(),
                        }),
                        election_date: "2021-09-01".into(),
                        nomination_date: None,
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
                                RejectedVotes::new(RejectedVotesReason::Invalid, 0),
                                RejectedVotes::new(RejectedVotesReason::Blank, 0),
                            ],
                            uncounted_votes: vec![],
                        },
                        reporting_unit_votes: vec![ReportingUnitVotes {
                            reporting_unit_identifier: ReportingUnitIdentifier {
                                id: "HSB1::1234".into(),
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
                                RejectedVotes::new(RejectedVotesReason::Invalid, 0),
                                RejectedVotes::new(RejectedVotesReason::Blank, 0),
                            ],
                            uncounted_votes: vec![],
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
