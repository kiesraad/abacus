use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::{
    APIError,
    data_entry::{
        CandidateVotes, Count, DifferencesCounts, PoliticalGroupVotes, PollingStationResults,
        Validate, ValidationResults, VotersCounts, VotesCounts,
    },
    election::ElectionWithPoliticalGroups,
    error::ErrorReference,
    polling_station::PollingStation,
};

/// Contains a summary of the election results, added up from the votes of all polling stations.
#[derive(Serialize, Deserialize, Debug, ToSchema)]
pub struct ElectionSummary {
    /// The total number of voters
    pub voters_counts: VotersCounts,
    /// The total number of votes
    pub votes_counts: VotesCounts,
    /// The differences between voters and votes
    pub differences_counts: SummaryDifferencesCounts,
    /// The summary votes for each political group (and each candidate within)
    pub political_group_votes: Vec<PoliticalGroupVotes>,
}

impl ElectionSummary {
    /// Initialize a new summary with all counts set to zero.
    pub fn zero() -> ElectionSummary {
        ElectionSummary {
            voters_counts: VotersCounts {
                poll_card_count: 0,
                proxy_certificate_count: 0,
                total_admitted_voters_count: 0,
            },
            votes_counts: VotesCounts {
                votes_candidates_count: 0,
                blank_votes_count: 0,
                invalid_votes_count: 0,
                total_votes_cast_count: 0,
            },
            differences_counts: SummaryDifferencesCounts::zero(),
            political_group_votes: vec![],
        }
    }

    /// Add all the votes from the given polling stations together, using the
    /// data from the election for candidates and political groups.
    pub fn from_results(
        election: &ElectionWithPoliticalGroups,
        results: &[(PollingStation, PollingStationResults)],
    ) -> Result<ElectionSummary, APIError> {
        // running totals
        let mut totals = ElectionSummary::zero();

        // initialize political group votes to zero
        for group in election.political_groups.iter() {
            totals.political_group_votes.push(PoliticalGroupVotes {
                number: group.number,
                total: 0,
                candidate_votes: group
                    .candidates
                    .iter()
                    .map(|c| CandidateVotes {
                        number: c.number,
                        votes: 0,
                    })
                    .collect(),
            });
        }

        // list of polling stations for which we processed results
        let mut touched_polling_stations = vec![];

        // loop over results and add them to the running total
        for (polling_station, result) in results {
            // Check that we didn't previously touch this polling station
            if touched_polling_stations.contains(&polling_station.number) {
                return Err(APIError::AddError(
                    format!("Polling station {} is repeated", polling_station.number),
                    ErrorReference::PollingStationRepeated,
                ));
            }

            // validate result and make sure that there are no errors
            let mut validation_results = ValidationResults::default();
            result.validate(
                election,
                polling_station,
                &mut validation_results,
                &"data".into(),
            )?;
            if validation_results.has_errors() {
                return Err(APIError::AddError(
                    format!(
                        "Polling station {} has validation errors",
                        polling_station.number
                    ),
                    ErrorReference::PollingStationValidationErrors,
                ));
            }

            // add voters and votes to the total, using the voters recount if available
            totals.voters_counts += &result.voters_counts;
            totals.votes_counts += &result.votes_counts;

            // add any differences noted to the total
            totals
                .differences_counts
                .add_polling_station_results(polling_station, &result.differences_counts);

            // add votes for each political group to the total
            for pg in result.political_group_votes.iter() {
                let pg_total = totals
                    .political_group_votes
                    .iter_mut()
                    .find(|pgv| pgv.number == pg.number)
                    .ok_or(APIError::AddError(
                        format!("Could not find political group '{}'", pg.number),
                        ErrorReference::InvalidPoliticalGroup,
                    ))?;
                pg_total.add(pg)?;
            }

            touched_polling_stations.push(polling_station.number);
        }

        Ok(totals)
    }
}

/// Contains a summary of the differences, containing which polling stations had differences.
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct SummaryDifferencesCounts {
    pub more_ballots_count: SumCount,
    pub fewer_ballots_count: SumCount,
    pub unreturned_ballots_count: SumCount,
    pub too_few_ballots_handed_out_count: SumCount,
    pub too_many_ballots_handed_out_count: SumCount,
    pub other_explanation_count: SumCount,
    pub no_explanation_count: SumCount,
}

