use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::{
    APIError,
    data_entry::domain::{
        compare::Compare,
        field_path::FieldPath,
        polling_station_results::count::Count,
        validate::{DataError, Validate, ValidationResults},
    },
    election::domain::{
        election::{CandidateNumber, ElectionWithPoliticalGroups, PGNumber},
        polling_station::PollingStation,
    },
    error::ErrorReference,
};

#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
#[serde(deny_unknown_fields)]
pub struct PoliticalGroupCandidateVotes {
    #[schema(value_type = u32)]
    pub number: PGNumber,
    #[schema(value_type = u32)]
    pub total: Count,
    pub candidate_votes: Vec<CandidateVotes>,
}

impl PoliticalGroupCandidateVotes {
    pub fn add(&mut self, other: &Self) -> Result<(), APIError> {
        if self.number != other.number {
            return Err(APIError::AddError(
                format!(
                    "Attempted to add votes of group '{}' to '{}'",
                    other.number, self.number
                ),
                ErrorReference::InvalidVoteGroup,
            ));
        }

        self.total += other.total;

        for cv in other.candidate_votes.iter() {
            let Some(found_can) = self
                .candidate_votes
                .iter_mut()
                .find(|c| c.number == cv.number)
            else {
                return Err(APIError::AddError(
                    format!(
                        "Attempted to add candidate '{}' votes in group '{}', but no such candidate exists",
                        cv.number, self.number
                    ),
                    ErrorReference::InvalidVoteCandidate,
                ));
            };
            found_can.votes += cv.votes;
        }

        Ok(())
    }

