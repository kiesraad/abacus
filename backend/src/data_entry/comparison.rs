use super::{
    CandidateVotes, Count, CountingDifferencesPollingStation, DifferencesCounts,
    ExtraInvestigation, FieldPath, PoliticalGroupCandidateVotes, PoliticalGroupTotalVotes,
    PollingStationResults, VotersCounts, VotesCounts, YesNo,
};

pub trait Compare {
    fn compare(&self, first_entry: &Self, different_fields: &mut Vec<String>, path: &FieldPath);
}

impl Compare for PollingStationResults {
    fn compare(&self, first_entry: &Self, different_fields: &mut Vec<String>, path: &FieldPath) {
        self.extra_investigation.compare(
            &first_entry.extra_investigation,
            different_fields,
            &path.field("extra_investigation"),
        );

        self.counting_differences_polling_station.compare(
            &first_entry.counting_differences_polling_station,
            different_fields,
            &path.field("counting_differences_polling_station"),
        );

        self.voters_counts.compare(
            &first_entry.voters_counts,
            different_fields,
            &path.field("voters_counts"),
        );

        self.votes_counts.compare(
            &first_entry.votes_counts,
            different_fields,
            &path.field("votes_counts"),
        );

        self.differences_counts.compare(
            &first_entry.differences_counts,
            different_fields,
            &path.field("differences_counts"),
        );

        self.political_group_votes.compare(
            &first_entry.political_group_votes,
            different_fields,
            &path.field("political_group_votes"),
        );
    }
}

impl Compare for ExtraInvestigation {
    fn compare(&self, first_entry: &Self, different_fields: &mut Vec<String>, path: &FieldPath) {
        self.extra_investigation_other_reason.compare(
            &first_entry.extra_investigation_other_reason,
            different_fields,
            &path.field("extra_investigation_other_reason"),
        );

        self.ballots_recounted_extra_investigation.compare(
            &first_entry.ballots_recounted_extra_investigation,
            different_fields,
            &path.field("ballots_recounted_extra_investigation"),
        );
    }
}

impl Compare for CountingDifferencesPollingStation {
    fn compare(&self, first_entry: &Self, different_fields: &mut Vec<String>, path: &FieldPath) {
        self.unexplained_difference_ballots_voters.compare(
            &first_entry.unexplained_difference_ballots_voters,
            different_fields,
            &path.field("unexplained_difference_ballots_voters"),
        );

        self.difference_ballots_per_list.compare(
            &first_entry.difference_ballots_per_list,
            different_fields,
            &path.field("difference_ballots_per_list"),
        );
    }
}

impl Compare for YesNo {
    fn compare(&self, first_entry: &Self, different_fields: &mut Vec<String>, path: &FieldPath) {
        self.yes
            .compare(&first_entry.yes, different_fields, &path.field("yes"));

        self.no
            .compare(&first_entry.no, different_fields, &path.field("no"));
    }
}

impl Compare for bool {
    fn compare(
        &self,
        first_entry: &Self,
        different_fields: &mut Vec<String>,
        field_name: &FieldPath,
    ) {
        if self != first_entry {
            different_fields.push(field_name.to_string());
        }
    }
}

impl Compare for Count {
    fn compare(
        &self,
        first_entry: &Self,
        different_fields: &mut Vec<String>,
        field_name: &FieldPath,
    ) {
        if self != first_entry {
            different_fields.push(field_name.to_string());
        }
    }
}

impl Compare for VotersCounts {
    fn compare(&self, first_entry: &Self, different_fields: &mut Vec<String>, path: &FieldPath) {
        // compare all counts
        self.poll_card_count.compare(
            &first_entry.poll_card_count,
            different_fields,
            &path.field("poll_card_count"),
        );
        self.proxy_certificate_count.compare(
            &first_entry.proxy_certificate_count,
            different_fields,
            &path.field("proxy_certificate_count"),
        );
        self.total_admitted_voters_count.compare(
            &first_entry.total_admitted_voters_count,
            different_fields,
            &path.field("total_admitted_voters_count"),
        );
    }
}

