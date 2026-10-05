use eml_nl::{
    EMLError,
    documents::election_count::{
        ElectionCount, SelectionAffiliationVotes, TotalVotes, UncountedVotesReason,
    },
};

use crate::domain::{
    election::{CandidateNumber, ElectionCategory, PGNumber},
    results::{
        gsb_differences_counts::GSBDifferencesCounts,
        gsb_results::GSBResults,
        political_group_candidate_votes::{CandidateVotes, PoliticalGroupCandidateVotes},
        political_group_total_votes::PoliticalGroupTotalVotes,
        voters_counts::VotersCounts,
        votes_counts::VotesCounts,
    },
};

impl GSBResults {
    /// Create GSB results from the `TotalVotes` element in an EML_NL 510b count document.
    /// Uses the first contest.
    pub fn from_eml_count(
        count: &ElectionCount,
        election_category: ElectionCategory,
    ) -> Result<Self, EMLError> {
        let contest = count
            .count
            .election
            .contests
            .first()
            .ok_or_else(|| EMLError::custom("Missing a Contest element"))?;
        let total_votes = contest
            .total_votes
            .as_ref()
            .ok_or_else(|| EMLError::custom("Missing the TotalVotes element"))?;

        Self::from_eml_total_votes(total_votes, election_category)
    }

    /// Create GSB results from the `TotalVotes` element of an EML_NL 510b count document.
    pub fn from_eml_total_votes(
        total_votes: &TotalVotes,
        election_category: ElectionCategory,
    ) -> Result<Self, EMLError> {
        let political_group_votes = total_votes
            .selections_per_affiliation()?
            .iter()
            .map(political_group_candidate_votes)
            .collect::<Result<Vec<_>, EMLError>>()?;

        Ok(GSBResults {
            number_of_voters: u32::try_from(total_votes.eligible_voter_count.copied_value()?)
                .map_err(EMLError::value_conversion)?,
            voters_counts: Self::voters_counts(total_votes, election_category)?,
            votes_counts: Self::votes_counts(total_votes, &political_group_votes)?,
            differences_counts: GSBDifferencesCounts {
                more_ballots_count: uncounted_votes(
                    total_votes,
                    UncountedVotesReason::MoreBallotsCounted,
                )?,
                fewer_ballots_count: uncounted_votes(
                    total_votes,
                    UncountedVotesReason::FewerBallotsCounted,
                )?,
            },
            political_group_votes,
        })
    }

    fn voters_counts(
        total_votes: &TotalVotes,
        election_category: ElectionCategory,
    ) -> Result<VotersCounts, EMLError> {
        Ok(VotersCounts {
            poll_card_count: uncounted_votes(total_votes, UncountedVotesReason::ValidPollCards)?,
            proxy_certificate_count: uncounted_votes(
                total_votes,
                UncountedVotesReason::ValidProxyCertificates,
            )?,
            // Voter card count only exists for non-local
            // However, EMLs may still contain voter card counts with value 0
            voter_card_count: total_votes
                .uncounted_votes
                .get(&UncountedVotesReason::ValidVoterCards)
                .map(|v| u32::try_from(v.copied_value()?).map_err(EMLError::value_conversion))
                .transpose()?
                // Only keep value if non-local election or > 0
                .filter(|&count| count > 0 || !election_category.is_local_election()),
            total_admitted_voters_count: uncounted_votes(
                total_votes,
                UncountedVotesReason::AdmittedVoters,
            )?,
        })
    }

    fn votes_counts(
        total_votes: &TotalVotes,
        political_group_votes: &[PoliticalGroupCandidateVotes],
    ) -> Result<VotesCounts, EMLError> {
        let total_votes_candidates_count =
            u32::try_from(total_votes.candidate_votes_count.copied_value()?)
                .map_err(EMLError::value_conversion)?;
        let blank_votes_count = u32::try_from(total_votes.blank_votes()?.copied_value()?)
            .map_err(EMLError::value_conversion)?;
        let invalid_votes_count = u32::try_from(total_votes.invalid_votes()?.copied_value()?)
            .map_err(EMLError::value_conversion)?;

        Ok(VotesCounts {
            political_group_total_votes: political_group_votes
                .iter()
                .map(|pg| PoliticalGroupTotalVotes {
                    number: pg.number,
                    total: pg.total,
                })
                .collect(),
            total_votes_candidates_count,
            blank_votes_count,
            invalid_votes_count,
            // EML has no element for total votes cast count, so we add the counts
            // of the votes on candidates, the blank votes, and the invalid votes
            total_votes_cast_count: u32::try_from(
                u64::from(total_votes_candidates_count)
                    + u64::from(blank_votes_count)
                    + u64::from(invalid_votes_count),
            )
            .map_err(EMLError::value_conversion)?,
        })
    }
}

