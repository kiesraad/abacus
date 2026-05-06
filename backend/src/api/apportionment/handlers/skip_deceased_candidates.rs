use axum::extract::{Path, State};
use sqlx::SqlitePool;

use crate::{
    APIError, ErrorResponse, domain::election::ElectionId, infra::audit_log::AuditService,
    repository::user_repo::User, service::update_apportionment_state,
};

/// Skip registering deceased candidates
#[utoipa::path(
    post,
    path = "/api/elections/{election_id}/apportionment/skip_deceased_candidates",
    responses(
        (status = 200, description = "Skipped registering deceased candidates"),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "Not found", body = ErrorResponse),
        (status = 409, description = "Invalid state", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = u32, description = "Election database id"),
    ),
)]
pub async fn skip_deceased_candidates(
    user: User,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path(election_id): Path<ElectionId>,
) -> Result<(), APIError> {
    let mut conn = pool.acquire().await?;

    update_apportionment_state(&mut conn, audit_service, user, election_id, |state| {
        state.skip_deceased_candidates()
    })
    .await
}

#[cfg(test)]
mod tests {
    use test_log::test;

    use super::*;
    use crate::{
        domain::{
            apportionment_state::ApportionmentState, committee_session::CommitteeSessionId,
            committee_session_status::CommitteeSessionStatus, role::Role,
        },
        repository::{apportionment_state_repo, committee_session_repo, user_repo::UserId},
    };

    #[test(sqlx::test(fixtures(
        path = "../../../../fixtures",
        scripts("election_5_with_results")
    )))]
    async fn test_skip_deceased_candidates(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let user = User::test_user(Role::CoordinatorGSB, UserId::from(1));
        let audit_service = AuditService::new(Some(user.clone()), None);
        let id = CommitteeSessionId::from(6);

        committee_session_repo::change_status(&mut conn, id, CommitteeSessionStatus::Completed)
            .await
            .expect("should change committee session status");

        skip_deceased_candidates(user, State(pool), audit_service, Path(ElectionId::from(5)))
            .await
            .expect("should call the handler successfully");

        let state = apportionment_state_repo::get(&mut conn, id)
            .await
            .expect("should succeed")
            .expect("should be the database");

        assert_eq!(
            state,
            ApportionmentState::Finalised {
                deceased_candidates: Vec::new()
            }
        );
    }
}
