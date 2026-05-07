use axum::{
    Json,
    extract::{Path, State},
};
use sqlx::SqlitePool;

use crate::{
    APIError, ErrorResponse, SqlitePoolExt,
    domain::{apportionment_state::ApportionmentState, election::ElectionId},
    infra::audit_log::AuditService,
    repository::user_repo::User,
    service::update_apportionment_state,
};

/// Finalise deceased candidates
#[utoipa::path(
    post,
    path = "/api/elections/{election_id}/apportionment/finalise_deceased_candidates",
    responses(
        (status = 200, description = "Finalised deceased candidates", body = ApportionmentState),
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
pub async fn finalise_deceased_candidates(
    user: User,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path(election_id): Path<ElectionId>,
) -> Result<Json<ApportionmentState>, APIError> {
    let mut tx = pool.begin_immediate().await?;

    let state = update_apportionment_state(&mut tx, audit_service, user, election_id, |state| {
        state.finalise_deceased_candidates()
    })
    .await?;

    tx.commit().await?;
    Ok(Json(state))
}

#[cfg(test)]
mod tests {
    use test_log::test;

    use super::*;
    use crate::{
        domain::{
            apportionment_state::{ApportionmentState, DeceasedCandidate},
            committee_session::CommitteeSessionId,
            committee_session_status::CommitteeSessionStatus,
            role::Role,
        },
        repository::{apportionment_state_repo, committee_session_repo, user_repo::UserId},
    };

    #[test(sqlx::test(fixtures(
        path = "../../../../fixtures",
        scripts("election_5_with_results")
    )))]
    async fn test_finalise_deceased_candidates(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let user = User::test_user(Role::CoordinatorGSB, UserId::from(1));
        let audit_service = AuditService::new(Some(user.clone()), None);
        let id = CommitteeSessionId::from(6);

        committee_session_repo::change_status(&mut conn, id, CommitteeSessionStatus::Completed)
            .await
            .expect("should change committee session status");

        let candidate = DeceasedCandidate::from(4, 4);
        apportionment_state_repo::upsert(
            &mut conn,
            id,
            &ApportionmentState::RegisteringDeceasedCandidates {
                deceased_candidates: vec![candidate],
            },
        )
        .await
        .expect("should upsert initial state");

        let state = finalise_deceased_candidates(
            user,
            State(pool),
            audit_service,
            Path(ElectionId::from(5)),
        )
        .await
        .expect("should call the handler successfully");

        assert_eq!(
            state.0,
            ApportionmentState::Finalised {
                deceased_candidates: vec![candidate],
            }
        );
    }
}