impl Compare for VotesCounts {
    fn compare(&self, first_entry: &Self, different_fields: &mut Vec<String>, path: &FieldPath) {
        self.political_group_total_votes.compare(
            &first_entry.political_group_total_votes,
            different_fields,
            &path.field("political_group_total_votes"),
        );

        // compare all counts
        self.total_votes_candidates_count.compare(
            &first_entry.total_votes_candidates_count,
            different_fields,
            &path.field("total_votes_candidates_count"),
        );
        self.blank_votes_count.compare(
            &first_entry.blank_votes_count,
            different_fields,
            &path.field("blank_votes_count"),
        );
        self.invalid_votes_count.compare(
            &first_entry.invalid_votes_count,
            different_fields,
            &path.field("invalid_votes_count"),
        );
        self.total_votes_cast_count.compare(
            &first_entry.total_votes_cast_count,
            different_fields,
            &path.field("total_votes_cast_count"),
        );
    }
}

impl Compare for Vec<PoliticalGroupTotalVotes> {
    fn compare(&self, first_entry: &Self, different_fields: &mut Vec<String>, path: &FieldPath) {
        // compare total of each political group
        for (i, pgv) in self.iter().enumerate() {
            pgv.total.compare(
                &first_entry[i].total,
                different_fields,
                &path.index(i).field("total"),
            );
        }
    }
}

impl Compare for DifferencesCounts {
    fn compare(&self, first_entry: &Self, different_fields: &mut Vec<String>, path: &FieldPath) {
        // compare all counts
        self.more_ballots_count.compare(
            &first_entry.more_ballots_count,
            different_fields,
            &path.field("more_ballots_count"),
        );
        self.fewer_ballots_count.compare(
            &first_entry.fewer_ballots_count,
            different_fields,
            &path.field("fewer_ballots_count"),
        );
        self.unreturned_ballots_count.compare(
            &first_entry.unreturned_ballots_count,
            different_fields,
            &path.field("unreturned_ballots_count"),
        );
        self.too_few_ballots_handed_out_count.compare(
            &first_entry.too_few_ballots_handed_out_count,
            different_fields,
            &path.field("too_few_ballots_handed_out_count"),
        );
        self.too_many_ballots_handed_out_count.compare(
            &first_entry.too_many_ballots_handed_out_count,
            different_fields,
            &path.field("too_many_ballots_handed_out_count"),
        );
        self.other_explanation_count.compare(
            &first_entry.other_explanation_count,
            different_fields,
            &path.field("other_explanation_count"),
        );
        self.no_explanation_count.compare(
            &first_entry.no_explanation_count,
            different_fields,
            &path.field("no_explanation_count"),
        );
    }
}

impl Compare for Vec<PoliticalGroupCandidateVotes> {
    fn compare(&self, first_entry: &Self, different_fields: &mut Vec<String>, path: &FieldPath) {
        // compare each political group
        for (i, pgv) in self.iter().enumerate() {
            pgv.compare(&first_entry[i], different_fields, &path.index(i));
        }
    }
}

impl Compare for PoliticalGroupCandidateVotes {
    fn compare(&self, first_entry: &Self, different_fields: &mut Vec<String>, path: &FieldPath) {
        // compare all candidates
        for (i, cv) in self.candidate_votes.iter().enumerate() {
            cv.compare(
                &first_entry.candidate_votes[i],
                different_fields,
                &path.field("candidate_votes").index(i),
            );
        }

        // compare the total number of votes
        self.total
            .compare(&first_entry.total, different_fields, &path.field("total"));
    }
}

impl Compare for CandidateVotes {
    fn compare(&self, first_entry: &Self, different_fields: &mut Vec<String>, path: &FieldPath) {
        self.votes
            .compare(&first_entry.votes, different_fields, &path.field("votes"))
    }
}

#[cfg(test)]
mod tests {
    use test_log::test;

    use super::*;

    /// Tests that polling station results with equal data and no differences counts are correctly identified as equal.
    #[test]
    fn test_equal_no_differences_counts() {
        let mut different_fields: Vec<String> = vec![];
        let first_entry = PollingStationResults {
            extra_investigation: Default::default(),
            counting_differences_polling_station: Default::default(),
            voters_counts: VotersCounts {
                poll_card_count: 103,
                proxy_certificate_count: 2,
                total_admitted_voters_count: 105,
            },
            votes_counts: VotesCounts {
                political_group_total_votes: vec![PoliticalGroupTotalVotes {
                    number: 1,
                    total: 100,
                }],
                total_votes_candidates_count: 100,
                blank_votes_count: 3,
                invalid_votes_count: 2,
                total_votes_cast_count: 105,
            },
            differences_counts: DifferencesCounts::zero(),
            political_group_votes: vec![PoliticalGroupCandidateVotes::from_test_data_auto(
                1,
                &[100],
            )],
        };
        let second_entry = first_entry.clone();
        second_entry.compare(
            &first_entry,
            &mut different_fields,
            &"polling_station_results".into(),
        );
        assert_eq!(different_fields.len(), 0);
    }

