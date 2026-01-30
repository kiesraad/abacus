use apportionment::{
    ApportionmentError, ApportionmentInput, CandidateNominationResult, CandidateVotesTrait,
    ListVotesTrait, SeatAssignmentResult,
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
        election::{ElectionId, ElectionWithPoliticalGroups},
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
pub struct ElectionPoliticalGroupSummary {
    pub election: ElectionWithPoliticalGroups,
    pub summary: ElectionSummary,
}

impl ApportionmentInput for ElectionPoliticalGroupSummary {
    type List = PoliticalGroupCandidateVotes;

    fn number_of_seats(&self) -> u32 {
        self.election.number_of_seats
    }

    fn total_votes(&self) -> u32 {
        self.summary.votes_counts.total_votes_candidates_count
    }

    fn list_votes(&self) -> &[Self::List] {
        &self.summary.political_group_votes
    }
}

impl ListVotesTrait for PoliticalGroupCandidateVotes {
    type Cv = CandidateVotes;

    fn number(&self) -> u32 {
        *self.number
    }

    fn total(&self) -> u32 {
        self.total
    }

    fn candidate_votes(&self) -> &[Self::Cv] {
        &self.candidate_votes
    }
}

impl CandidateVotesTrait for CandidateVotes {
    fn number(&self) -> u32 {
        *self.number
    }

    fn votes(&self) -> u32 {
        self.votes
    }
}

// TODO: fix dead code
#[derive(Debug, Serialize, ToSchema)]
#[allow(dead_code)]
struct ElectionApportionmentResponse {
    // TODO: newtype these fields
    #[serde(skip)]
    #[schema(value_type = Object)]
    pub seat_assignment: SeatAssignmentResult,
    #[serde(skip)]
    #[schema(value_type = Object)]
    pub candidate_nomination: CandidateNominationResult,
    pub summary: ElectionSummary,
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

        let input = ElectionPoliticalGroupSummary {
            election: election.clone(),
            summary: ElectionSummary::from_results(&election, &results)?,
        };

        let result = apportionment::process(input.clone())?;

        audit_service
            .log(
                &mut conn,
                &AuditEvent::ApportionmentCreated(election.clone().into()),
                None,
            )
            .await?;

        // TODO: this data needs to be enriched, see below
        let result = ElectionApportionmentResponse {
            seat_assignment: result.seat_assignment,
            candidate_nomination: result.candidate_nomination,
            summary: input.summary,
        };

        Ok(Json(result))
    } else {
        Err(APIError::Apportionment(
            ApportionmentError::ApportionmentNotAvailableUntilDataEntryFinalised,
        ))
    }
}

// TODO: We need to enrich the data:
//  - result.seat_assignment
//  Add list name for each list
//  - result.candidate_nomination.chosen_candidates
//  Enrichment means mapping the candidate number per list to the original full candidate information
//  Then the list of chosen candidates needs to be sorted alphabetically on last name
//  pub fn sort_candidates_on_last_name_alphabetically(
//      mut candidates: Vec<Candidate>,
//  ) -> Vec<Candidate> {
//      candidates.sort_by(|a, b| a.last_name.cmp(&b.last_name));
//      candidates
//  }
//  /// Test for function sort_candidates_on_last_name_alphabetically
//  #[test]
//  fn test_sort_candidates_on_last_name_alphabetically() {
//      let names = ["Duin", "Korte", "Appel", "Zee", "Groen"];
//      let candidates: Vec<Candidate> = (0..5)
//          .map(|i| Candidate {
//              number: i + 1,
//              initials: "A.B.".to_string(),
//              first_name: Some(format!("Candidate {}", i + 1)),
//              last_name_prefix: if (i % 2) == 0 {
//                  Some("van".to_string())
//              } else {
//                  None
//              },
//              last_name: names[i as usize].to_string(),
//              locality: "Juinen".to_string(),
//              country_code: Some("NL".to_string()),
//              gender: Some(X),
//          })
//          .collect();
//      let sorted_candidates = sort_candidates_on_last_name_alphabetically(candidates);
//      assert_eq!(candidate_numbers(&sorted_candidates), vec![3, 1, 5, 2, 4]);
//  }
