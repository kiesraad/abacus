use axum::{
    Json,
    extract::{Path, State},
};
use sqlx::SqlitePool;

use crate::{
    APIError, ErrorResponse, SqlitePoolExt,
    domain::{apportionment_state::ApportionmentState, election::ElectionId},
    infra::audit_log::AuditService,
    repository::{election_repo, user_repo::User},
    service::next_apportionment_state,
};

/// Skip registering deceased candidates
#[utoipa::path(
    post,
    path = "/api/elections/{election_id}/apportionment/skip_deceased_candidates",
    responses(
        (status = 200, description = "Skipped registering deceased candidates", body = ApportionmentState),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "Not found", body = ErrorResponse),
        (status = 409, description = "Invalid state", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = ElectionId, description = "Election database id"),
    ),
)]
pub async fn skip_deceased_candidates(
    user: User,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path(election_id): Path<ElectionId>,
) -> Result<Json<ApportionmentState>, APIError> {
    let mut tx = pool.begin_immediate().await?;

    let election = election_repo::get(&mut tx, election_id).await?;
    user.role().is_authorized(election.committee_category)?;

    let state = next_apportionment_state(&mut tx, &audit_service, &election).await?;

    tx.commit().await?;
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
        scripts("election_8_csb_with_results")
    )))]
    async fn test_skip_deceased_candidates(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let user = User::test_user(Role::CoordinatorCSB, UserId::from(3));
        let audit_service = AuditService::new(Some(user.clone()), None);
        let id = CommitteeSessionId::from(801);

        committee_session_repo::change_status(&mut conn, id, CommitteeSessionStatus::Completed)
            .await
            .expect("should change committee session status");

        let state =
            skip_deceased_candidates(user, State(pool), audit_service, Path(ElectionId::from(8)))
                .await
                .expect("should call the handler successfully");

        assert_eq!(
            state.0,
            ApportionmentState::Finalised {
                deceased_candidates: Vec::new(),
                lists_drawn: vec![],
                candidates_drawn: vec![],
            }
        );
    }
}