/// Convert the votes for an affiliation and its candidates into `PoliticalGroupCandidateVotes`.
fn political_group_candidate_votes(
    votes: &SelectionAffiliationVotes<'_>,
) -> Result<PoliticalGroupCandidateVotes, EMLError> {
    Ok(PoliticalGroupCandidateVotes {
        number: PGNumber::from(
            u32::try_from(votes.affiliation.id.copied_value()?.value().get())
                .map_err(EMLError::value_conversion)?,
        ),
        total: u32::try_from(votes.valid_votes).map_err(EMLError::value_conversion)?,
        candidate_votes: votes
            .candidates
            .iter()
            .map(|candidate| {
                Ok(CandidateVotes {
                    number: CandidateNumber::from(
                        u32::try_from(
                            candidate
                                .candidate
                                .identifier
                                .id
                                .copied_value()?
                                .value()
                                .get(),
                        )
                        .map_err(EMLError::value_conversion)?,
                    ),
                    votes: u32::try_from(candidate.valid_votes)
                        .map_err(EMLError::value_conversion)?,
                })
            })
            .collect::<Result<Vec<_>, EMLError>>()?,
    })
}

/// Get the number of uncounted votes for the given reason
fn uncounted_votes(
    total_votes: &TotalVotes,
    reason: UncountedVotesReason,
) -> Result<u32, EMLError> {
    total_votes
        .uncounted_votes
        .get(&reason)
        .ok_or_else(|| {
            EMLError::custom(format!(
                "Missing UncountedVotes element with reason code \"{}\"",
                reason.to_eml_value()
            ))
        })
        .and_then(|v| u32::try_from(v.copied_value()?).map_err(EMLError::value_conversion))
}

#[cfg(test)]
mod tests {
    use chrono::Local;
    use eml_nl::{
        common::ContestIdentifier,
        documents::election_count::{
            AffiliationSelection, ElectionCountContest, ElectionCountSelection, RejectedVotesReason,
        },
        io::{EMLParsingMode, EMLRead as _},
        utils::{AffiliationId, CandidateId, StringValue},
    };
    use test_log::test;

    use super::*;
    use crate::domain::{
        committee_session::committee_session_fixture,
        data_entry::{DataEntryId, DataEntrySource},
        election::{CommitteeCategory, tests::election_fixture},
        results::Results,
        sub_committee::{SubCommitteeFirstSession, SubCommitteeId},
        tabulation::ElectionTotals,
        validate::Validate,
    };

    fn gsb_results_fixture() -> GSBResults {
        GSBResults {
            number_of_voters: 2000,
            voters_counts: VotersCounts {
                poll_card_count: 1000,
                proxy_certificate_count: 50,
                voter_card_count: None,
                total_admitted_voters_count: 1050,
            },
            votes_counts: VotesCounts {
                political_group_total_votes: vec![
                    PoliticalGroupTotalVotes {
                        number: PGNumber::from(1),
                        total: 600,
                    },
                    PoliticalGroupTotalVotes {
                        number: PGNumber::from(2),
                        total: 440,
                    },
                ],
                total_votes_candidates_count: 1040,
                blank_votes_count: 6,
                invalid_votes_count: 5,
                total_votes_cast_count: 1051,
            },
            differences_counts: GSBDifferencesCounts {
                more_ballots_count: 1,
                fewer_ballots_count: 0,
            },
            political_group_votes: vec![
                PoliticalGroupCandidateVotes::from_test_data_auto(PGNumber::from(1), &[400, 200]),
                PoliticalGroupCandidateVotes::from_test_data_auto(
                    PGNumber::from(2),
                    &[300, 100, 40],
                ),
            ],
        }
    }