impl SummaryDifferencesCounts {
    /// Initialize a new differences count with all counts set to zero.
    pub fn zero() -> SummaryDifferencesCounts {
        SummaryDifferencesCounts {
            more_ballots_count: SumCount::zero(),
            fewer_ballots_count: SumCount::zero(),
            unreturned_ballots_count: SumCount::zero(),
            too_few_ballots_handed_out_count: SumCount::zero(),
            too_many_ballots_handed_out_count: SumCount::zero(),
            other_explanation_count: SumCount::zero(),
            no_explanation_count: SumCount::zero(),
        }
    }

    /// Add the differences for a specific polling station to the total.
    pub fn add_polling_station_results(
        &mut self,
        polling_station: &PollingStation,
        differences_counts: &DifferencesCounts,
    ) {
        self.more_ballots_count
            .add(polling_station, differences_counts.more_ballots_count);
        self.fewer_ballots_count
            .add(polling_station, differences_counts.fewer_ballots_count);
        self.unreturned_ballots_count
            .add(polling_station, differences_counts.unreturned_ballots_count);
        self.too_few_ballots_handed_out_count.add(
            polling_station,
            differences_counts.too_few_ballots_handed_out_count,
        );
        self.too_many_ballots_handed_out_count.add(
            polling_station,
            differences_counts.too_many_ballots_handed_out_count,
        );
        self.other_explanation_count
            .add(polling_station, differences_counts.other_explanation_count);
        self.no_explanation_count
            .add(polling_station, differences_counts.no_explanation_count);
    }
}

/// Contains a summary count, containing both the count and a list of polling
/// stations that contributed to it.
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct SumCount {
    #[schema(value_type = u32)]
    pub count: Count,
    pub polling_stations: Vec<i64>,
}

impl SumCount {
    /// Initialize a count of zero.
    pub fn zero() -> SumCount {
        SumCount {
            count: 0,
            polling_stations: vec![],
        }
    }

    /// Add the count for a specific polling station to this summary count.
    pub fn add(&mut self, polling_station: &PollingStation, count: Count) {
        if count > 0 {
            self.count += count;
            self.polling_stations.push(polling_station.number);
        }
    }
}

#[cfg(test)]
mod tests {
    use test_log::test;

    use super::*;
    use crate::{election::tests::election_fixture, pdf_gen::tests::polling_stations_fixture};

    fn polling_station_results_fixture_a() -> PollingStationResults {
        PollingStationResults {
            voters_counts: VotersCounts {
                poll_card_count: 30,
                proxy_certificate_count: 5,
                total_admitted_voters_count: 35,
            },
            votes_counts: VotesCounts {
                votes_candidates_count: 31,
                blank_votes_count: 2,
                invalid_votes_count: 3,
                total_votes_cast_count: 36,
            },
            differences_counts: {
                let mut tmp = DifferencesCounts::zero();
                tmp.more_ballots_count = 1;
                tmp
            },
            political_group_votes: vec![
                PoliticalGroupVotes::from_test_data_auto(1, &[18, 3]),
                PoliticalGroupVotes::from_test_data_auto(2, &[4, 4, 2]),
            ],
        }
    }

    fn polling_station_results_fixture_b() -> PollingStationResults {
        PollingStationResults {
            voters_counts: VotersCounts {
                poll_card_count: 49,
                proxy_certificate_count: 1,
                total_admitted_voters_count: 50,
            },
            votes_counts: VotesCounts {
                votes_candidates_count: 46,
                blank_votes_count: 2,
                invalid_votes_count: 0,
                total_votes_cast_count: 48,
            },
            differences_counts: {
                let mut tmp = DifferencesCounts::zero();
                tmp.fewer_ballots_count = 2;
                tmp
            },
            political_group_votes: vec![
                PoliticalGroupVotes::from_test_data_auto(1, &[10, 6]),
                PoliticalGroupVotes::from_test_data_auto(2, &[12, 10, 8]),
            ],
        }
    }

    #[test]
    fn test_differences_counts_addition() {
        let mut diff = SummaryDifferencesCounts::zero();
        let diff2 = {
            let mut tmp = DifferencesCounts::zero();
            tmp.more_ballots_count = 1;
            tmp
        };

        let mut ps = polling_stations_fixture(&election_fixture(&[1, 2]), &[20, 20]);
        ps[0].number = 123;

        diff.add_polling_station_results(&ps[0], &diff2);

        assert_eq!(diff.more_ballots_count.count, 1);
        assert_eq!(diff.more_ballots_count.polling_stations, vec![123]);
        assert_eq!(diff.fewer_ballots_count.count, 0);
        assert_eq!(diff.unreturned_ballots_count.count, 0);
        assert_eq!(diff.too_few_ballots_handed_out_count.count, 0);
        assert_eq!(diff.too_many_ballots_handed_out_count.count, 0);
        assert_eq!(diff.other_explanation_count.count, 0);
        assert_eq!(diff.no_explanation_count.count, 0);

        ps[1].number = 321;

        diff.add_polling_station_results(&ps[1], &diff2);

        assert_eq!(diff.more_ballots_count.count, 2);
        assert_eq!(diff.more_ballots_count.polling_stations, vec![123, 321]);
    }

