use axum::{
    Json,
    extract::{Path, State},
};
use serde::Serialize;
use sqlx::SqlitePool;

use crate::{
    APIError, ErrorResponse,
    api::{
        apportionment::{
            ApportionmentApiError,
            mapping::{map_candidate_nomination, map_seat_assignment},
            structs::{ApportionmentInputData, ElectionApportionmentResponse},
        },
        election::ElectionAuditData,
    },
    audit_log::AuditService,
    domain::{
        committee_session_status::CommitteeSessionStatus,
        election::{Election, ElectionId},
        summary::ElectionSummary,
    },
    infra::audit_log::{AsAuditEvent, AuditEventLevel, AuditEventType},
    repository::{committee_session_repo, data_entry_repo, election_repo, user_repo::User},
};

#[derive(Serialize)]
pub struct ApportionmentProcessed(pub ElectionAuditData);
impl AsAuditEvent for ApportionmentProcessed {
    const EVENT_TYPE: AuditEventType = AuditEventType::ApportionmentProcessed;
    const EVENT_LEVEL: AuditEventLevel = AuditEventLevel::Success;
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
)]
pub async fn election_apportionment(
    user: User,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path(id): Path<ElectionId>,
) -> Result<Json<ElectionApportionmentResponse>, APIError> {
    let mut conn = pool.acquire().await?;

    let election = election_repo::get(&mut conn, id).await?;
    user.role().is_authorized(&election.committee_category)?;

    let current_committee_session =
        committee_session_repo::get_election_committee_session(&mut conn, election.id).await?;

    if current_committee_session.status == CommitteeSessionStatus::Completed {
        let results = data_entry_repo::list_results_for_committee_session(
            &mut conn,
            current_committee_session.id,
        )
        .await?;

        let summary = ElectionSummary::from_results(&election, &results)?;
        let input = ApportionmentInputData {
            number_of_seats: election.number_of_seats,
            list_votes: &summary.political_group_votes,
        };
        let result = apportionment::process(&input)?;

        audit_service
            .log(
                &mut conn,
                &ApportionmentProcessed(Election::from(election.clone()).into()),
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
        Err(ApportionmentApiError::CommitteeSessionNotCompleted.into())
    }
}

#[cfg(test)]
mod tests {
    use axum::{
        extract::{Path, State},
        http::StatusCode,
        response::{IntoResponse, Response},
    };
    use http_body_util::BodyExt;
    use sqlx::SqlitePool;
    use test_log::test;

    use super::*;
    use crate::{
        domain::{committee_session::CommitteeSessionId, role::Role},
        error::ErrorReference,
        repository::user_repo::{User, UserId},
        service::change_committee_session_status,
    };

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_5_with_results"))))]
    async fn test_election_apportionment(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();

        let user = User::test_user(Role::CoordinatorGSB, UserId::from(1));
        let audit_service = AuditService::new(Some(user.clone()), None);

        change_committee_session_status(
            &mut conn,
            CommitteeSessionId::from(6),
            CommitteeSessionStatus::Completed,
            audit_service.clone(),
        )
        .await
        .unwrap();

        let response = super::election_apportionment(
            user,
            State(pool),
            audit_service,
            Path(ElectionId::from(5)),
        )
        .await
        .into_response();

        assert_eq!(response.status(), StatusCode::OK);
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_4"))))]
    async fn test_election_apportionment_not_complete(pool: SqlitePool) {
        let user = User::test_user(Role::CoordinatorGSB, UserId::from(1));
        let audit_service = AuditService::new(Some(user.clone()), None);

        let response = super::election_apportionment(
            user,
            State(pool),
            audit_service,
            Path(ElectionId::from(4)),
        )
        .await
        .into_response();

        assert_eq!(response.status(), StatusCode::PRECONDITION_FAILED);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: ErrorResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(
            result.reference,
            ErrorReference::ApportionmentCommitteeSessionNotCompleted
        );
    }

    mod authorization {
        use test_log::test;

        use super::*;
        use crate::api::tests::{
            assert_committee_category_authorization_err, assert_committee_category_authorization_ok,
        };

        async fn call_handlers(
            pool: SqlitePool,
            coordinator_role: Role,
        ) -> Vec<(&'static str, Response)> {
            let user = User::test_user(coordinator_role, UserId::from(1));
            let audit = AuditService::new(Some(user.clone()), None);

            #[rustfmt::skip]
            let results = vec![
                ("apportionment", election_apportionment(user.clone(), State(pool.clone()), audit.clone(), Path(ElectionId::from(5))).await.into_response()),
            ];
            results
        }

        #[test(sqlx::test(fixtures(
            path = "../../../fixtures",
            scripts("election_5_with_results")
        )))]
        async fn test_committee_category_authorization_err(pool: SqlitePool) {
            let results = call_handlers(pool, Role::CoordinatorCSB).await;
            assert_committee_category_authorization_err(results).await;
        }

        #[test(sqlx::test(fixtures(
            path = "../../../fixtures",
            scripts("election_5_with_results")
        )))]
        async fn test_committee_category_authorization_ok(pool: SqlitePool) {
            let results = call_handlers(pool, Role::CoordinatorGSB).await;
            assert_committee_category_authorization_ok(results);
        }
    }
}
