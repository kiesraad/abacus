use super::{
    CandidateVotes, Count, DifferencesCounts, FieldPath, PoliticalGroupVotes,
    PollingStationResults, VotersCounts, VotesCounts,
};

pub trait Compare {
    fn compare(&self, first_entry: &Self, different_fields: &mut Vec<String>, path: &FieldPath);
}

impl Compare for PollingStationResults {
    fn compare(
        &self,
        first_entry: &PollingStationResults,
        different_fields: &mut Vec<String>,
        path: &FieldPath,
    ) {
        if self.recounted != first_entry.recounted {
            different_fields.push(path.field("recounted").to_string());
        }

        self.votes_counts.compare(
            &first_entry.votes_counts,
            different_fields,
            &path.field("votes_counts"),
        );

        if let Some(voters_recounts) = &self.voters_recounts {
            let voters_recounts_path = path.field("voters_recounts");
            if let Some(first_entry_voters_recounts) = &first_entry.voters_recounts {
                voters_recounts.compare(
                    first_entry_voters_recounts,
                    different_fields,
                    &voters_recounts_path,
                );
            } else {
                different_fields.push(voters_recounts_path.field("poll_card_count").to_string());
                different_fields.push(
                    voters_recounts_path
                        .field("proxy_certificate_count")
                        .to_string(),
                );
                different_fields.push(voters_recounts_path.field("voter_card_count").to_string());
                different_fields.push(
                    voters_recounts_path
                        .field("total_admitted_voters_count")
                        .to_string(),
                );
            }
        } else {
            // TODO: How do we show the difference if the 2nd data entry doesn't have voters_recounts,
            //  but the first data entry does? Of course the warning will also show on
            //  the recounted page in this case, is this sufficient?
        }
        self.voters_counts.compare(
            &first_entry.voters_counts,
            different_fields,
            &path.field("voters_counts"),
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
        self.voter_card_count.compare(
            &first_entry.voter_card_count,
            different_fields,
            &path.field("voter_card_count"),
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
        // compare all counts
        self.votes_candidates_count.compare(
            &first_entry.votes_candidates_count,
            different_fields,
            &path.field("votes_candidates_count"),
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

impl Compare for Vec<PoliticalGroupVotes> {
    fn compare(&self, first_entry: &Self, different_fields: &mut Vec<String>, path: &FieldPath) {
        // compare each political group
        for (i, pgv) in self.iter().enumerate() {
            pgv.compare(&first_entry[i], different_fields, &path.index(i));
        }
    }
}

impl Compare for PoliticalGroupVotes {
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

    #[test]
    fn test_polling_station_results_comparison_equal_recounted_false_no_differences() {
        let mut different_fields: Vec<String> = vec![];
        let first_entry = PollingStationResults {
            recounted: Some(false),
            voters_counts: VotersCounts {
                poll_card_count: 100,
                proxy_certificate_count: 2,
                voter_card_count: 3,
                total_admitted_voters_count: 105,
            },
            votes_counts: VotesCounts {
                votes_candidates_count: 100,
                blank_votes_count: 3,
                invalid_votes_count: 2,
                total_votes_cast_count: 105,
            },
            voters_recounts: None,
            differences_counts: DifferencesCounts::zero(),
            political_group_votes: vec![PoliticalGroupVotes::from_test_data_auto(1, &[100])],
        };
        let second_entry = first_entry.clone();
        second_entry.compare(
            &first_entry,
            &mut different_fields,
            &"polling_station_results".into(),
        );
        assert_eq!(different_fields.len(), 0);
    }

    #[test]
    fn test_polling_station_results_comparison_equal_recounted_false_with_differences() {
        let mut different_fields: Vec<String> = vec![];
        let first_entry = PollingStationResults {
            recounted: Some(false),
            voters_counts: VotersCounts {
                poll_card_count: 100,
                proxy_certificate_count: 2,
                voter_card_count: 3,
                total_admitted_voters_count: 105,
            },
            votes_counts: VotesCounts {
                votes_candidates_count: 100,
                blank_votes_count: 1,
                invalid_votes_count: 2,
                total_votes_cast_count: 103,
            },
            voters_recounts: None,
            differences_counts: DifferencesCounts {
                more_ballots_count: 0,
                fewer_ballots_count: 2,
                unreturned_ballots_count: 0,
                too_few_ballots_handed_out_count: 0,
                too_many_ballots_handed_out_count: 0,
                other_explanation_count: 2,
                no_explanation_count: 0,
            },
            political_group_votes: vec![PoliticalGroupVotes::from_test_data_auto(1, &[100])],
        };
        let second_entry = first_entry.clone();
        second_entry.compare(
            &first_entry,
            &mut different_fields,
            &"polling_station_results".into(),
        );
        assert_eq!(different_fields.len(), 0);
    }

    #[test]
    fn test_polling_station_results_comparison_equal_recounted_true_no_differences() {
        let mut different_fields = vec![];
        let first_entry = PollingStationResults {
            recounted: Some(true),
            voters_counts: VotersCounts {
                poll_card_count: 100,
                proxy_certificate_count: 2,
                voter_card_count: 3,
                total_admitted_voters_count: 105,
            },
            votes_counts: VotesCounts {
                votes_candidates_count: 100,
                blank_votes_count: 2,
                invalid_votes_count: 2,
                total_votes_cast_count: 104,
            },
            voters_recounts: Some(VotersCounts {
                poll_card_count: 100,
                proxy_certificate_count: 2,
                voter_card_count: 2,
                total_admitted_voters_count: 104,
            }),
            differences_counts: DifferencesCounts::zero(),
            political_group_votes: vec![PoliticalGroupVotes::from_test_data_auto(1, &[100])],
        };
        let second_entry = first_entry.clone();
        second_entry.compare(
            &first_entry,
            &mut different_fields,
            &"polling_station_results".into(),
        );
        println!("{:?}", different_fields);
        assert_eq!(different_fields.len(), 0);
    }

    #[test]
    fn test_polling_station_results_comparison_equal_recounted_true_with_differences() {
        let mut different_fields = vec![];
        let first_entry = PollingStationResults {
            recounted: Some(true),
            voters_counts: VotersCounts {
                poll_card_count: 100,
                proxy_certificate_count: 2,
                voter_card_count: 3,
                total_admitted_voters_count: 105,
            },
            votes_counts: VotesCounts {
                votes_candidates_count: 100,
                blank_votes_count: 2,
                invalid_votes_count: 3,
                total_votes_cast_count: 105,
            },
            voters_recounts: Some(VotersCounts {
                poll_card_count: 100,
                proxy_certificate_count: 2,
                voter_card_count: 2,
                total_admitted_voters_count: 104,
            }),
            differences_counts: DifferencesCounts {
                more_ballots_count: 1,
                fewer_ballots_count: 0,
                unreturned_ballots_count: 0,
                too_few_ballots_handed_out_count: 0,
                too_many_ballots_handed_out_count: 1,
                other_explanation_count: 0,
                no_explanation_count: 0,
            },
            political_group_votes: vec![PoliticalGroupVotes::from_test_data_auto(1, &[100])],
        };
        let second_entry = first_entry.clone();
        second_entry.compare(
            &first_entry,
            &mut different_fields,
            &"polling_station_results".into(),
        );
        println!("{:?}", different_fields);
        assert_eq!(different_fields.len(), 0);
    }
}