    /// Tests that polling station results with equal data and with differences counts are correctly identified as equal.
    #[test]
    fn test_equal_with_differences_counts() {
        let mut different_fields: Vec<String> = vec![];
        let first_entry = PollingStationResults {
            extra_investigation: Default::default(),
            counting_differences_polling_station: Default::default(),
            voters_counts: VotersCounts {
                poll_card_count: 103,
                proxy_certificate_count: 2,
                total_admitted_voters_count: 105,
            },
            votes_counts: VotesCounts {
                political_group_total_votes: vec![PoliticalGroupTotalVotes {
                    number: 1,
                    total: 100,
                }],
                total_votes_candidates_count: 100,
                blank_votes_count: 1,
                invalid_votes_count: 2,
                total_votes_cast_count: 103,
            },
            differences_counts: DifferencesCounts {
                more_ballots_count: 0,
                fewer_ballots_count: 2,
                unreturned_ballots_count: 0,
                too_few_ballots_handed_out_count: 0,
                too_many_ballots_handed_out_count: 0,
                other_explanation_count: 2,
                no_explanation_count: 0,
            },
            political_group_votes: vec![PoliticalGroupCandidateVotes::from_test_data_auto(
                1,
                &[100],
            )],
        };
        let second_entry = first_entry.clone();
        second_entry.compare(
            &first_entry,
            &mut different_fields,
            &"polling_station_results".into(),
        );
        assert_eq!(different_fields.len(), 0);
    }

    /// Tests that polling station results with equal data and no differences counts are correctly identified as equal.
    #[test]
    fn test_equal_no_differences_counts_variant() {
        let mut different_fields = vec![];
        let first_entry = PollingStationResults {
            extra_investigation: Default::default(),
            counting_differences_polling_station: Default::default(),
            voters_counts: VotersCounts {
                poll_card_count: 103,
                proxy_certificate_count: 2,
                total_admitted_voters_count: 105,
            },
            votes_counts: VotesCounts {
                political_group_total_votes: vec![PoliticalGroupTotalVotes {
                    number: 1,
                    total: 100,
                }],
                total_votes_candidates_count: 100,
                blank_votes_count: 2,
                invalid_votes_count: 2,
                total_votes_cast_count: 104,
            },
            differences_counts: DifferencesCounts::zero(),
            political_group_votes: vec![PoliticalGroupCandidateVotes::from_test_data_auto(
                1,
                &[100],
            )],
        };
        let second_entry = first_entry.clone();
        second_entry.compare(
            &first_entry,
            &mut different_fields,
            &"polling_station_results".into(),
        );
        assert_eq!(different_fields.len(), 0);
    }

    /// Tests that polling station results with equal data and with differences counts are correctly identified as equal.
    #[test]
    fn test_equal_with_differences_counts_variant() {
        let mut different_fields = vec![];
        let first_entry = PollingStationResults {
            extra_investigation: Default::default(),
            counting_differences_polling_station: Default::default(),
            voters_counts: VotersCounts {
                poll_card_count: 103,
                proxy_certificate_count: 2,
                total_admitted_voters_count: 105,
            },
            votes_counts: VotesCounts {
                political_group_total_votes: vec![PoliticalGroupTotalVotes {
                    number: 1,
                    total: 100,
                }],
                total_votes_candidates_count: 100,
                blank_votes_count: 2,
                invalid_votes_count: 3,
                total_votes_cast_count: 105,
            },
            differences_counts: DifferencesCounts {
                more_ballots_count: 1,
                fewer_ballots_count: 0,
                unreturned_ballots_count: 0,
                too_few_ballots_handed_out_count: 0,
                too_many_ballots_handed_out_count: 1,
                other_explanation_count: 0,
                no_explanation_count: 0,
            },
            political_group_votes: vec![PoliticalGroupCandidateVotes::from_test_data_auto(
                1,
                &[100],
            )],
        };
        let second_entry = first_entry.clone();
        second_entry.compare(
            &first_entry,
            &mut different_fields,
            &"polling_station_results".into(),
        );
        assert_eq!(different_fields.len(), 0);
    }

