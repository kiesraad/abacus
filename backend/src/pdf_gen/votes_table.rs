use serde::{Deserialize, Serialize};

use crate::{
    APIError,
    data_entry::{CommonPollingStationResults, Count, PoliticalGroupCandidateVotes},
    election::{Candidate, ElectionWithPoliticalGroups, PGNumber, PoliticalGroup},
    summary::ElectionSummary,
};

const DEFAULT_CANDIDATES_PER_COLUMN: [usize; 4] = [25, 25, 15, 15];
const JUSTIFIED_CANDIDATES_PER_COLUMN: [usize; 4] = [20, 20, 20, 20];

#[derive(Debug, Serialize, Deserialize)]
pub struct CandidatesTables(Vec<VotesTable>);

impl CandidatesTables {
    pub fn new(election: &ElectionWithPoliticalGroups) -> Result<Self, APIError> {
        Ok(CandidatesTables(
            election
                .political_groups
                .iter()
                .map(|group| VotesTable::new(group, None, None, DEFAULT_CANDIDATES_PER_COLUMN))
                .collect::<Result<Vec<_>, _>>()?,
        ))
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VotesTables(Vec<VotesTable>);

impl VotesTables {
    pub fn new(
        election: &ElectionWithPoliticalGroups,
        summary: &ElectionSummary,
    ) -> Result<Self, APIError> {
        Ok(VotesTables(
            election
                .political_groups
                .iter()
                .map(|group| {
                    let candidate_votes = get_votes_for_political_party(
                        group.number,
                        &summary.political_group_votes,
                    )?;
                    VotesTable::new(
                        group,
                        Some(candidate_votes),
                        None,
                        DEFAULT_CANDIDATES_PER_COLUMN,
                    )
                })
                .collect::<Result<Vec<_>, _>>()?,
        ))
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VotesTablesWithPreviousVotes(Vec<VotesTable>);

impl VotesTablesWithPreviousVotes {
    pub fn new(
        election: &ElectionWithPoliticalGroups,
        summary: &ElectionSummary,
        previous_summary: &ElectionSummary,
    ) -> Result<Self, APIError> {
        Ok(VotesTablesWithPreviousVotes(
            election
                .political_groups
                .iter()
                .map(|group| {
                    let candidate_votes = get_votes_for_political_party(
                        group.number,
                        &summary.political_group_votes,
                    )?;
                    let previous_candidate_votes = get_votes_for_political_party(
                        group.number,
                        &previous_summary.political_group_votes,
                    )?;
                    VotesTable::new(
                        group,
                        Some(candidate_votes),
                        Some(previous_candidate_votes),
                        JUSTIFIED_CANDIDATES_PER_COLUMN,
                    )
                })
                .collect::<Result<Vec<_>, _>>()?,
        ))
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VotesTablesWithOnlyPreviousVotes(Vec<VotesTable>);

impl VotesTablesWithOnlyPreviousVotes {
    pub fn new(
        election: &ElectionWithPoliticalGroups,
        previous: &CommonPollingStationResults,
    ) -> Result<Self, APIError> {
        Ok(VotesTablesWithOnlyPreviousVotes(
            election
                .political_groups
                .iter()
                .map(|group| {
                    let previous_candidate_votes = get_votes_for_political_party(
                        group.number,
                        &previous.political_group_votes,
                    )?;
                    VotesTable::new(
                        group,
                        None,
                        Some(previous_candidate_votes),
                        DEFAULT_CANDIDATES_PER_COLUMN,
                    )
                })
                .collect::<Result<Vec<_>, _>>()?,
        ))
    }
}

fn get_votes_for_political_party(
    political_group_number: u32,
    political_group_votes: &[PoliticalGroupCandidateVotes],
) -> Result<&PoliticalGroupCandidateVotes, APIError> {
    political_group_votes
        .iter()
        .find(|pg_votes| pg_votes.number == political_group_number)
        .ok_or(APIError::DataIntegrityError(format!(
            "No votes found for political group number {political_group_number} in summary",
        )))
}

fn get_votes_for_candidate(
    candidate_number: u32,
    candidate_votes: Option<&PoliticalGroupCandidateVotes>,
) -> Result<Option<Count>, APIError> {
    let Some(candidate_votes) = candidate_votes else {
        return Ok(None);
    };

    let Some(candidate_vote) = candidate_votes
        .candidate_votes
        .iter()
        .find(|cv| cv.number == candidate_number)
    else {
        return Err(APIError::DataIntegrityError(format!(
            "No votes found for candidate number {candidate_number} in political group {}",
            candidate_votes.number,
        )));
    };

    Ok(Some(candidate_vote.votes))
}

#[derive(Debug, Serialize, Deserialize)]
pub(super) struct VotesTable {
    /// Political group number
    number: PGNumber,
    /// Political group name
    name: String,
    /// Total votes for the political group
    total: Option<Count>,
    /// Total previous votes for the political group
    previous_total: Option<Count>,
    /// Columns with votes per candidate
    columns: Vec<VotesTableColumn>,
}

impl VotesTable {
    pub fn new(
        group: &PoliticalGroup,
        candidate_votes: Option<&PoliticalGroupCandidateVotes>,
        previous_candidate_votes: Option<&PoliticalGroupCandidateVotes>,
        column_sizes: [usize; 4],
    ) -> Result<Self, APIError> {
        let mut columns = Vec::new();
        let mut candidate_iterator = group.candidates.iter();

        for max_per_column in &column_sizes {
            let mut column_votes = Vec::new();

            for candidate in candidate_iterator.by_ref().take(*max_per_column) {
                let mut votes = get_votes_for_candidate(candidate.number, candidate_votes)?;
                let previous_votes =
                    get_votes_for_candidate(candidate.number, previous_candidate_votes)?;

                if candidate_votes.is_some() && votes.is_none() {
                    votes = Some(votes.unwrap_or_default())
                }

                column_votes.push(CandidateVotes {
                    candidate: candidate.clone(),
                    votes,
                    previous_votes,
                });
            }

            if column_votes.is_empty() {
                break;
            }

            let column_total = column_votes
                .iter()
                .map(|cv| cv.votes)
                .collect::<Option<Vec<_>>>()
                .map(|votes| votes.into_iter().sum());

            let previous_column_total = column_votes
                .iter()
                .map(|cv| cv.previous_votes)
                .collect::<Option<Vec<_>>>()
                .map(|votes| votes.into_iter().sum());

            columns.push(VotesTableColumn {
                column_total,
                previous_column_total,
                votes: column_votes,
            });
        }

        if candidate_iterator.next().is_some() {
            return Err(APIError::DataIntegrityError(format!(
                "More candidates than expected in political group {}",
                group.number
            )));
        }

        // sanity check: sum of column totals should not exceed total votes for the political group
        if let Some(pg_votes) = candidate_votes {
            let columns_total: Count = columns
                .iter()
                .map(|col| col.column_total.unwrap_or_default())
                .sum();
            if pg_votes.total < columns_total {
                return Err(APIError::DataIntegrityError(format!(
                    "Sum of column totals ({columns_total}) exceeds total votes ({}) for political group {}",
                    pg_votes.total, pg_votes.number,
                )));
            }
        }

        // sanity check: sum of previous column totals should not exceed previous total votes for the political group
        if let Some(prev_pg_votes) = previous_candidate_votes {
            let previous_columns_total: Count = columns
                .iter()
                .map(|col| col.previous_column_total.unwrap_or_default())
                .sum();
            if prev_pg_votes.total < previous_columns_total {
                return Err(APIError::DataIntegrityError(format!(
                    "Sum of previous column totals ({previous_columns_total}) exceeds previous total votes ({}) for political group {}",
                    prev_pg_votes.total, prev_pg_votes.number,
                )));
            }
        }

        Ok(VotesTable {
            number: group.number,
            name: group.name.clone(),
            total: candidate_votes.map(|cv| cv.total),
            previous_total: previous_candidate_votes.map(|pcv| pcv.total),
            columns,
        })
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub(super) struct VotesTableColumn {
    /// Sum of votes in this column
    column_total: Option<Count>,
    /// Sum of previous number of votes in this column
    previous_column_total: Option<Count>,
    /// Votes per candidate in this column
    votes: Vec<CandidateVotes>,
}

#[derive(Debug, Serialize, Deserialize)]
pub(super) struct CandidateVotes {
    /// Candidate information
    candidate: Candidate,
    /// Current number of votes for the candidate
    votes: Option<Count>,
    /// Previous number of votes for the candidate
    previous_votes: Option<Count>,
}
