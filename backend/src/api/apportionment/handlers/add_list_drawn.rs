use axum::{
    Json,
    extract::{Path, State},
};
use sqlx::SqlitePool;

use crate::{
    APIError, ErrorResponse, SqlitePoolExt,
    domain::{
        apportionment::ListDrawn, apportionment_state::ApportionmentState, election::ElectionId,
    },
    infra::audit_log::AuditService,
    repository::{election_repo, user_repo::User},
    service::{next_apportionment_state, update_apportionment_state},
};

/// Add list to drawing lots
#[utoipa::path(
    post,
    path = "/api/elections/{election_id}/apportionment/add_list_drawn",
    request_body = ListDrawn,
    responses(
        (status = 200, description = "Add list to drawing lots", body = ApportionmentState),
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
pub async fn add_list_drawn(
    user: User,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path(election_id): Path<ElectionId>,
    Json(list_drawn): Json<ListDrawn>,
) -> Result<Json<ApportionmentState>, APIError> {
    let mut tx = pool.begin_immediate().await?;

    let election = election_repo::get(&mut tx, election_id).await?;
    user.role().is_authorized(election.committee_category)?;

    update_apportionment_state(&mut tx, &audit_service, election_id, |state| {
        state.add_list_drawn(list_drawn)
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
            apportionment::{AbsoluteMajorityDrawingLots, ListDrawingLotsVariant},
            apportionment_state::{ApportionmentState, DrawingLotsRequired},
            committee_session::CommitteeSessionId,
            committee_session_status::CommitteeSessionStatus,
            election::PGNumber,
            role::Role,
        },
        infra::audit_log::list_event_names,
        repository::{apportionment_state_repo, committee_session_repo, user_repo::UserId},
    };

    #[test(sqlx::test(fixtures(
        path = "../../../../fixtures",
        scripts("election_5_with_results")
    )))]
    async fn test_add_list_drawn(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let user = User::test_user(Role::CoordinatorGSB, UserId::from(1));
        let audit_service = AuditService::new(Some(user.clone()), None);
        let id = CommitteeSessionId::from(6);

        committee_session_repo::change_status(&mut conn, id, CommitteeSessionStatus::Completed)
            .await
            .expect("should change committee session status");

        let drawing_lots_required = DrawingLotsRequired::ListDrawingLotsRequired(
            ListDrawingLotsVariant::AbsoluteMajorityHighestAverage(AbsoluteMajorityDrawingLots {
                assign_to: PGNumber::from(1),
                options: PGNumber::from_values(vec![8, 9]),
            }),
        );

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

        let list_drawn = ListDrawn {
            variant: ListDrawingLotsVariant::AbsoluteMajorityHighestAverage(
                AbsoluteMajorityDrawingLots {
                    assign_to: PGNumber::from(1),
                    options: PGNumber::from_values(vec![8, 9]),
                },
            ),
            drawn: PGNumber::from(8),
        };

        let state = add_list_drawn(
            user,
            State(pool),
            audit_service,
            Path(ElectionId::from(5)),
            Json::from(list_drawn.clone()),
        )
        .await
        .expect("should call the handler successfully");

        assert_eq!(
            state.0,
            ApportionmentState::Finalised {
                deceased_candidates: vec![],
                lists_drawn: vec![list_drawn],
                candidates_drawn: vec![],
            }
        );

        assert_eq!(
            list_event_names(&mut conn).await.unwrap(),
            ["ApportionmentStateUpdated", "ApportionmentStateUpdated"]
        );
    }
}
