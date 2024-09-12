use serde::{Deserialize, Serialize};

use crate::polling_station::Validate;
use crate::validation::ValidationResults;
use crate::{
    election::Election,
    polling_station::{
        self, Count, DifferencesCounts, PoliticalGroupVotes, PollingStation, PollingStationResults,
        VotersCounts, VotesCounts,
    },
    APIError,
};

#[derive(Serialize, Deserialize)]
pub struct ModelNa31_2Input {
    pub election: Election,
    pub summary: ModelNa31_2Summary,
    pub polling_stations: Vec<PollingStation>,
}

#[derive(Serialize, Deserialize)]
pub struct ModelNa31_2Summary {
    pub voters_counts: VotersCounts,
    pub votes_counts: VotesCounts,
    pub differences_counts: SummaryDifferencesCounts,
    pub recounted_polling_stations: Vec<i64>,
    pub political_group_votes: Vec<PoliticalGroupVotes>,
}

impl ModelNa31_2Summary {
    pub fn zero() -> ModelNa31_2Summary {
        ModelNa31_2Summary {
            voters_counts: VotersCounts {
                poll_card_count: 0,
                proxy_certificate_count: 0,
                voter_card_count: 0,
                total_admitted_voters_count: 0,
            },
            votes_counts: VotesCounts {
                votes_candidates_counts: 0,
                blank_votes_count: 0,
                invalid_votes_count: 0,
                total_votes_cast_count: 0,
            },
            differences_counts: SummaryDifferencesCounts::zero(),
            recounted_polling_stations: vec![],
            political_group_votes: vec![],
        }
    }

    pub fn from_results(
        election: &Election,
        results: &[(PollingStation, PollingStationResults)],
    ) -> Result<ModelNa31_2Summary, APIError> {
        // running totals
        let mut totals = ModelNa31_2Summary::zero();

        // initialize political group votes to zero
        if let Some(pgs) = &election.political_groups {
            for group in pgs.iter() {
                totals.political_group_votes.push(PoliticalGroupVotes {
                    number: group.number,
                    total: 0,
                    candidate_votes: group
                        .candidates
                        .iter()
                        .map(|c| polling_station::CandidateVotes {
                            number: c.number,
                            votes: 0,
                        })
                        .collect(),
                });
            }
        }

        // loop over results and add them to the running total
        for (polling_station, result) in results {
            // validate result and make sure that there are no errors
            let mut validation_results = ValidationResults::default();
            result.validate(
                election,
                polling_station,
                &mut validation_results,
                "data".to_string(),
            )?;
            if validation_results.has_errors() {
                return Err(APIError::AddError(format!(
                    "Polling station {} has validation errors",
                    polling_station.number
                )));
            }

            // add voters and votes to the total
            totals.voters_counts += &result.voters_counts;
            totals.votes_counts += &result.votes_counts;

            // add any differences noted to the total
            totals
                .differences_counts
                .add_polling_station_results(polling_station, &result.differences_counts);

            // if this polling station was recounted, add it to the list
            if result.recounted {
                totals
                    .recounted_polling_stations
                    .push(polling_station.number);
            }

            // add votes for each political group to the total
            for pg in result.political_group_votes.iter() {
                let pg_total = totals
                    .political_group_votes
                    .iter_mut()
                    .find(|pgv| pgv.number == pg.number)
                    .ok_or(APIError::AddError(format!(
                        "Could not find political group '{}'",
                        pg.number
                    )))?;
                pg_total.add(pg)?;
            }
        }

        Ok(totals)
    }
}

#[derive(Serialize, Deserialize)]
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

#[derive(Serialize, Deserialize)]
pub struct SumCount {
    pub count: Count,
    pub polling_stations: Vec<i64>,
}

impl SumCount {
    pub fn zero() -> SumCount {
        SumCount {
            count: 0,
            polling_stations: vec![],
        }
    }

    pub fn add(&mut self, polling_station: &PollingStation, count: Count) {
        if count > 0 {
            self.count += count;
            self.polling_stations.push(polling_station.number);
        }
    }
}

#[cfg(test)]
mod tests {
    use polling_station::{CandidateVotes, PollingStationType};

    use crate::{election::tests::election_fixture, polling_station::DifferencesCounts};

    use super::*;

    #[test]
    fn test_differences_counts_addition() {
        let mut diff = SummaryDifferencesCounts::zero();
        let diff2 = DifferencesCounts {
            more_ballots_count: 1,
            fewer_ballots_count: 0,
            unreturned_ballots_count: 0,
            too_few_ballots_handed_out_count: 0,
            too_many_ballots_handed_out_count: 0,
            other_explanation_count: 0,
            no_explanation_count: 0,
        };

        let mut ps = PollingStation {
            id: 1,
            election_id: 1,
            name: "Test".to_string(),
            number: 123,
            number_of_voters: None,
            polling_station_type: PollingStationType::VasteLocatie,
            street: "Test".to_string(),
            house_number: "20".to_string(),
            house_number_addition: None,
            postal_code: "1234AB".to_string(),
            locality: "Test".to_string(),
        };

        diff.add_polling_station_results(&ps, &diff2);

        assert_eq!(diff.more_ballots_count.count, 1);
        assert_eq!(diff.more_ballots_count.polling_stations, vec![123]);
        assert_eq!(diff.fewer_ballots_count.count, 0);
        assert_eq!(diff.unreturned_ballots_count.count, 0);
        assert_eq!(diff.too_few_ballots_handed_out_count.count, 0);
        assert_eq!(diff.too_many_ballots_handed_out_count.count, 0);
        assert_eq!(diff.other_explanation_count.count, 0);
        assert_eq!(diff.no_explanation_count.count, 0);

        ps.number = 321;

        diff.add_polling_station_results(&ps, &diff2);

        assert_eq!(diff.more_ballots_count.count, 2);
        assert_eq!(diff.more_ballots_count.polling_stations, vec![123, 321]);
    }

