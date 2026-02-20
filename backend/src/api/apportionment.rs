use std::collections::HashMap;

use apportionment::{
    ApportionmentError, ApportionmentInput, CandidateNominationResult, CandidateVotesTrait,
    ListVotesTrait, PreferenceThreshold, SeatAssignmentResult,
};
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
        election::{Candidate, CandidateNumber, ElectionId, PGNumber, PoliticalGroup},
        status::DataEntryStatusName,
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

        let result = ElectionApportionmentResponse {
            seat_assignment: result.seat_assignment,
            candidate_nomination: map_candidate_nomination(
                result.candidate_nomination,
                election.political_groups,
            ),
            summary,
        };
        tracing::debug!("Apportionment response: {:?}", result);

        Ok(Json(result))
    } else {
        Err(APIError::Apportionment(
            ApportionmentError::ApportionmentNotAvailableUntilDataEntryFinalised,
        ))
    }
}

#[derive(Debug, Serialize, ToSchema)]
struct ElectionApportionmentResponse {
    pub seat_assignment: SeatAssignmentResult<PoliticalGroupCandidateVotes>,
    pub candidate_nomination: CandidateNominationResponse,
    pub summary: ElectionSummary,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct CandidateNominationResponse {
    pub preference_threshold: PreferenceThreshold,
    pub chosen_candidates: Vec<Candidate>,
    pub list_candidate_nomination: Vec<ListCandidateNominationResponse>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ListCandidateNominationResponse {
    pub list_number: PGNumber,
    pub list_name: String,
    pub list_seats: u32,
    pub preferential_candidate_nomination: Vec<CandidateVotes>,
    pub other_candidate_nomination: Vec<CandidateVotes>,
    pub updated_candidate_ranking: Vec<Candidate>,
}

/// Maps the apportionment output with candidate and list information
fn map_candidate_nomination(
    nomination: CandidateNominationResult<'_, PoliticalGroupCandidateVotes>,
    political_groups: Vec<PoliticalGroup>,
) -> CandidateNominationResponse {
    // Build lookups political_groups
    let mut list_names: HashMap<PGNumber, String> = HashMap::new();
    let mut candidate_map: HashMap<(PGNumber, CandidateNumber), Candidate> = HashMap::new();
    for list in political_groups {
        list_names.insert(list.number, list.name);

        for candidate in list.candidates {
            candidate_map.insert((list.number, candidate.number), candidate);
        }
    }

    // Map chosen_candidates
    let mut chosen_candidates: Vec<Candidate> = nomination
        .chosen_candidates
        .iter()
        .map(|c| candidate_map[&(c.list_number, c.candidate_number)].clone())
        .collect();

    // Sort chosen_candidates on last_name
    chosen_candidates.sort_by(|a, b| a.last_name.cmp(&b.last_name));

    // Map list_names and candidates
    let list_candidate_nomination: Vec<ListCandidateNominationResponse> = nomination
        .list_candidate_nomination
        .into_iter()
        .map(|lcn| ListCandidateNominationResponse {
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
                .map(|cn| candidate_map[&(lcn.list_number, *cn)].clone())
                .collect(),
        })
        .collect();

    CandidateNominationResponse {
        preference_threshold: nomination.preference_threshold,
        chosen_candidates,
        list_candidate_nomination,
    }
}
