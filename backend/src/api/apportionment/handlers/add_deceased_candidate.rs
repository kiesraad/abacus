use axum::{
    Json,
    extract::{Path, State},
};
use sqlx::SqlitePool;

use crate::{
    APIError, ErrorResponse, api::apportionment::structs::DeceasedCandidate,
    domain::election::ElectionId, infra::audit_log::AuditService, repository::user_repo::User,
    service::update_apportionment_state,
};

/// Add deceased candidate
#[utoipa::path(
    post,
    path = "/api/elections/{election_id}/apportionment/add_deceased_candidate",
    request_body = DeceasedCandidate,
    responses(
        (status = 200, description = "Added deceased candidate"),
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
pub async fn add_deceased_candidate(
    user: User,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path(election_id): Path<ElectionId>,
    Json(candidate): Json<DeceasedCandidate>,
) -> Result<(), APIError> {
    let mut conn = pool.acquire().await?;

    update_apportionment_state(&mut conn, audit_service, user, election_id, |state| {
        state.add_deceased_candidate(candidate.pg_number, candidate.candidate_number)
    })
    .await
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
    async fn test_add_deceased_candidate(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let user = User::test_user(Role::CoordinatorGSB, UserId::from(1));
        let audit_service = AuditService::new(Some(user.clone()), None);
        let id = CommitteeSessionId::from(6);

        committee_session_repo::change_status(&mut conn, id, CommitteeSessionStatus::Completed)
            .await
            .expect("should change committee session status");

        apportionment_state_repo::upsert(
            &mut conn,
            id,
            &ApportionmentState::RegisteringDeceasedCandidates {
                deceased_candidates: vec![],
            },
        )
        .await
        .expect("should upsert initial state");

        let pg_number = PGNumber::from(4);
        let candidate_number = CandidateNumber::from(4);
        add_deceased_candidate(
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

        let state = apportionment_state_repo::get(&mut conn, id)
            .await
            .expect("should succeed")
            .expect("should be the database");

        assert_eq!(
            state,
            ApportionmentState::RegisteringDeceasedCandidates {
                deceased_candidates: vec!((pg_number, candidate_number))
            }
        );
    }
}
