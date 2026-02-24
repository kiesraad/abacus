use std::collections::HashMap;

use apportionment::{ApportionmentError, ApportionmentInput, CandidateVotesTrait, ListVotesTrait};
use axum::{
    Json,
    extract::{Path, State},
};
use serde::Serialize;
use sqlx::SqlitePool;
use utoipa::ToSchema;
use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{
    APIError, AppState, ErrorResponse,
    api::middleware::authentication::Coordinator,
    audit_log::{AuditEvent, AuditService},
    domain::{
        data_entry::{CandidateVotes, PoliticalGroupCandidateVotes},
        data_entry_status::DataEntryStatusName,
        display_fraction::DisplayFraction,
        election::{Candidate, CandidateNumber, ElectionId, PGNumber, PoliticalGroup},
        summary::ElectionSummary,
    },
    repository::{
        committee_session_repo::get_election_committee_session,
        data_entry_repo::{list_results_for_committee_session, statuses},
        election_repo,
    },
};

impl From<ApportionmentError> for APIError {
    fn from(err: ApportionmentError) -> Self {
        APIError::Apportionment(err)
    }
}

pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::default().routes(routes!(election_apportionment))
}

#[derive(Clone, Debug)]
pub struct ApportionmentInputData {
    pub number_of_seats: u32,
    pub list_votes: Vec<PoliticalGroupCandidateVotes>,
}

impl ApportionmentInput for ApportionmentInputData {
    type List = PoliticalGroupCandidateVotes;

    fn number_of_seats(&self) -> u32 {
        self.number_of_seats
    }

    fn list_votes(&self) -> &[Self::List] {
        &self.list_votes
    }
}

impl ListVotesTrait for PoliticalGroupCandidateVotes {
    type Cv = CandidateVotes;
    type ListNumber = PGNumber;

    fn number(&self) -> Self::ListNumber {
        self.number
    }

    fn candidate_votes(&self) -> &[Self::Cv] {
        &self.candidate_votes
    }
}

impl CandidateVotesTrait for CandidateVotes {
    type CandidateNumber = CandidateNumber;

    fn number(&self) -> Self::CandidateNumber {
        self.number
    }

    fn votes(&self) -> u32 {
        self.votes
    }
}

/// Get the apportionment for an election
#[utoipa::path(
    post,
    path = "/api/elections/{election_id}/apportionment",
    responses(
        (status = 200, description = "Election Apportionment", body = ElectionApportionmentResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "Not found", body = ErrorResponse),
        (status = 412, description = "Election apportionment is not yet available", body = ErrorResponse),
        (status = 422, description = "Election apportionment is not possible", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = u32, description = "Election database id"),
    ),
    security(("cookie_auth" = ["coordinator"])),
)]
async fn election_apportionment(
    _user: Coordinator,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path(id): Path<ElectionId>,
) -> Result<Json<ElectionApportionmentResponse>, APIError> {
    let mut conn = pool.acquire().await?;
    let election = election_repo::get(&mut conn, id).await?;
    let current_committee_session = get_election_committee_session(&mut conn, election.id).await?;
    let statuses = statuses(&mut conn, current_committee_session.id).await?;

    // Committee session must have all data entries as definitive
    // Or, if this is a next session, no (corrected) data entries
    if (!statuses.is_empty()
        && statuses
            .iter()
            .all(|s| s.status == DataEntryStatusName::Definitive))
        || (current_committee_session.number > 1 && statuses.is_empty())
    {
        let results =
            list_results_for_committee_session(&mut conn, current_committee_session.id).await?;

        let summary = ElectionSummary::from_results(&election, &results)?;
        let input = ApportionmentInputData {
            number_of_seats: election.number_of_seats,
            list_votes: summary.political_group_votes.clone(),
        };
        let result = apportionment::process(&input)?;

        audit_service
            .log(
                &mut conn,
                &AuditEvent::ApportionmentCreated(election.clone().into()),
                None,
            )
            .await?;

        Ok(Json(ElectionApportionmentResponse {
            seat_assignment: map_seat_assignment(result.seat_assignment),
            candidate_nomination: map_candidate_nomination(
                result.candidate_nomination,
                election.political_groups,
            ),
            summary,
        }))
    } else {
        Err(APIError::Apportionment(
            ApportionmentError::ApportionmentNotAvailableUntilDataEntryFinalised,
        ))
    }
}

