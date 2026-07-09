use axum::{
    Json,
    extract::{Path, State},
};
use sqlx::SqlitePool;

use crate::{
    APIError, ErrorResponse, SqlitePoolExt,
    domain::{apportionment_state::ApportionmentState, election::ElectionId},
    infra::audit_log::AuditService,
    repository::{committee_session_repo, election_repo, user_repo::User},
    service::{delete_committee_session_files, update_apportionment_state},
};

/// Reset apportionment state
#[utoipa::path(
    post,
    path = "/api/elections/{election_id}/apportionment/reset",
    responses(
        (status = 200, description = "Reset apportionment state", body = ApportionmentState),
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
pub async fn reset_apportionment_state(
    user: User,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path(election_id): Path<ElectionId>,
) -> Result<Json<ApportionmentState>, APIError> {
    let mut tx = pool.begin_immediate().await?;

    let election = election_repo::get(&mut tx, election_id).await?;
    user.role().is_authorized(election.committee_category)?;

    let state =
        update_apportionment_state(&mut tx, &audit_service, election_id, |state| state.reset())
            .await?;

    let committee_session =
        committee_session_repo::get_election_committee_session(&mut tx, election_id).await?;
    delete_committee_session_files(&mut tx, audit_service.clone(), committee_session.id).await?;

    tx.commit().await?;

    Ok(Json(state))
}

#[cfg(test)]
mod tests {
    use chrono::Utc;
    use test_log::test;

    use super::*;
    use crate::{
        domain::{
            apportionment_state::ApportionmentState, committee_session::CommitteeSessionId,
            committee_session_status::CommitteeSessionStatus, file::FileType, role::Role,
        },
        repository::{
            apportionment_state_repo, committee_session_repo, file_repo, user_repo::UserId,
        },
    };

    #[test(sqlx::test(fixtures(
        path = "../../../../fixtures",
        scripts("election_8_csb_with_results")
    )))]
    async fn test_reset_apportionment_state(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let user = User::test_user(Role::CoordinatorCSB, UserId::from(3));
        let audit_service = AuditService::new(Some(user.clone()), None);
        let id = CommitteeSessionId::from(801);

        committee_session_repo::change_status(&mut conn, id, CommitteeSessionStatus::Completed)
            .await
            .expect("should change committee session status");

        apportionment_state_repo::upsert(
            &mut conn,
            id,
            &ApportionmentState::RegisteringDeceasedCandidates {
                deceased_candidates: Vec::new(),
            },
        )
        .await
        .expect("should upsert initial state");

        file_repo::create(
            &mut conn,
            id,
            FileType::CsbResultsPdf,
            "filename.txt".into(),
            &[97, 98, 97, 99, 117, 115, 0],
            "text/plain".into(),
            Utc::now(),
        )
        .await
        .expect("should create file");

        let state =
            reset_apportionment_state(user, State(pool), audit_service, Path(ElectionId::from(8)))
                .await
                .expect("should call the handler successfully");

        assert_eq!(state.0, ApportionmentState::Uninitialised);

        assert_eq!(
            file_repo::get_for_session(&mut conn, id, FileType::CsbResultsPdf)
                .await
                .expect("should query files"),
            None,
        );
    }
}
