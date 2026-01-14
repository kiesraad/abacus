use serde::{Deserialize, Serialize};

use super::{
    EMLBase,
    common::{
        AffiliationIdentifier, AuthorityAddress, AuthorityIdentifier, ContestIdentifier,
        ElectionCategory, ElectionDomain, ElectionIdentifier, ElectionSubcategory,
        ManagingAuthority,
    },
};
use crate::domain::{
    committee_session::CommitteeSession,
    election::{ElectionCategory::Municipal, ElectionWithPoliticalGroups},
    polling_station::PollingStation,
    polling_station_results::{
        PollingStationResults, political_group_candidate_votes::PoliticalGroupCandidateVotes,
    },
    summary::ElectionSummary,
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
        election: &ElectionWithPoliticalGroups,
        committee_session: &CommitteeSession,
        results: &[(PollingStation, PollingStationResults)],
        summary: &ElectionSummary,
        creation_date_time: &chrono::DateTime<chrono::Local>,
    ) -> EML510 {
        let authority_id = election.domain_id.clone(); // TODO (post 1.0): replace with election tree when that is available
        let total_votes = TotalVotes::from_summary(election, summary);
        let reporting_unit_votes = results
            .iter()
            .map(|(ps, results)| {
                ReportingUnitVotes::from_polling_station(
                    election,
                    committee_session,
                    &authority_id,
                    ps,
                    results,
                )
            })
            .collect();
        let contest = Contest {
            contest_identifier: ContestIdentifier::new("geen".to_string(), None),
            total_votes,
            reporting_unit_votes,
        };
        let election_eml = Election {
            election_identifier: ElectionIdentifier {
                id: election.election_id.clone(),
                election_name: election.name.clone(),
                election_category: ElectionCategory::from(election.category),
                election_subcategory: election_subcategory(election),
                election_domain: Some(ElectionDomain {
                    id: election.domain_id.clone(),
                    name: election.location.clone(),
                }),
                election_date: election.election_date.format("%Y-%m-%d").to_string(),
                nomination_date: None,
            },
            contests: vec![contest],
        };
        let count = Count {
            event_identifier: EventIdentifier::default(),
            election: election_eml,
        };
        EML510 {
            base: EMLBase::new("510b"),
            transaction_id: "1".into(),
            managing_authority: ManagingAuthority {
                authority_identifier: AuthorityIdentifier {
                    id: authority_id,
                    name: election.location.clone(), // TODO (post 1.0): replace with authority name from election tree
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

fn election_subcategory(election: &ElectionWithPoliticalGroups) -> Option<ElectionSubcategory> {
    match (&election.category, election.number_of_seats) {
        (Municipal, ..19) => Some(ElectionSubcategory::GR1),
        (Municipal, 19..) => Some(ElectionSubcategory::GR2),
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
        election: &ElectionWithPoliticalGroups,
        summary: &ElectionSummary,
    ) -> TotalVotes {
        TotalVotes {
            selections: Selection::from_political_group_votes(
                election,
                &summary.political_group_votes,
            ),
            cast: election.number_of_voters as u64,
            total_counted: summary.votes_counts.total_votes_candidates_count as u64,
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
            ],
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub enum InvestigationReason {
    #[serde(rename = "toegelaten kiezers opnieuw vastgesteld")]
    AdmittedVotersRecounted,
    #[serde(rename = "onderzocht vanwege andere reden")]
    InvestigatedOtherReason,
    #[serde(rename = "stembiljetten deels herteld")]
    BallotsRecounted,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
#[serde(rename(serialize = "kr:Investigation", deserialize = "Investigation"))]
pub struct Investigation {
    #[serde(rename = "@ReasonCode")]
    reason_code: InvestigationReason,
    #[serde(rename = "$text")]
    value: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct ReportingUnitInvestigations {
    #[serde(rename(serialize = "kr:Investigation", deserialize = "Investigation"))]
    investigations: Vec<Investigation>,
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
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        rename(
            serialize = "kr:ReportingUnitInvestigations",
            deserialize = "ReportingUnitInvestigations"
        )
    )]
    reporting_unit_investigations: Option<ReportingUnitInvestigations>,
}

/// When results were investigated by the GSB
/// return the relevant investigations.
fn create_investigations_from_results(
    result: &PollingStationResults,
) -> ReportingUnitInvestigations {
    let mut investigations = Vec::new();

    if let Some(first_session_result) = result.as_cso_first_session() {
        if let Some(extra_investigation_other_reason) = first_session_result
            .extra_investigation
            .extra_investigation_other_reason
            .as_bool()
        {
            investigations.push(Investigation {
                reason_code: InvestigationReason::InvestigatedOtherReason,
                value: extra_investigation_other_reason,
            });
        }

        if let Some(ballots_recounted_extra_investigation) = first_session_result
            .extra_investigation
            .ballots_recounted_extra_investigation
            .as_bool()
        {
            investigations.push(Investigation {
                reason_code: InvestigationReason::BallotsRecounted,
                value: ballots_recounted_extra_investigation,
            });
        }

        investigations.push(Investigation {
            reason_code: InvestigationReason::AdmittedVotersRecounted,
            value: first_session_result.admitted_voters_have_been_recounted(),
        });
    }

    ReportingUnitInvestigations { investigations }
}

impl ReportingUnitVotes {
    pub fn from_polling_station(
        election: &ElectionWithPoliticalGroups,
        committee_session: &CommitteeSession,
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
            reporting_unit_investigations: if committee_session.is_next_session() {
                None
            } else {
                Some(create_investigations_from_results(results))
            },
            selections: Selection::from_political_group_votes(
                election,
                results.political_group_votes(),
            ),
            cast: polling_station.number_of_voters.unwrap_or(0) as u64,
            total_counted: results.votes_counts().total_votes_candidates_count as u64,
            rejected_votes: vec![
                RejectedVotes::new(
                    RejectedVotesReason::Blank,
                    results.votes_counts().blank_votes_count as u64,
                ),
                RejectedVotes::new(
                    RejectedVotesReason::Invalid,
                    results.votes_counts().invalid_votes_count as u64,
                ),
            ],
            uncounted_votes: vec![
                UncountedVotes::new(
                    UncountedVotesReason::PollCard,
                    results.voters_counts().poll_card_count as u64,
                ),
                UncountedVotes::new(
                    UncountedVotesReason::ProxyCertificate,
                    results.voters_counts().proxy_certificate_count as u64,
                ),
                UncountedVotes::new(
                    UncountedVotesReason::TotalAdmittedVoters,
                    results.voters_counts().total_admitted_voters_count as u64,
                ),
                UncountedVotes::new(
                    UncountedVotesReason::MoreBallots,
                    results.differences_counts().more_ballots_count as u64,
                ),
                UncountedVotes::new(
                    UncountedVotesReason::FewerBallots,
                    results.differences_counts().fewer_ballots_count as u64,
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
    #[serde(rename = "D en H zijn gelijk")]
    VotesCastGreaterThanAdmittedVoters,
    #[serde(rename = "H is groter dan D")]
    VotesCastSmallerThanAdmittedVoters,
    #[serde(rename = "H is kleiner dan D")]
    DifferenceCompletelyAccountedFor,
    #[serde(rename = "Verschil tussen D en H volledig verklaard?")]
    AdmittedVotersEqualsVotesCast,
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
        election: &ElectionWithPoliticalGroups,
        votes: &[PoliticalGroupCandidateVotes],
    ) -> Vec<Selection> {
        let mut selections = vec![];
        for pg in votes {
            let epg = election
                .political_groups
                .iter()
                .find(|p| p.number == pg.number);

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
    use test_log::test;

    use super::*;
    use crate::eml::{EMLDocument, common::ElectionDomain};

    #[test]
    fn test_eml510b() {
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
                            reporting_unit_investigations: Some(ReportingUnitInvestigations {
                                investigations: vec![Investigation {
                                    reason_code: InvestigationReason::InvestigatedOtherReason,
                                    value: true,
                                }],
                            }),
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
        assert!(res.contains("<kr:ReportingUnitInvestigations>"));
        assert!(res.contains("<kr:Investigation"));
        println!("{res}");
    }

    #[test]
    fn test_deserialize_eml510b() {
        let data = include_str!("./tests/deserialize_eml510b_test.eml.xml");
        let doc = EML510::from_str(data).unwrap();
        assert_eq!(doc.count.election.contests.len(), 1);
        let contest = &doc.count.election.contests[0];
        assert_eq!(contest.total_votes.cast, 100);
    }

    #[test]
    fn test_deserialize_eml510d() {
        let data = include_str!("./tests/deserialize_eml510d_test.eml.xml");
        let doc = EML510::from_str(data).unwrap();
        assert_eq!(doc.count.election.contests.len(), 1);
        assert_eq!(doc.base.id, "510d");
    }

    #[test]
    fn test_eml510d_without_investigations() {
        let data = include_str!("./tests/deserialize_eml510d_test.eml.xml");
        let doc = EML510::from_str(data).unwrap();

        assert_eq!(doc.count.election.contests.len(), 1);
        assert_eq!(doc.count.election.contests[0].reporting_unit_votes.len(), 1);
        assert!(
            doc.count.election.contests[0].reporting_unit_votes[0]
                .reporting_unit_investigations
                .is_none()
        );
    }

    #[test]
    fn test_eml510b_with_investigations() {
        let data = include_str!("./tests/eml510b_with_investigations.eml.xml");
        let doc = EML510::from_str(data).unwrap();

        assert_eq!(doc.count.election.contests.len(), 1);
        let contest = &doc.count.election.contests[0];

        assert_eq!(contest.reporting_unit_votes.len(), 1);
        let votes = &contest.reporting_unit_votes[0];
        let report = &votes.reporting_unit_investigations;
        assert!(report.is_some());

        let investigations = report.clone().unwrap().investigations;
        assert_eq!(investigations.len(), 3);
        assert_eq!(
            investigations[0].reason_code,
            InvestigationReason::AdmittedVotersRecounted
        );
        assert!(investigations[0].value);
        assert_eq!(
            investigations[1].reason_code,
            InvestigationReason::InvestigatedOtherReason
        );
        assert!(!investigations[1].value);
        assert_eq!(
            investigations[2].reason_code,
            InvestigationReason::BallotsRecounted
        );
        assert!(!investigations[2].value);
    }
}