#[derive(Debug, Serialize, ToSchema)]
struct ElectionApportionmentResponse {
    pub seat_assignment: SeatAssignment,
    pub candidate_nomination: CandidateNomination,
    pub summary: ElectionSummary,
}

#[derive(Debug, Serialize, ToSchema)]
struct SeatAssignment {
    pub seats: u32,
    pub full_seats: u32,
    pub residual_seats: u32,
    pub quota: DisplayFraction,
    pub steps: Vec<SeatChangeStep>,
    pub final_standing: Vec<ListSeatAssignment>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct SeatChangeStep {
    pub residual_seat_number: Option<u32>,
    pub change: SeatChange,
    pub standings: Vec<ListStanding>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(deny_unknown_fields, tag = "changed_by")]
pub enum SeatChange {
    HighestAverageAssignment(HighestAverageAssignedSeat),
    UniqueHighestAverageAssignment(HighestAverageAssignedSeat),
    LargestRemainderAssignment(LargestRemainderAssignedSeat),
    AbsoluteMajorityReassignment(AbsoluteMajorityReassignedSeat),
    ListExhaustionRemoval(ListExhaustionRemovedSeat),
}

#[derive(Debug, Serialize, ToSchema)]
pub struct HighestAverageAssignedSeat {
    pub selected_list_number: PGNumber,
    pub list_options: Vec<PGNumber>,
    pub list_assigned: Vec<PGNumber>,
    pub list_exhausted: Vec<PGNumber>,
    pub votes_per_seat: DisplayFraction,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct LargestRemainderAssignedSeat {
    pub selected_list_number: PGNumber,
    pub list_options: Vec<PGNumber>,
    pub list_assigned: Vec<PGNumber>,
    pub remainder_votes: DisplayFraction,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct AbsoluteMajorityReassignedSeat {
    pub list_retracted_seat: PGNumber,
    pub list_assigned_seat: PGNumber,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ListExhaustionRemovedSeat {
    pub list_retracted_seat: PGNumber,
    pub full_seat: bool,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ListStanding {
    pub list_number: PGNumber,
    pub votes_cast: u64,
    pub remainder_votes: DisplayFraction,
    pub meets_remainder_threshold: bool,
    pub next_votes_per_seat: DisplayFraction,
    pub full_seats: u32,
    pub residual_seats: u32,
}

#[derive(Debug, Serialize, ToSchema)]
struct ListSeatAssignment {
    pub list_number: PGNumber,
    pub votes_cast: u64,
    pub remainder_votes: DisplayFraction,
    pub meets_remainder_threshold: bool,
    pub full_seats: u32,
    pub residual_seats: u32,
    pub total_seats: u32,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct CandidateNomination {
    pub preference_threshold: PreferenceThreshold,
    pub chosen_candidates: Vec<Candidate>,
    pub list_candidate_nomination: Vec<ListCandidateNomination>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct PreferenceThreshold {
    pub percentage: u64,
    pub number_of_votes: DisplayFraction,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ListCandidateNomination {
    pub list_number: PGNumber,
    pub list_name: String,
    pub list_seats: u32,
    pub preferential_candidate_nomination: Vec<CandidateVotes>,
    pub other_candidate_nomination: Vec<CandidateVotes>,
    pub updated_candidate_ranking: Vec<Candidate>,
}

impl From<apportionment::SeatChange<PGNumber>> for SeatChange {
    fn from(change: apportionment::SeatChange<PGNumber>) -> Self {
        use apportionment::SeatChange::*;

        let as_highest_avg =
            |c: apportionment::HighestAverageAssignedSeat<PGNumber>| HighestAverageAssignedSeat {
                selected_list_number: c.selected_list_number,
                list_options: c.list_options,
                list_assigned: c.list_assigned,
                list_exhausted: c.list_exhausted,
                votes_per_seat: DisplayFraction::from(c.votes_per_seat),
            };

        match change {
            HighestAverageAssignment(c) => SeatChange::HighestAverageAssignment(as_highest_avg(c)),
            UniqueHighestAverageAssignment(c) => {
                SeatChange::UniqueHighestAverageAssignment(as_highest_avg(c))
            }
            LargestRemainderAssignment(c) => {
                SeatChange::LargestRemainderAssignment(LargestRemainderAssignedSeat {
                    selected_list_number: c.selected_list_number,
                    list_options: c.list_options,
                    list_assigned: c.list_assigned,
                    remainder_votes: DisplayFraction::from(c.remainder_votes),
                })
            }
            AbsoluteMajorityReassignment(c) => {
                SeatChange::AbsoluteMajorityReassignment(AbsoluteMajorityReassignedSeat {
                    list_retracted_seat: c.list_retracted_seat,
                    list_assigned_seat: c.list_assigned_seat,
                })
            }
            ListExhaustionRemoval(c) => {
                SeatChange::ListExhaustionRemoval(ListExhaustionRemovedSeat {
                    list_retracted_seat: c.list_retracted_seat,
                    full_seat: c.full_seat,
                })
            }
        }
    }
}

impl From<apportionment::SeatChangeStep<PGNumber>> for SeatChangeStep {
    fn from(step: apportionment::SeatChangeStep<PGNumber>) -> Self {
        SeatChangeStep {
            residual_seat_number: step.residual_seat_number,
            change: step.change.into(),
            standings: step
                .standings
                .into_iter()
                .map(|standing| ListStanding {
                    list_number: standing.list_number,
                    votes_cast: standing.votes_cast,
                    remainder_votes: DisplayFraction::from(standing.remainder_votes),
                    meets_remainder_threshold: standing.meets_remainder_threshold,
                    next_votes_per_seat: DisplayFraction::from(standing.next_votes_per_seat),
                    full_seats: standing.full_seats,
                    residual_seats: standing.residual_seats,
                })
                .collect(),
        }
    }
}

fn map_seat_assignment(
    sa: apportionment::SeatAssignmentResult<PoliticalGroupCandidateVotes>,
) -> SeatAssignment {
    SeatAssignment {
        seats: sa.seats,
        full_seats: sa.full_seats,
        residual_seats: sa.residual_seats,
        quota: DisplayFraction::from(sa.quota),
        steps: sa.steps.into_iter().map(Into::into).collect(),
        final_standing: sa
            .final_standing
            .into_iter()
            .map(|standing| ListSeatAssignment {
                list_number: standing.list_number,
                votes_cast: standing.votes_cast,
                remainder_votes: DisplayFraction::from(standing.remainder_votes),
                meets_remainder_threshold: standing.meets_remainder_threshold,
                full_seats: standing.full_seats,
                residual_seats: standing.residual_seats,
                total_seats: standing.total_seats,
            })
            .collect(),
    }
}

fn map_candidate_nomination(
    cn: apportionment::CandidateNominationResult<'_, PoliticalGroupCandidateVotes>,
    political_groups: Vec<PoliticalGroup>,
) -> CandidateNomination {
    let mut list_names: HashMap<PGNumber, String> = HashMap::new();
    let mut candidate_map: HashMap<(PGNumber, CandidateNumber), Candidate> = HashMap::new();
    for list in political_groups {
        for candidate in &list.candidates {
            candidate_map.insert((list.number, candidate.number), candidate.clone());
        }
        list_names.insert(list.number, list.name);
    }

    let mut chosen_candidates: Vec<Candidate> = cn
        .chosen_candidates
        .iter()
        .map(|c| candidate_map[&(c.list_number, c.candidate_number)].clone())
        .collect();
    chosen_candidates.sort_by(|a, b| a.last_name.cmp(&b.last_name));

    let list_candidate_nomination = cn
        .list_candidate_nomination
        .into_iter()
        .map(|lcn| ListCandidateNomination {
            list_number: lcn.list_number,
            list_name: list_names
                .remove(&lcn.list_number)
                .expect("list must exist in election data"),
            list_seats: lcn.list_seats,
            preferential_candidate_nomination: lcn
                .preferential_candidate_nomination
                .into_iter()
                .copied()
                .collect(),
            other_candidate_nomination: lcn
                .other_candidate_nomination
                .into_iter()
                .copied()
                .collect(),
            updated_candidate_ranking: lcn
                .updated_candidate_ranking
                .iter()
                .map(|num| candidate_map[&(lcn.list_number, *num)].clone())
                .collect(),
        })
        .collect();

    let threshold = cn.preference_threshold;
    CandidateNomination {
        preference_threshold: PreferenceThreshold {
            percentage: threshold.percentage,
            number_of_votes: DisplayFraction::from(threshold.number_of_votes),
        },
        chosen_candidates,
        list_candidate_nomination,
    }
}
