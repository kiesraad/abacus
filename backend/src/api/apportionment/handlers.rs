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
    domain::{election::ElectionId, summary::ElectionSummary},
    repository::{committee_session_repo, data_entry_repo, election_repo},
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
    let current_committee_session =
        committee_session_repo::get_election_committee_session(&mut conn, election.id).await?;

    if data_entry_repo::are_results_complete_for_committee_session(
        &mut conn,
        current_committee_session.id,
    )
    .await?
    {
        let results = data_entry_repo::list_results_for_committee_session(
            &mut conn,
            current_committee_session.id,
        )
        .await?;

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

#[cfg(test)]
mod tests {
    use axum::{
        http::StatusCode,
        response::{IntoResponse, Response},
    };
    use http_body_util::BodyExt;
    use sqlx::SqlitePool;
    use test_log::test;

    use super::*;
    use crate::{
        domain::role::Role,
        error::ErrorReference,
        repository::user_repo::{User, UserId},
    };

    async fn get_election_apportionment(pool: SqlitePool, election_id: ElectionId) -> Response {
        let user = User::test_user(Role::CoordinatorGSB, UserId::from(1));

        election_apportionment(
            CoordinatorGSB(user.clone()),
            State(pool.clone()),
            AuditService::new(Some(user), None),
            Path(election_id),
        )
        .await
        .into_response()
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_5_with_results"))))]
    async fn test_election_apportionment(pool: SqlitePool) {
        let response = get_election_apportionment(pool.clone(), ElectionId::from(5)).await;
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_4"))))]
    async fn test_election_apportionment_not_complete(pool: SqlitePool) {
        let response = get_election_apportionment(pool.clone(), ElectionId::from(4)).await;
        assert_eq!(response.status(), StatusCode::PRECONDITION_FAILED);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: ErrorResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(
            result.reference,
            ErrorReference::ApportionmentNotAvailableUntilDataEntryFinalised
        );
    }
}
