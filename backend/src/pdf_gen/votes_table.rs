use std::slice::Iter;

use serde::{Deserialize, Serialize};

use crate::{
    APIError,
    data_entry::domain::polling_station_results::{
        common_polling_station_results::CommonPollingStationResults, count::Count,
        political_group_candidate_votes::PoliticalGroupCandidateVotes,
    },
    election::domain::{
        Candidate, CandidateNumber, ElectionWithPoliticalGroups, PGNumber, PoliticalGroup,
    },
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
    political_group_number: PGNumber,
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
    candidate_number: CandidateNumber,
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
    fn get_votes_table_columns(
        candidate_iterator: &mut Iter<Candidate>,
        candidate_votes: Option<&PoliticalGroupCandidateVotes>,
        previous_candidate_votes: Option<&PoliticalGroupCandidateVotes>,
        column_sizes: [usize; 4],
    ) -> Result<Vec<VotesTableColumn>, APIError> {
        let mut columns = Vec::new();

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
        Ok(columns)
    }

    pub fn new(
        group: &PoliticalGroup,
        candidate_votes: Option<&PoliticalGroupCandidateVotes>,
        previous_candidate_votes: Option<&PoliticalGroupCandidateVotes>,
        column_sizes: [usize; 4],
    ) -> Result<Self, APIError> {
        let mut candidate_iterator = group.candidates.iter();
        let columns = Self::get_votes_table_columns(
            &mut candidate_iterator,
            candidate_votes,
            previous_candidate_votes,
            column_sizes,
        )?;

        // sanity check: there should not be more candidates than expected in political group
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

#[cfg(test)]
mod tests {
    use chrono::NaiveDate;

    use super::*;
    use crate::{
        data_entry::domain::polling_station_results::political_group_candidate_votes,
        election::domain::{ElectionCategory, ElectionId, VoteCountingMethod},
    };

    fn sample_candidate(number: CandidateNumber) -> Candidate {
        Candidate {
            number,
            initials: "A.B.".to_string(),
            first_name: None,
            last_name_prefix: None,
            last_name: format!("Kandidaat {number}"),
            locality: "Juinen".to_string(),
            country_code: None,
            gender: None,
        }
    }

    fn sample_group(number: u32, candidate_numbers: &[u32]) -> PoliticalGroup {
        PoliticalGroup {
            number: PGNumber::from(number),
            name: format!("Partij {number}"),
            candidates: candidate_numbers
                .iter()
                .map(|&candidate_number| sample_candidate(CandidateNumber::from(candidate_number)))
                .collect(),
        }
    }

    fn sample_election(group: PoliticalGroup) -> ElectionWithPoliticalGroups {
        ElectionWithPoliticalGroups {
            id: ElectionId::from(1),
            name: "Test election".to_string(),
            counting_method: VoteCountingMethod::CSO,
            election_id: "Test_2025".to_string(),
            location: "Test locatie".to_string(),
            domain_id: "0000".to_string(),
            category: ElectionCategory::Municipal,
            number_of_seats: 1,
            number_of_voters: 1000,
            election_date: NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
            nomination_date: NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
            political_groups: vec![group],
        }
    }

    fn make_candidate_votes(
        group_number: u32,
        total: Count,
        entries: &[(u32, Count)],
    ) -> PoliticalGroupCandidateVotes {
        PoliticalGroupCandidateVotes {
            number: PGNumber::from(group_number),
            total,
            candidate_votes: entries
                .iter()
                .map(
                    |&(candidate_number, votes)| political_group_candidate_votes::CandidateVotes {
                        number: CandidateNumber::from(candidate_number),
                        votes,
                    },
                )
                .collect(),
        }
    }

    #[test]
    fn votes_tables_fails_when_group_missing_in_summary() {
        let group = sample_group(1, &[1]);
        let election = sample_election(group);
        let summary = ElectionSummary::zero();

        let err = VotesTables::new(&election, &summary).unwrap_err();

        match err {
            APIError::DataIntegrityError(message) => {
                assert_eq!(
                    message,
                    "No votes found for political group number 1 in summary"
                );
            }
            other => panic!("expected DataIntegrityError, got {other:?}"),
        }
    }

    #[test]
    fn votes_table_fails_when_candidate_votes_missing() {
        let group = sample_group(1, &[1]);
        let candidate_votes = make_candidate_votes(1, 10, &[(2, 10)]);

        let err = VotesTable::new(
            &group,
            Some(&candidate_votes),
            None,
            DEFAULT_CANDIDATES_PER_COLUMN,
        )
        .unwrap_err();

        match err {
            APIError::DataIntegrityError(message) => {
                assert_eq!(
                    message,
                    "No votes found for candidate number 1 in political group 1"
                );
            }
            other => panic!("expected DataIntegrityError, got {other:?}"),
        }
    }

    #[test]
    fn votes_table_calculates_totals_correctly() {
        let group = sample_group(1, &[1, 2, 3]);
        let candidate_votes = make_candidate_votes(1, 21, &[(1, 5), (2, 7), (3, 9)]);
        let previous_candidate_votes = make_candidate_votes(1, 18, &[(1, 4), (2, 6), (3, 8)]);

        let table = VotesTable::new(
            &group,
            Some(&candidate_votes),
            Some(&previous_candidate_votes),
            DEFAULT_CANDIDATES_PER_COLUMN,
        )
        .expect("VotesTable::new should succeed when totals match the candidate sums");

        assert_eq!(table.total, Some(21));
        assert_eq!(table.previous_total, Some(18));
        assert_eq!(table.columns.len(), 1);

        let column = &table.columns[0];
        assert_eq!(column.column_total, Some(21));
        assert_eq!(column.previous_column_total, Some(18));
        assert_eq!(column.votes.len(), 3);

        let expected = [(1, 5, 4), (2, 7, 6), (3, 9, 8)];
        for (candidate_vote, (number, votes, previous_votes)) in column.votes.iter().zip(expected) {
            assert_eq!(
                candidate_vote.candidate.number,
                CandidateNumber::from(number)
            );
            assert_eq!(candidate_vote.votes, Some(votes));
            assert_eq!(candidate_vote.previous_votes, Some(previous_votes));
        }
    }

    #[test]
    fn votes_table_fails_when_too_many_candidates() {
        let group = sample_group(1, &[1, 2]);

        let err = VotesTable::new(&group, None, None, [1, 0, 0, 0]).unwrap_err();

        match err {
            APIError::DataIntegrityError(message) => {
                assert_eq!(
                    message,
                    "More candidates than expected in political group 1"
                );
            }
            other => panic!("expected DataIntegrityError, got {other:?}"),
        }
    }

    #[test]
    fn votes_table_fails_when_column_totals_exceed_group_total() {
        let group = sample_group(1, &[1, 2]);
        let candidate_votes = make_candidate_votes(1, 20, &[(1, 12), (2, 15)]);

        let err = VotesTable::new(
            &group,
            Some(&candidate_votes),
            None,
            DEFAULT_CANDIDATES_PER_COLUMN,
        )
        .unwrap_err();

        match err {
            APIError::DataIntegrityError(message) => {
                assert_eq!(
                    message,
                    "Sum of column totals (27) exceeds total votes (20) for political group 1"
                );
            }
            other => panic!("expected DataIntegrityError, got {other:?}"),
        }
    }

    #[test]
    fn votes_table_fails_when_previous_totals_exceed_group_total() {
        let group = sample_group(1, &[1, 2]);
        let previous_candidate_votes = make_candidate_votes(1, 20, &[(1, 12), (2, 15)]);

        let err = VotesTable::new(
            &group,
            None,
            Some(&previous_candidate_votes),
            DEFAULT_CANDIDATES_PER_COLUMN,
        )
        .unwrap_err();

        match err {
            APIError::DataIntegrityError(message) => {
                assert_eq!(
                    message,
                    "Sum of previous column totals (27) exceeds previous total votes (20) for political group 1"
                );
            }
            other => panic!("expected DataIntegrityError, got {other:?}"),
        }
    }
}