    #[test]
    fn test_political_group_counting() {
        let election = election_fixture(&[2, 3]);
        let ps = polling_stations_fixture(&election, &[20, 20]);
        let results = vec![
            (ps[0].clone(), polling_station_results_fixture_a()),
            (ps[1].clone(), polling_station_results_fixture_b()),
        ];
        let totals = ElectionSummary::from_results(&election, &results).unwrap();

        // check values in the differences counts
        assert_eq!(totals.differences_counts.more_ballots_count.count, 1);
        // should be ps1 number in here
        assert_eq!(
            totals
                .differences_counts
                .more_ballots_count
                .polling_stations,
            vec![31]
        );
        assert_eq!(totals.differences_counts.fewer_ballots_count.count, 2);
        // should be ps2 number in here
        assert_eq!(
            totals
                .differences_counts
                .fewer_ballots_count
                .polling_stations,
            vec![32]
        );

        // this field should not have any recorded polling stations
        assert_eq!(totals.differences_counts.no_explanation_count.count, 0);
        assert!(
            totals
                .differences_counts
                .no_explanation_count
                .polling_stations
                .is_empty()
        );

        // tests for voters counts
        assert_eq!(totals.voters_counts.total_admitted_voters_count, 85);
        assert_eq!(totals.voters_counts.poll_card_count, 79);
        assert_eq!(totals.voters_counts.proxy_certificate_count, 6);

        // tests for votes counts
        assert_eq!(totals.votes_counts.total_votes_cast_count, 84);
        assert_eq!(totals.votes_counts.votes_candidates_count, 77);
        assert_eq!(totals.votes_counts.blank_votes_count, 4);
        assert_eq!(totals.votes_counts.invalid_votes_count, 3);

        // finally the political group counts
        assert_eq!(totals.political_group_votes.len(), 2);
        let group1 = totals.political_group_votes.first().unwrap();
        assert_eq!(group1.total, 37);
        assert_eq!(group1.candidate_votes.len(), 2);

        assert_eq!(group1.candidate_votes.first().unwrap().votes, 28);
        assert_eq!(group1.candidate_votes.get(1).unwrap().votes, 9);

        let group2 = totals.political_group_votes.get(1).unwrap();
        assert_eq!(group2.total, 40);
        assert_eq!(group2.candidate_votes.len(), 3);

        assert_eq!(group2.candidate_votes.first().unwrap().votes, 16);
        assert_eq!(group2.candidate_votes.get(1).unwrap().votes, 14);
        assert_eq!(group2.candidate_votes.get(2).unwrap().votes, 10);
    }

    #[test]
    fn test_adding_zero_polling_stations() {
        let election = election_fixture(&[10, 20, 18]);
        let totals = ElectionSummary::from_results(&election, &[]).unwrap();
        assert_eq!(totals.voters_counts.total_admitted_voters_count, 0);
        assert_eq!(totals.votes_counts.total_votes_cast_count, 0);
    }

    #[test]
    fn test_adding_many_polling_stations() {
        let election = election_fixture(&[2, 3]);
        let ps = polling_stations_fixture(&election, &[20; 600]);
        let results_ps = polling_station_results_fixture_a();
        let results = ps
            .iter()
            .map(|p| (p.clone(), results_ps.clone()))
            .collect::<Vec<_>>();
        let totals = ElectionSummary::from_results(&election, &results).unwrap();

        assert_eq!(totals.voters_counts.total_admitted_voters_count, 21000);
        assert_eq!(totals.votes_counts.total_votes_cast_count, 21600);
        assert_eq!(totals.political_group_votes[0].total, 12600);
        assert_eq!(
            totals.political_group_votes[0].candidate_votes[0].votes,
            10800
        );
    }