    #[test]
    fn test_political_group_counting() {
        let election = election_fixture(&[2, 3]);
        let ps1 = PollingStation {
            id: 1,
            election_id: election.id,
            name: "Testplek".to_string(),
            number: 34,
            number_of_voters: Some(20),
            polling_station_type: PollingStationType::Bijzonder,
            street: "Teststraat".to_string(),
            house_number: "2".to_string(),
            house_number_addition: Some("b".to_string()),
            postal_code: "1234 QY".to_string(),
            locality: "Testdorp".to_string(),
        };
        let ps2 = PollingStation {
            id: 2,
            election_id: election.id,
            name: "Testplek twee".to_string(),
            number: 37,
            number_of_voters: Some(20),
            polling_station_type: PollingStationType::Bijzonder,
            street: "Testlaan".to_string(),
            house_number: "3".to_string(),
            house_number_addition: Some("b".to_string()),
            postal_code: "0123AB".to_string(),
            locality: "Testdorp".to_string(),
        };

        let ps1_votes = PollingStationResults {
            recounted: false,
            voters_counts: VotersCounts {
                poll_card_count: 20,
                proxy_certificate_count: 5,
                voter_card_count: 10,
                total_admitted_voters_count: 35,
            },
            votes_counts: VotesCounts {
                votes_candidates_counts: 31,
                blank_votes_count: 2,
                invalid_votes_count: 3,
                total_votes_cast_count: 36,
            },
            voters_recounts: None,
            differences_counts: DifferencesCounts {
                more_ballots_count: 1,
                fewer_ballots_count: 0,
                unreturned_ballots_count: 0,
                too_few_ballots_handed_out_count: 0,
                too_many_ballots_handed_out_count: 0,
                other_explanation_count: 0,
                no_explanation_count: 0,
            },
            political_group_votes: vec![
                PoliticalGroupVotes {
                    number: 1,
                    total: 21,
                    candidate_votes: vec![
                        CandidateVotes {
                            number: 1,
                            votes: 18,
                        },
                        CandidateVotes {
                            number: 2,
                            votes: 3,
                        },
                    ],
                },
                PoliticalGroupVotes {
                    number: 2,
                    total: 10,
                    candidate_votes: vec![
                        CandidateVotes {
                            number: 1,
                            votes: 4,
                        },
                        CandidateVotes {
                            number: 2,
                            votes: 4,
                        },
                        CandidateVotes {
                            number: 3,
                            votes: 2,
                        },
                    ],
                },
            ],
        };

        let ps2_votes = PollingStationResults {
            recounted: true,
            voters_counts: VotersCounts {
                poll_card_count: 39,
                proxy_certificate_count: 1,
                voter_card_count: 10,
                total_admitted_voters_count: 50,
            },
            votes_counts: VotesCounts {
                votes_candidates_counts: 46,
                blank_votes_count: 2,
                invalid_votes_count: 0,
                total_votes_cast_count: 48,
            },
            voters_recounts: None,
            differences_counts: DifferencesCounts {
                more_ballots_count: 0,
                fewer_ballots_count: 2,
                unreturned_ballots_count: 0,
                too_few_ballots_handed_out_count: 0,
                too_many_ballots_handed_out_count: 0,
                other_explanation_count: 0,
                no_explanation_count: 0,
            },
            political_group_votes: vec![
                PoliticalGroupVotes {
                    number: 1,
                    total: 16,
                    candidate_votes: vec![
                        CandidateVotes {
                            number: 1,
                            votes: 10,
                        },
                        CandidateVotes {
                            number: 2,
                            votes: 6,
                        },
                    ],
                },
                PoliticalGroupVotes {
                    number: 2,
                    total: 30,
                    candidate_votes: vec![
                        CandidateVotes {
                            number: 1,
                            votes: 12,
                        },
                        CandidateVotes {
                            number: 2,
                            votes: 10,
                        },
                        CandidateVotes {
                            number: 3,
                            votes: 8,
                        },
                    ],
                },
            ],
        };

        let results = vec![(ps1, ps1_votes), (ps2, ps2_votes)];
        let totals = ModelNa31_2Summary::from_results(&election, &results).unwrap();

        // check recounted polling stations list is complete
        assert_eq!(totals.recounted_polling_stations, vec![37]);

        // check values in the differences counts
        assert_eq!(totals.differences_counts.more_ballots_count.count, 1);
        // should be ps1 number in here
        assert_eq!(
            totals
                .differences_counts
                .more_ballots_count
                .polling_stations,
            vec![34]
        );
        assert_eq!(totals.differences_counts.fewer_ballots_count.count, 2);
        // should be ps2 number in here
        assert_eq!(
            totals
                .differences_counts
                .fewer_ballots_count
                .polling_stations,
            vec![37]
        );

        // this field should not have any recorded polling stations
        assert_eq!(totals.differences_counts.no_explanation_count.count, 0);
        assert!(totals
            .differences_counts
            .no_explanation_count
            .polling_stations
            .is_empty());

        // tests for voters counts
        assert_eq!(totals.voters_counts.total_admitted_voters_count, 85);
        assert_eq!(totals.voters_counts.poll_card_count, 59);
        assert_eq!(totals.voters_counts.proxy_certificate_count, 6);
        assert_eq!(totals.voters_counts.voter_card_count, 20);

        // tests for votes counts
        assert_eq!(totals.votes_counts.total_votes_cast_count, 84);
        assert_eq!(totals.votes_counts.votes_candidates_counts, 77);
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
}
