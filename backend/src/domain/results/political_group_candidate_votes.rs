use crate::{
    APIError,
    domain::{
        compare::Compare,
        election::{CandidateNumber, ElectionWithPoliticalGroups, PGNumber},
        field_path::FieldPath,
        polling_station::PollingStation,
        results::count::Count,
        validate::{DataError, Validate, ValidationResults},
    },
    error::ErrorReference,
};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

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
