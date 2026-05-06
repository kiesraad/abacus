use axum::{
    Json,
    extract::{Path, State},
};
use sqlx::SqlitePool;

use crate::{
    APIError, ErrorResponse, SqlitePoolExt,
    api::apportionment::structs::DeceasedCandidate,
    domain::{apportionment_state::ApportionmentState, election::ElectionId},
    infra::audit_log::AuditService,
    repository::user_repo::User,
    service::update_apportionment_state,
};

/// Delete deceased candidate
#[utoipa::path(
    post,
    path = "/api/elections/{election_id}/apportionment/delete_deceased_candidate",
    request_body = DeceasedCandidate,
    responses(
        (status = 200, description = "Deleted deceased candidate", body = ApportionmentState),
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
pub async fn delete_deceased_candidate(
    user: User,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path(election_id): Path<ElectionId>,
    Json(candidate): Json<DeceasedCandidate>,
) -> Result<Json<ApportionmentState>, APIError> {
    let mut tx = pool.begin_immediate().await?;

    let state = update_apportionment_state(&mut tx, audit_service, user, election_id, |state| {
        state.delete_deceased_candidate(candidate.pg_number, candidate.candidate_number)
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
            apportionment_state::ApportionmentState,
            committee_session::CommitteeSessionId,
            committee_session_status::CommitteeSessionStatus,
            election::{CandidateNumber, PGNumber},
            role::Role,
        },
        repository::{apportionment_state_repo, committee_session_repo, user_repo::UserId},
    };

    #[test(sqlx::test(fixtures(
        path = "../../../../fixtures",
        scripts("election_5_with_results")
    )))]
    async fn test_delete_deceased_candidate(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let user = User::test_user(Role::CoordinatorGSB, UserId::from(1));
        let audit_service = AuditService::new(Some(user.clone()), None);
        let id = CommitteeSessionId::from(6);

        committee_session_repo::change_status(&mut conn, id, CommitteeSessionStatus::Completed)
            .await
            .expect("should change committee session status");

        let pg_number = PGNumber::from(4);
        let candidate_number = CandidateNumber::from(4);
        apportionment_state_repo::upsert(
            &mut conn,
            id,
            &ApportionmentState::RegisteringDeceasedCandidates {
                deceased_candidates: vec![(pg_number, candidate_number)],
            },
        )
        .await
        .expect("should upsert initial state");

        let state = delete_deceased_candidate(
            user,
            State(pool),
            audit_service,
            Path(ElectionId::from(5)),
            Json::from(DeceasedCandidate {
                pg_number,
                candidate_number,
            }),
        )
        .await
        .expect("should call the handler successfully");

        assert_eq!(
            state.0,
            ApportionmentState::RegisteringDeceasedCandidates {
                deceased_candidates: Vec::new()
            }
        );
    }
}