    /// Generate EML from given GSB Results
    fn count_document(results: GSBResults) -> ElectionCount {
        let election =
            election_fixture(ElectionCategory::Municipal, CommitteeCategory::CSB, &[2, 3]);
        let committee_session = committee_session_fixture(election.id);
        let entries = [(
            DataEntrySource::SubCommittee(SubCommitteeFirstSession {
                committee_session_id: committee_session.id,
                id: SubCommitteeId::from(1),
                number: 1,
                name: "Test".to_string(),
                authority_id: "0001".to_string(),
                authority_name: "Test".to_string(),
                data_entry_id: DataEntryId::from(1),
            }),
            Results::GSB(results),
        )];
        let totals = ElectionTotals::tabulate(&election, &entries).unwrap();

        election
            .as_count_eml(None, &committee_session, &entries, &totals, Local::now())
            .unwrap()
    }

    fn total_votes() -> TotalVotes {
        ElectionCountContest::builder()
            .identifier(ContestIdentifier::geen())
            // number_of_voters
            .total_eligible_voter_count(100u32)
            // voters_counts
            .total_uncounted_votes(UncountedVotesReason::ValidPollCards, 80u32)
            .total_uncounted_votes(UncountedVotesReason::ValidProxyCertificates, 13u32)
            .total_uncounted_votes(UncountedVotesReason::AdmittedVoters, 93u32)
            // votes_counts
            .total_candidate_votes_count(90u32)
            .total_rejected_votes(RejectedVotesReason::Blank, 1u32)
            .total_rejected_votes(RejectedVotesReason::Invalid, 2u32)
            // differences_counts
            .total_uncounted_votes(UncountedVotesReason::MoreBallotsCounted, 0u32)
            .total_uncounted_votes(UncountedVotesReason::FewerBallotsCounted, 0u32)
            // political_group_votes
            .total_votes_selections([
                ElectionCountSelection::builder()
                    .affiliation(AffiliationSelection::new(
                        AffiliationId::from_u64(1).unwrap(),
                        "Lijst 1",
                    ))
                    .valid_votes(90u32)
                    .build()
                    .unwrap(),
                ElectionCountSelection::builder()
                    .candidate(CandidateId::from_u64(1).unwrap())
                    .valid_votes(90u32)
                    .build()
                    .unwrap(),
            ])
            .build()
            .unwrap()
            .total_votes
            .unwrap()
    }

    /// Results written by Abacus into a 510b count document are read back unchanged
    #[test]
    fn test_from_eml_count_round_trip() {
        let results = gsb_results_fixture();
        let xml = String::try_from(count_document(results.clone())).unwrap();
        let count = ElectionCount::parse_eml(&xml, EMLParsingMode::Strict)
            .ok()
            .unwrap();

        assert_eq!(
            GSBResults::from_eml_count(&count, ElectionCategory::Municipal).unwrap(),
            results
        );
    }

    #[test]
    fn test_from_eml_count_missing_total_votes() {
        let mut count = count_document(gsb_results_fixture());
        count.count.election.contests[0].total_votes = None;

        assert!(GSBResults::from_eml_count(&count, ElectionCategory::Municipal).is_err());
    }

    #[test]
    fn test_from_eml_total_votes() {
        let results =
            GSBResults::from_eml_total_votes(&total_votes(), ElectionCategory::Municipal).unwrap();

        assert_eq!(
            results,
            GSBResults {
                number_of_voters: 100,
                voters_counts: VotersCounts {
                    poll_card_count: 80,
                    proxy_certificate_count: 13,
                    voter_card_count: None,
                    total_admitted_voters_count: 93,
                },
                votes_counts: VotesCounts {
                    political_group_total_votes: vec![PoliticalGroupTotalVotes {
                        number: PGNumber::from(1),
                        total: 90,
                    }],
                    total_votes_candidates_count: 90,
                    blank_votes_count: 1,
                    invalid_votes_count: 2,
                    total_votes_cast_count: 93,
                },
                differences_counts: GSBDifferencesCounts::zero(),
                political_group_votes: vec![PoliticalGroupCandidateVotes::from_test_data_auto(
                    PGNumber::from(1),
                    &[90]
                )],
            }
        );
    }

