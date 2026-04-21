use serde::{Deserialize, Serialize};

use crate::{
    APIError,
    domain::{
        apportionment::{CandidateNomination, ListCandidateNomination},
        election::{Candidate, ElectionWithPoliticalGroups, PGNumber, PoliticalGroup},
        results::{count::Count, political_group_candidate_votes::CandidateVotes},
    },
};

#[derive(Debug, Serialize, Deserialize)]
pub struct EnrichedCandidateNomination(Vec<EnrichedListCandidateNomination>);

impl EnrichedCandidateNomination {
    pub fn new(
        election: &ElectionWithPoliticalGroups,
        candidate_nomination: &CandidateNomination,
    ) -> Result<Self, APIError> {
        Ok(EnrichedCandidateNomination(
            election
                .political_groups
                .iter()
                .map(|pg| {
                    EnrichedListCandidateNomination::new(
                        pg.clone(),
                        candidate_nomination.list_candidate_nomination.iter().find(|cn| cn.list_number == pg.number).ok_or(APIError::DataIntegrityError(format!(
                            "No list candidate nomination found for political group number {} in candidate nomination", pg.number
                        )))?,
                    )
                })
                .collect::<Result<Vec<_>, _>>()?,
        ))
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EnrichedListCandidateNomination {
    /// Political group number
    list_number: PGNumber,
    /// Political group display name
    list_name: String,
    /// Political group seats
    list_seats: u32,
    /// Columns with seat, votes, and details per preferentially chosen candidate
    preferential_nomination_columns: Vec<CandidateWithSeatTableColumn>,
    /// Columns with seat, votes, and details per other chosen candidate
    other_nomination_columns: Vec<CandidateWithSeatTableColumn>,
    /// Updated candidate ranking or original candidate ranking if not updated
    updated_candidate_ranking: Vec<Candidate>,
}

impl EnrichedListCandidateNomination {
    fn get_candidate_with_seat_table_columns(
        list_candidates: &[Candidate],
        candidate_votes: &[CandidateVotes],
        start_seat_number: usize,
    ) -> Result<Vec<CandidateWithSeatTableColumn>, APIError> {
        let mut columns = Vec::new();

        for (idx, chosen_candidate) in candidate_votes.iter().enumerate() {
            let candidate = list_candidates
                .iter()
                .find(|candidate| candidate.number == chosen_candidate.number)
                .ok_or(APIError::DataIntegrityError(format!(
                    "No candidate found for candidate number {} in political group candidates",
                    chosen_candidate.number
                )))?;
            columns.push(CandidateWithSeatTableColumn {
                list_seat_number: start_seat_number + idx,
                candidate: candidate.clone(),
                votes: chosen_candidate.votes,
            })
        }
        Ok(columns)
    }

    pub fn new(
        group: PoliticalGroup,
        list_candidate_nomination: &ListCandidateNomination,
    ) -> Result<Self, APIError> {
        let preferential_nomination_columns = Self::get_candidate_with_seat_table_columns(
            &group.candidates,
            &list_candidate_nomination.preferential_candidate_nomination,
            1,
        )?;
        let other_nomination_columns = Self::get_candidate_with_seat_table_columns(
            &group.candidates,
            &list_candidate_nomination.other_candidate_nomination,
            preferential_nomination_columns.len() + 1,
        )?;

        Ok(Self {
            list_number: list_candidate_nomination.list_number,
            list_name: list_candidate_nomination.list_name.clone(),
            list_seats: list_candidate_nomination.list_seats,
            preferential_nomination_columns,
            other_nomination_columns,
            updated_candidate_ranking: if list_candidate_nomination
                .updated_candidate_ranking
                .is_empty()
            {
                group.candidates
            } else {
                list_candidate_nomination.updated_candidate_ranking.clone()
            },
        })
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CandidateWithSeatTableColumn {
    /// Seat number candidate received
    list_seat_number: usize,
    /// Candidate
    candidate: Candidate,
    /// Number of votes
    votes: Count,
}
