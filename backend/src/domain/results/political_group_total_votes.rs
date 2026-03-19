use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::count::Count;
use crate::domain::{
    compare::Compare,
    election::{ElectionWithPoliticalGroups, PGNumber},
    field_path::FieldPath,
    validate::{DataError, Validate, ValidationResults},
};

#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
#[serde(deny_unknown_fields)]
pub struct PoliticalGroupTotalVotes {
    #[schema(value_type = u32)]
    pub number: PGNumber,
    #[schema(value_type = u32)]
    pub total: Count,
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

impl Validate for Vec<PoliticalGroupTotalVotes> {
    fn validate(
        &self,
        election: &ElectionWithPoliticalGroups,
        validation_results: &mut ValidationResults,
        path: &FieldPath,
    ) -> Result<(), DataError> {
        // check if the list of political group total votes has the correct length
        if election.political_groups.len() != self.len() {
            return Err(DataError::new(
                "list of political group total votes does not have correct length",
            ));
        }

        // check each political group total votes
        let mut previous_number = PGNumber::from(0);
        for (i, pgv) in self.iter().enumerate() {
            let number = pgv.number;
            if number <= previous_number {
                return Err(DataError::new(
                    "political group total votes numbers are not increasing",
                ));
            }
            previous_number = number;

            pgv.total
                .validate(election, validation_results, &path.index(i).field("total"))?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use test_log::test;

    use super::*;
    use crate::domain::{
        election::{CandidateNumber, tests::election_fixture},
        results::political_group_candidate_votes::{CandidateVotes, PoliticalGroupCandidateVotes},
    };

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

        let election = election_fixture(
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
            &mut validation_results,
            &"political_group_votes".into(),
        );

        assert!(result.is_err());
        assert!(
            result
                .unwrap_err()
                .message
                .eq("list of political groups does not have correct length"),
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
            &mut validation_results,
            &"political_group_votes".into(),
        );

        assert!(result.is_err());
    }
}