    #[test]
    fn test_from_eml_total_votes_with_voter_cards() {
        use ElectionCategory::*;

        // (election category, voter cards in EML, expected voter card count, expected validation result)
        let cases = [
            (Municipal, 0, None, true),
            // voter cards are not allowed for municipal elections
            (Municipal, 42, Some(42), false),
            (Provincial, 0, Some(0), true),
            (Provincial, 42, Some(42), true),
            (WaterAuthority, 0, Some(0), true),
            (WaterAuthority, 42, Some(42), true),
        ];

        for (category, voter_cards, expected, accepted) in cases {
            let case = format!("{category:?} with {voter_cards} voter cards");
            let mut total_votes = total_votes();
            total_votes.uncounted_votes.insert(
                UncountedVotesReason::ValidVoterCards,
                StringValue::from_value(voter_cards),
            );

            let results = GSBResults::from_eml_total_votes(&total_votes, category).unwrap();
            assert_eq!(results.voters_counts.voter_card_count, expected, "{case}");

            let election = election_fixture(category, CommitteeCategory::CSB, &[1]);
            let validation = results.validate(&election, &"data".into());
            assert_eq!(validation.is_ok(), accepted, "{case}");
        }
    }

    #[test]
    fn test_from_eml_total_votes_missing_uncounted_votes() {
        let mut total_votes = total_votes();
        total_votes
            .uncounted_votes
            .remove(&UncountedVotesReason::AdmittedVoters);

        assert!(
            GSBResults::from_eml_total_votes(&total_votes, ElectionCategory::Municipal).is_err()
        );
    }

    #[test]
    fn test_from_eml_total_votes_count_too_large() {
        let mut total_votes = total_votes();
        total_votes.eligible_voter_count = StringValue::from_value(u64::from(u32::MAX) + 1);

        assert!(
            GSBResults::from_eml_total_votes(&total_votes, ElectionCategory::Municipal).is_err()
        );
    }

    #[test]
    fn test_from_eml_total_votes_affiliation_id_too_large() {
        let mut total_votes = total_votes();
        total_votes.selections[0] = ElectionCountSelection::builder()
            .affiliation(AffiliationSelection::new(
                AffiliationId::from_u64(u64::from(u32::MAX) + 1).unwrap(),
                "Lijst 1",
            ))
            .valid_votes(90u32)
            .build()
            .unwrap();

        assert!(
            GSBResults::from_eml_total_votes(&total_votes, ElectionCategory::Municipal).is_err()
        );
    }

    /// Run validation and assert if GSBResults are valid
    fn assert_no_validation_errors(results: &GSBResults, category: ElectionCategory) {
        let candidates_per_group = results
            .political_group_votes
            .iter()
            .map(|pg| u32::try_from(pg.candidate_votes.len()).unwrap())
            .collect::<Vec<_>>();
        let election = election_fixture(category, CommitteeCategory::CSB, &candidates_per_group);
        let validation_results = results.validate(&election, &"data".into()).unwrap();

        assert!(
            validation_results.errors.is_empty(),
            "{:?}",
            validation_results.errors
        );
    }

    #[test]
    fn test_from_eml_count_xml() {
        let count = ElectionCount::parse_eml(
            include_str!("tests/eml510b_test.eml.xml"),
            EMLParsingMode::Strict,
        )
        .ok()
        .unwrap();
        let results = GSBResults::from_eml_count(&count, ElectionCategory::Municipal).unwrap();

        assert_eq!(results.number_of_voters, 20599);
        assert_eq!(
            results.voters_counts,
            VotersCounts {
                poll_card_count: 11282,
                proxy_certificate_count: 1214,
                voter_card_count: None,
                total_admitted_voters_count: 12496,
            }
        );
        assert_eq!(results.votes_counts.total_votes_candidates_count, 12383);
        assert_eq!(results.votes_counts.blank_votes_count, 55);
        assert_eq!(results.votes_counts.invalid_votes_count, 58);
        assert_eq!(results.votes_counts.total_votes_cast_count, 12496);
        assert_eq!(
            results.differences_counts,
            GSBDifferencesCounts {
                more_ballots_count: 1,
                fewer_ballots_count: 1,
            }
        );
        assert_eq!(results.votes_counts.political_group_total_votes.len(), 3);
        assert_eq!(results.political_group_votes.len(), 3);
        assert_eq!(
            results
                .political_group_votes
                .iter()
                .map(|pg| pg.candidate_votes.len())
                .sum::<usize>(),
            18
        );
        assert_eq!(results.political_group_votes[0].total, 6360);
        assert_eq!(
            results.political_group_votes[0].candidate_votes[0].votes,
            3044
        );
        assert_no_validation_errors(&results, ElectionCategory::Municipal);
    }
}