    /// Tests that polling station results with voters count differences are correctly identified as not equal.
    #[test]
    fn test_not_equal_voters_counts_differences() {
        let mut different_fields: Vec<String> = vec![];
        let first_entry = PollingStationResults {
            extra_investigation: Default::default(),
            counting_differences_polling_station: Default::default(),
            voters_counts: VotersCounts {
                poll_card_count: 100,
                proxy_certificate_count: 2,
                total_admitted_voters_count: 105,
            },
            votes_counts: VotesCounts {
                political_group_total_votes: vec![PoliticalGroupTotalVotes {
                    number: 1,
                    total: 100,
                }],
                total_votes_candidates_count: 100,
                blank_votes_count: 3,
                invalid_votes_count: 2,
                total_votes_cast_count: 105,
            },
            differences_counts: DifferencesCounts::zero(),
            political_group_votes: vec![PoliticalGroupCandidateVotes::from_test_data_auto(
                1,
                &[100],
            )],
        };
        let mut second_entry = first_entry.clone();
        second_entry.voters_counts.poll_card_count = 101;
        second_entry.voters_counts.total_admitted_voters_count = 106;
        second_entry.compare(
            &first_entry,
            &mut different_fields,
            &"polling_station_results".into(),
        );
        assert_eq!(different_fields.len(), 2);
        assert_eq!(
            different_fields[0],
            "polling_station_results.voters_counts.poll_card_count"
        );
        assert_eq!(
            different_fields[1],
            "polling_station_results.voters_counts.total_admitted_voters_count"
        );
    }

    /// Tests that polling station results with differences in differences counts are correctly identified as not equal.
    #[test]
    fn test_not_equal_differences_counts_differences() {
        let mut different_fields: Vec<String> = vec![];
        let first_entry = PollingStationResults {
            extra_investigation: Default::default(),
            counting_differences_polling_station: Default::default(),
            voters_counts: VotersCounts {
                poll_card_count: 100,
                proxy_certificate_count: 2,
                total_admitted_voters_count: 105,
            },
            votes_counts: VotesCounts {
                political_group_total_votes: vec![PoliticalGroupTotalVotes {
                    number: 1,
                    total: 100,
                }],
                total_votes_candidates_count: 100,
                blank_votes_count: 1,
                invalid_votes_count: 2,
                total_votes_cast_count: 103,
            },
            differences_counts: DifferencesCounts {
                more_ballots_count: 0,
                fewer_ballots_count: 2,
                unreturned_ballots_count: 0,
                too_few_ballots_handed_out_count: 0,
                too_many_ballots_handed_out_count: 0,
                other_explanation_count: 2,
                no_explanation_count: 0,
            },
            political_group_votes: vec![PoliticalGroupCandidateVotes::from_test_data_auto(
                1,
                &[100],
            )],
        };
        let mut second_entry = first_entry.clone();
        second_entry.differences_counts = DifferencesCounts {
            more_ballots_count: 0,
            fewer_ballots_count: 2,
            unreturned_ballots_count: 0,
            too_few_ballots_handed_out_count: 1,
            too_many_ballots_handed_out_count: 0,
            other_explanation_count: 0,
            no_explanation_count: 1,
        };
        second_entry.compare(
            &first_entry,
            &mut different_fields,
            &"polling_station_results".into(),
        );
        assert_eq!(different_fields.len(), 3);
        assert_eq!(
            different_fields[0],
            "polling_station_results.differences_counts.too_few_ballots_handed_out_count"
        );
        assert_eq!(
            different_fields[1],
            "polling_station_results.differences_counts.other_explanation_count"
        );
        assert_eq!(
            different_fields[2],
            "polling_station_results.differences_counts.no_explanation_count"
        );
    }

