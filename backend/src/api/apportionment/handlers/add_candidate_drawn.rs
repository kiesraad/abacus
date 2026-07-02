use axum::{
    Json,
    extract::{Path, State},
};
use sqlx::SqlitePool;

use crate::{
    APIError, ErrorResponse, SqlitePoolExt,
    domain::{
        apportionment::CandidateDrawn, apportionment_state::ApportionmentState,
        election::ElectionId,
    },
    infra::audit_log::AuditService,
    repository::{election_repo, user_repo::User},
    service::{next_apportionment_state, update_apportionment_state},
};

/// Add candidate to drawing lots
#[utoipa::path(
    post,
    path = "/api/elections/{election_id}/apportionment/add_candidate_drawn",
    request_body = CandidateDrawn,
    responses(
        (status = 200, description = "Add candidate to drawing lots", body = ApportionmentState),
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
pub async fn add_candidate_drawn(
    user: User,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path(election_id): Path<ElectionId>,
    Json(candidate_drawn): Json<CandidateDrawn>,
) -> Result<Json<ApportionmentState>, APIError> {
    let mut tx = pool.begin_immediate().await?;

    let election = election_repo::get(&mut tx, election_id).await?;
    user.role().is_authorized(election.committee_category)?;

    update_apportionment_state(&mut tx, &audit_service, election_id, |state| {
        state.add_candidate_drawn(candidate_drawn)
    })
    .await?;

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
            apportionment::CandidateDrawingLotsVariant,
            apportionment_state::{ApportionmentState, DrawingLotsRequired},
            committee_session::CommitteeSessionId,
            committee_session_status::CommitteeSessionStatus,
            election::{CandidateNumber, PGNumber},
            role::Role,
        },
        infra::audit_log::list_event_names,
        repository::{apportionment_state_repo, committee_session_repo, user_repo::UserId},
    };

    #[test(sqlx::test(fixtures(
        path = "../../../../fixtures",
        scripts("election_8_csb_with_results")
    )))]
    async fn test_add_candidate_drawn(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let user = User::test_user(Role::CoordinatorCSB, UserId::from(3));
        let audit_service = AuditService::new(Some(user.clone()), None);
        let id = CommitteeSessionId::from(801);

        committee_session_repo::change_status(&mut conn, id, CommitteeSessionStatus::Completed)
            .await
            .expect("should change committee session status");

        let drawing_lots_required =
            DrawingLotsRequired::CandidateDrawingLotsRequired(CandidateDrawingLotsVariant {
                list: PGNumber::from(3),
                options: CandidateNumber::from_values(vec![1, 2]),
            });

        apportionment_state_repo::upsert(
            &mut conn,
            id,
            &ApportionmentState::DrawingLots {
                drawing_lots_required: drawing_lots_required.clone(),
                deceased_candidates: vec![],
                lists_drawn: vec![],
                candidates_drawn: vec![],
            },
        )
        .await
        .expect("should upsert initial state");

        let candidate_drawn = CandidateDrawn {
            variant: CandidateDrawingLotsVariant {
                list: PGNumber::from(3),
                options: CandidateNumber::from_values(vec![1, 2]),
            },
            drawn: CandidateNumber::from(2),
        };

        let state = add_candidate_drawn(
            user,
            State(pool),
            audit_service,
            Path(ElectionId::from(8)),
            Json::from(candidate_drawn.clone()),
        )
        .await
        .expect("should call the handler successfully");

        assert_eq!(
            state.0,
            ApportionmentState::Finalised {
                deceased_candidates: vec![],
                lists_drawn: vec![],
                candidates_drawn: vec![candidate_drawn],
            }
        );

        assert_eq!(
            list_event_names(&mut conn).await.unwrap(),
            ["ApportionmentStateUpdated", "ApportionmentStateUpdated"]
        );
    }
}
