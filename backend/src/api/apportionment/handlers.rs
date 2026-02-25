use apportionment::ApportionmentError;
use axum::{
    Json,
    extract::{Path, State},
};
use sqlx::SqlitePool;

use crate::{
    APIError, ErrorResponse,
    api::{
        apportionment::{
            mapping::{map_candidate_nomination, map_seat_assignment},
            structs::{
                ApportionmentCreated, ApportionmentInputData, ElectionApportionmentResponse,
            },
        },
        middleware::authentication::CoordinatorGSB,
    },
    audit_log::AuditService,
    domain::{
        data_entry_status::DataEntryStatusName, election::ElectionId, summary::ElectionSummary,
    },
    repository::{
        committee_session_repo::get_election_committee_session,
        data_entry_repo::{list_results_for_committee_session, statuses},
        election_repo,
    },
};

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
    security(("cookie_auth" = ["coordinator_gsb"])),
)]
pub async fn election_apportionment(
    _user: CoordinatorGSB,
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
                &ApportionmentCreated(election.clone().into()),
                None,
            )
            .await?;

        Ok(Json(ElectionApportionmentResponse {
            seat_assignment: map_seat_assignment(result.seat_assignment),
            candidate_nomination: map_candidate_nomination(
                result.candidate_nomination,
                election.political_groups,
            ),
            election_summary: summary,
        }))
    } else {
        Err(APIError::Apportionment(
            ApportionmentError::ApportionmentNotAvailableUntilDataEntryFinalised,
        ))
    }
}