    /// Tests that polling station results with differences in both voters counts and votes counts are correctly identified as not equal.
    #[test]
    fn test_not_equal_voters_counts_and_votes_counts_differences() {
        let mut different_fields = vec![];
        let first_entry = PollingStationResults {
            extra_investigation: Default::default(),
            counting_differences_polling_station: Default::default(),
            voters_counts: VotersCounts {
                poll_card_count: 103,
                proxy_certificate_count: 2,
                total_admitted_voters_count: 105,
            },
            votes_counts: VotesCounts {
                political_group_total_votes: vec![PoliticalGroupTotalVotes {
                    number: 1,
                    total: 100,
                }],
                total_votes_candidates_count: 100,
                blank_votes_count: 2,
                invalid_votes_count: 2,
                total_votes_cast_count: 104,
            },
            differences_counts: DifferencesCounts::zero(),
            political_group_votes: vec![PoliticalGroupCandidateVotes::from_test_data_auto(
                1,
                &[100],
            )],
        };
        let mut second_entry = first_entry.clone();
        second_entry.voters_counts = VotersCounts {
            poll_card_count: 101,
            proxy_certificate_count: 1,
            total_admitted_voters_count: 102,
        };
        second_entry.votes_counts = VotesCounts {
            political_group_total_votes: vec![PoliticalGroupTotalVotes {
                number: 1,
                total: 101,
            }],
            total_votes_candidates_count: 101,
            blank_votes_count: 1,
            invalid_votes_count: 1,
            total_votes_cast_count: 103,
        };
        second_entry.compare(
            &first_entry,
            &mut different_fields,
            &"polling_station_results".into(),
        );
        assert_eq!(different_fields.len(), 8);
        assert_eq!(
            different_fields[0],
            "polling_station_results.voters_counts.poll_card_count"
        );
        assert_eq!(
            different_fields[1],
            "polling_station_results.voters_counts.proxy_certificate_count"
        );
        assert_eq!(
            different_fields[2],
            "polling_station_results.voters_counts.total_admitted_voters_count"
        );
        assert_eq!(
            different_fields[3],
            "polling_station_results.votes_counts.political_group_total_votes[0].total"
        );
        assert_eq!(
            different_fields[4],
            "polling_station_results.votes_counts.total_votes_candidates_count"
        );
        assert_eq!(
            different_fields[5],
            "polling_station_results.votes_counts.blank_votes_count"
        );
        assert_eq!(
            different_fields[6],
            "polling_station_results.votes_counts.invalid_votes_count"
        );
        assert_eq!(
            different_fields[7],
            "polling_station_results.votes_counts.total_votes_cast_count"
        );
    }

    /// Tests that polling station results with differences in political group votes are correctly identified as not equal.
    #[test]
    fn test_not_equal_political_group_votes_differences() {
        let mut different_fields = vec![];
        let first_entry = PollingStationResults {
            extra_investigation: Default::default(),
            counting_differences_polling_station: Default::default(),
            voters_counts: VotersCounts {
                poll_card_count: 103,
                proxy_certificate_count: 2,
                total_admitted_voters_count: 105,
            },
            votes_counts: VotesCounts {
                political_group_total_votes: vec![
                    PoliticalGroupTotalVotes {
                        number: 1,
                        total: 100,
                    },
                    PoliticalGroupTotalVotes {
                        number: 2,
                        total: 0,
                    },
                ],
                total_votes_candidates_count: 100,
                blank_votes_count: 2,
                invalid_votes_count: 3,
                total_votes_cast_count: 105,
            },
            differences_counts: DifferencesCounts {
                more_ballots_count: 1,
                fewer_ballots_count: 0,
                unreturned_ballots_count: 0,
                too_few_ballots_handed_out_count: 0,
                too_many_ballots_handed_out_count: 1,
                other_explanation_count: 0,
                no_explanation_count: 0,
            },
            political_group_votes: vec![
                PoliticalGroupCandidateVotes::from_test_data_auto(1, &[100, 0]),
                PoliticalGroupCandidateVotes::from_test_data_auto(2, &[0]),
            ],
        };
        let mut second_entry = first_entry.clone();
        second_entry.political_group_votes = vec![
            PoliticalGroupCandidateVotes::from_test_data_auto(1, &[50, 30]),
            PoliticalGroupCandidateVotes::from_test_data_auto(2, &[20]),
        ];
        second_entry.compare(
            &first_entry,
            &mut different_fields,
            &"polling_station_results".into(),
        );
        assert_eq!(different_fields.len(), 5);
        assert_eq!(
            different_fields[0],
            "polling_station_results.political_group_votes[0].candidate_votes[0].votes"
        );
        assert_eq!(
            different_fields[1],
            "polling_station_results.political_group_votes[0].candidate_votes[1].votes"
        );
        assert_eq!(
            different_fields[2],
            "polling_station_results.political_group_votes[0].total"
        );
        assert_eq!(
            different_fields[3],
            "polling_station_results.political_group_votes[1].candidate_votes[0].votes"
        );
        assert_eq!(
            different_fields[4],
            "polling_station_results.political_group_votes[1].total"
        );
    }
}