    /// Create `PoliticalGroupCandidateVotes` from test data with candidate numbers automatically generated starting from 1.
    #[cfg(test)]
    pub fn from_test_data_auto(number: PGNumber, candidate_votes: &[Count]) -> Self {
        PoliticalGroupCandidateVotes {
            number,
            total: candidate_votes.iter().sum(),
            candidate_votes: candidate_votes
                .iter()
                .enumerate()
                .map(|(i, votes)| CandidateVotes {
                    number: CandidateNumber::try_from(i + 1).unwrap(),
                    votes: *votes,
                })
                .collect(),
        }
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

#[derive(Serialize, Deserialize, ToSchema, Clone, Copy, Debug, PartialEq, Eq, Hash)]
#[serde(deny_unknown_fields)]
pub struct CandidateVotes {
    #[schema(value_type = u32)]
    pub number: CandidateNumber,
    #[schema(value_type = u32)]
    pub votes: Count,
}

impl Compare for CandidateVotes {
    fn compare(&self, first_entry: &Self, different_fields: &mut Vec<String>, path: &FieldPath) {
        self.votes
            .compare(&first_entry.votes, different_fields, &path.field("votes"))
    }
}

impl Validate for CandidateVotes {
    fn validate(
        &self,
        election: &ElectionWithPoliticalGroups,
        polling_station: &PollingStation,
        validation_results: &mut ValidationResults,
        path: &FieldPath,
    ) -> Result<(), DataError> {
        self.votes.validate(
            election,
            polling_station,
            validation_results,
            &path.field("votes"),
        )
    }
}

impl Validate for Vec<PoliticalGroupCandidateVotes> {
    fn validate(
        &self,
        election: &ElectionWithPoliticalGroups,
        polling_station: &PollingStation,
        validation_results: &mut ValidationResults,
        path: &FieldPath,
    ) -> Result<(), DataError> {
        // check if the list of political groups has the correct length
        if election.political_groups.len() != self.len() {
            return Err(DataError::new(
                "list of political groups does not have correct length",
            ));
        }

        // check each political group
        let mut previous_number = PGNumber::from(0);
        for (i, pgv) in self.iter().enumerate() {
            let number = pgv.number;
            if number <= previous_number {
                return Err(DataError::new("political group numbers are not increasing"));
            }
            previous_number = number;

            pgv.validate(
                election,
                polling_station,
                validation_results,
                &path.index(i),
            )?;
        }
        Ok(())
    }
}

impl Validate for PoliticalGroupCandidateVotes {
    fn validate(
        &self,
        election: &ElectionWithPoliticalGroups,
        polling_station: &PollingStation,
        validation_results: &mut ValidationResults,
        path: &FieldPath,
    ) -> Result<(), DataError> {
        // check if the list of candidates has the correct length
        let pg = election
            .political_groups
            .iter()
            .find(|pg| pg.number == self.number)
            .ok_or(DataError::new("political group should exist"))?;

        // check if the number of candidates is correct
        if pg.candidates.len() != self.candidate_votes.len() {
            return Err(DataError::new("incorrect number of candidates"));
        }

        // validate all candidates
        let mut prev_number = CandidateNumber::from(0);
        for (i, cv) in self.candidate_votes.iter().enumerate() {
            let number = cv.number;
            if number <= prev_number {
                return Err(DataError::new("candidate numbers are not increasing"));
            }
            prev_number = number;

            cv.validate(
                election,
                polling_station,
                validation_results,
                &path.field("candidate_votes").index(i),
            )?;
        }

        // validate the total number of votes
        self.total.validate(
            election,
            polling_station,
            validation_results,
            &path.field("total"),
        )?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::data_entry::domain::{
        political_group_total_votes::PoliticalGroupTotalVotes,
        polling_station_results::{
            PollingStationResults,
            cso_next_session_results::CSONextSessionResults,
            differences_counts::{
                DifferenceCountsCompareVotesCastAdmittedVoters, DifferencesCounts,
            },
            voters_counts::VotersCounts,
            votes_counts::VotesCounts,
        },
    };

    /// Tests that polling station results with differences in political group votes are correctly identified as not equal.
    #[test]
    #[allow(clippy::too_many_lines)]
    fn test_not_equal_political_group_votes_differences() {
        let mut different_fields = vec![];
        let first_entry = PollingStationResults::CSONextSession(CSONextSessionResults {
            voters_counts: VotersCounts {
                poll_card_count: 103,
                proxy_certificate_count: 2,
                total_admitted_voters_count: 105,
            },
            votes_counts: VotesCounts {
                political_group_total_votes: vec![
                    PoliticalGroupTotalVotes {
                        number: PGNumber::from(1),
                        total: 100,
                    },
                    PoliticalGroupTotalVotes {
                        number: PGNumber::from(2),
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
                compare_votes_cast_admitted_voters:
                    DifferenceCountsCompareVotesCastAdmittedVoters {
                        admitted_voters_equal_votes_cast: Default::default(),
                        votes_cast_greater_than_admitted_voters: Default::default(),
                        votes_cast_smaller_than_admitted_voters: Default::default(),
                    },
                difference_completely_accounted_for: Default::default(),
            },
            political_group_votes: vec![
                PoliticalGroupCandidateVotes::from_test_data_auto(PGNumber::from(1), &[100, 0]),
                PoliticalGroupCandidateVotes::from_test_data_auto(PGNumber::from(2), &[0]),
            ],
        });
        let mut second_entry = first_entry.clone();
        second_entry
            .as_cso_next_session_mut()
            .unwrap()
            .political_group_votes = vec![
            PoliticalGroupCandidateVotes::from_test_data_auto(PGNumber::from(1), &[50, 30]),
            PoliticalGroupCandidateVotes::from_test_data_auto(PGNumber::from(2), &[20]),
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

    /// Takes a list of tuples where each tuple contains:
    /// - Candidate vote counts for the political group
    /// - The total votes for that political group (could be different for test purposes)
    fn create_test_data(
        candidate_votes_and_totals: &[(&[u32], u32)],
    ) -> (
        Vec<PoliticalGroupCandidateVotes>,
        ElectionWithPoliticalGroups,
    ) {
        let political_group_votes = candidate_votes_and_totals
            .iter()
            .enumerate()
            .map(|(index, (candidate_votes, list_total))| {
                let mut pg = PoliticalGroupCandidateVotes::from_test_data_auto(
                    PGNumber::try_from(index + 1).unwrap(),
                    candidate_votes,
                );

                // Set given total instead of summing votes
                pg.total = *list_total;
                pg
            })
            .collect();

        let election = ElectionWithPoliticalGroups::election_fixture(
            &candidate_votes_and_totals
                .iter()
                .map(|(votes, _)| u32::try_from(votes.len()).unwrap())
                .collect::<Vec<_>>(),
        );

        (political_group_votes, election)
    }

    #[test]
    fn test_err_list_incorrect_length() {
        let (political_group_votes, mut election) =
            create_test_data(&[(&[10, 20, 30], 60), (&[5, 10, 15], 30)]);

        // Remove first political group from election
        election.political_groups.remove(0);

        let mut validation_results = ValidationResults::default();
        let result = political_group_votes.validate(
            &election,
            &PollingStation::polling_station_fixture(None),
            &mut validation_results,
            &"political_group_votes".into(),
        );

        assert!(result.is_err());
        assert!(
            result
                .unwrap_err()
                .message
                .eq("list of political groups does not have correct length")
        );
    }

    #[test]
    fn test_ok_political_group_numbers_not_consecutive() {
        let (mut political_group_votes, mut election) =
            create_test_data(&[(&[10, 20, 30], 60), (&[5, 10, 15], 30)]);

        // Change number of the last list
        political_group_votes[1].number = PGNumber::from(3);
        election.political_groups[1].number = PGNumber::from(3);

        let mut validation_results = ValidationResults::default();
        let result: Result<(), DataError> = political_group_votes.validate(
            &election,
            &PollingStation::polling_station_fixture(None),
            &mut validation_results,
            &"political_group_votes".into(),
        );

        assert!(result.is_ok());
    }

    #[test]
    fn test_err_political_group_numbers_not_increasing() {
        let (mut political_group_votes, mut election) =
            create_test_data(&[(&[10, 20, 30], 60), (&[5, 10, 15], 30)]);

        // Change number of the first list
        political_group_votes[0].number = PGNumber::from(3);
        election.political_groups[0].number = PGNumber::from(3);

        let mut validation_results = ValidationResults::default();
        let result: Result<(), DataError> = political_group_votes.validate(
            &election,
            &PollingStation::polling_station_fixture(None),
            &mut validation_results,
            &"political_group_votes".into(),
        );

        assert!(result.is_err());
    }

    #[test]
    fn test_err_incorrect_number_of_candidates() {
        let (mut political_group_votes, election) =
            create_test_data(&[(&[10, 20, 30], 60), (&[5, 10, 15], 30)]);

        // Add one extra candidate to the first list
        political_group_votes[0]
            .candidate_votes
            .push(CandidateVotes {
                number: CandidateNumber::from(4),
                votes: 0,
            });

        let mut validation_results = ValidationResults::default();
        let result = political_group_votes.validate(
            &election,
            &PollingStation::polling_station_fixture(None),
            &mut validation_results,
            &"political_group_votes".into(),
        );

        assert!(result.is_err());
        assert!(
            result
                .unwrap_err()
                .message
                .eq("incorrect number of candidates"),
        );
    }

    #[test]
    fn test_ok_candidate_numbers_not_consecutive() {
        let (mut political_group_votes, election) =
            create_test_data(&[(&[10, 20, 30], 60), (&[5, 10, 15], 30)]);

        // Change number of the last candidate on the first list
        political_group_votes[0].candidate_votes[2].number = CandidateNumber::from(5);

        let mut validation_results = ValidationResults::default();
        let result = political_group_votes.validate(
            &election,
            &PollingStation::polling_station_fixture(None),
            &mut validation_results,
            &"political_group_votes".into(),
        );

        assert!(result.is_ok());
    }

    #[test]
    fn test_err_candidate_numbers_not_increasing() {
        let (mut political_group_votes, election) =
            create_test_data(&[(&[10, 20, 30], 60), (&[5, 10, 15], 30)]);

        // Change number of the second candidate on the first list to a non-increasing number
        political_group_votes[0].candidate_votes[1].number = CandidateNumber::from(1);

        let mut validation_results = ValidationResults::default();
        let result = political_group_votes.validate(
            &election,
            &PollingStation::polling_station_fixture(None),
            &mut validation_results,
            &"political_group_votes".into(),
        );

        assert!(result.is_err());
    }
}
