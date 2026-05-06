use axum::{
    Json,
    extract::{Path, State},
};
use sqlx::SqlitePool;

use crate::{
    APIError, ErrorResponse,
    domain::{apportionment_state::ApportionmentState, election::ElectionId},
    repository::user_repo::User,
    service::get_apportionment_state,
};

/// Get the current apportionment state
#[utoipa::path(
    get,
    path = "/api/elections/{election_id}/apportionment/state",
    responses(
        (status = 200, description = "Returns apportionment state", body = ApportionmentState),
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
pub async fn get_state(
    user: User,
    State(pool): State<SqlitePool>,
    Path(election_id): Path<ElectionId>,
) -> Result<Json<ApportionmentState>, APIError> {
    let mut conn = pool.acquire().await?;

    let (_, state) = get_apportionment_state(&mut conn, user, election_id).await?;

    Ok(Json(state))
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
        repository::{committee_session_repo, user_repo::UserId},
    };

    #[test(sqlx::test(fixtures(
        path = "../../../../fixtures",
        scripts("election_5_with_results")
    )))]
    async fn test_get_state(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let user = User::test_user(Role::CoordinatorGSB, UserId::from(1));
        let id = CommitteeSessionId::from(6);

        committee_session_repo::change_status(&mut conn, id, CommitteeSessionStatus::Completed)
            .await
            .expect("should change committee session status");

        let state = get_state(user, State(pool), Path(ElectionId::from(5)))
            .await
            .expect("should call the handler successfully")
            .0;

        assert_eq!(state, ApportionmentState::Uninitialised);
    }
}