    #[test]
    #[should_panic]
    fn test_too_high_polling_station_numbers() {
        let election = election_fixture(&[2, 3]);
        let ps = polling_stations_fixture(&election, &[20; 5]);
        let mut ps_results = polling_station_results_fixture_a();
        ps_results.political_group_votes[0].total = 999_999_998;
        ps_results.political_group_votes[0].candidate_votes[0].votes = 999_999_998;
        ps_results.political_group_votes[0].candidate_votes[1].votes = 0;
        ps_results.political_group_votes[1].total = 0;
        ps_results.political_group_votes[1].candidate_votes[0].votes = 0;
        ps_results.political_group_votes[1].candidate_votes[1].votes = 0;
        ps_results.political_group_votes[1].candidate_votes[2].votes = 0;
        ps_results.votes_counts.total_votes_cast_count = 999_999_998;
        ps_results.votes_counts.votes_candidates_count = 999_999_998;
        ps_results.votes_counts.blank_votes_count = 0;
        ps_results.votes_counts.invalid_votes_count = 0;
        ps_results.voters_counts.poll_card_count = 999_999_998;
        ps_results.voters_counts.proxy_certificate_count = 0;
        ps_results.voters_counts.total_admitted_voters_count = 999_999_998;
        ps_results.differences_counts.more_ballots_count = 0;

        let results = ps
            .iter()
            .map(|p| (p.clone(), ps_results.clone()))
            .collect::<Vec<_>>();
        let _totals = ElectionSummary::from_results(&election, &results);
    }

    #[test]
    fn test_invalid_polling_station_data_does_not_add() {
        let election = election_fixture(&[2, 3]);
        let ps = polling_stations_fixture(&election, &[20, 20]);
        let ps_results = polling_station_results_fixture_a();
        let mut ps_results2 = ps_results.clone();
        ps_results2.votes_counts.total_votes_cast_count = 0;

        let totals = ElectionSummary::from_results(
            &election,
            &[(ps[0].clone(), ps_results), (ps[1].clone(), ps_results2)],
        );

        assert!(totals.is_err());
    }

    #[test]
    fn test_repeated_polling_stations() {
        let election = election_fixture(&[2, 3]);
        let ps = polling_stations_fixture(&election, &[20, 20]);
        let totals = ElectionSummary::from_results(
            &election,
            &[
                (ps[0].clone(), polling_station_results_fixture_a()),
                (ps[0].clone(), polling_station_results_fixture_b()),
                (ps[1].clone(), polling_station_results_fixture_b()),
            ],
        );

        assert!(totals.is_err());
    }

    #[test]
    fn test_missing_political_groups() {
        let election = election_fixture(&[2, 3]);
        let ps = polling_stations_fixture(&election, &[20, 20]);
        let ps1_result = polling_station_results_fixture_a();
        let mut ps2_result = polling_station_results_fixture_b();
        ps2_result.political_group_votes.pop();
        let totals = ElectionSummary::from_results(
            &election,
            &[(ps[0].clone(), ps1_result), (ps[1].clone(), ps2_result)],
        );

        assert!(totals.is_err());
    }

    #[test]
    fn test_too_many_political_groups() {
        let election = election_fixture(&[2, 3]);
        let ps = polling_stations_fixture(&election, &[20, 20]);
        let ps1_result = polling_station_results_fixture_a();
        let mut ps2_result = polling_station_results_fixture_b();
        ps2_result
            .political_group_votes
            .push(PoliticalGroupVotes::from_test_data_auto(3, &[0]));
        let totals = ElectionSummary::from_results(
            &election,
            &[(ps[0].clone(), ps1_result), (ps[1].clone(), ps2_result)],
        );

        assert!(totals.is_err());
    }

    #[test]
    fn test_invalid_political_group() {
        let election = election_fixture(&[2, 3]);
        let ps = polling_stations_fixture(&election, &[20, 20]);
        let ps1_result = polling_station_results_fixture_a();
        let mut ps2_result = polling_station_results_fixture_b();
        ps2_result.political_group_votes[1] = PoliticalGroupVotes::from_test_data_auto(3, &[0]);
        let totals = ElectionSummary::from_results(
            &election,
            &[(ps[0].clone(), ps1_result), (ps[1].clone(), ps2_result)],
        );

        assert!(totals.is_err());
    }

    #[test]
    fn test_invalid_number_of_candidates() {
        let election = election_fixture(&[2, 3]);
        let ps = polling_stations_fixture(&election, &[20, 20]);
        let ps1_result = polling_station_results_fixture_a();
        let mut ps2_result = polling_station_results_fixture_b();
        ps2_result.political_group_votes[1].candidate_votes.pop();
        let totals = ElectionSummary::from_results(
            &election,
            &[(ps[0].clone(), ps1_result), (ps[1].clone(), ps2_result)],
        );

        assert!(totals.is_err());
    }
}
