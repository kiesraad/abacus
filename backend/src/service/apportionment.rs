use serde::Serialize;
use sqlx::SqliteConnection;

use crate::{
    APIError,
    api::apportionment::ApportionmentApiError,
    domain::{
        apportionment_state::{ApportionmentState, ApportionmentStateError},
        committee_session::CommitteeSessionId,
        committee_session_status::CommitteeSessionStatus,
        election::ElectionId,
    },
    infra::audit_log::{AsAuditEvent, AuditEventLevel, AuditEventType, AuditService},
    repository::{
        apportionment_state_repo, committee_session_repo, election_repo, user_repo::User,
    },
};

#[derive(Serialize)]
pub struct ApportionmentStateChangeEvent(ApportionmentStateChange);
impl AsAuditEvent for ApportionmentStateChangeEvent {
    const EVENT_TYPE: AuditEventType = AuditEventType::ApportionmentStateUpdated;
    const EVENT_LEVEL: AuditEventLevel = AuditEventLevel::Success;
}

#[derive(Serialize)]
struct ApportionmentStateChange {
    election_id: ElectionId,
    #[serde(flatten)]
    state: ApportionmentState,
}

/// Checks preconditions for getting the apportionment state and returns stored state,
/// or `ApportionmentState::Uninitialised` if there is no stored state yet,
/// and the committee session id to which this state belongs.
pub async fn get_state(
    conn: &mut SqliteConnection,
    user: User,
    election_id: ElectionId,
) -> Result<(CommitteeSessionId, ApportionmentState), APIError> {
    let election = election_repo::get(conn, election_id).await?;
    user.role().is_authorized(&election.committee_category)?;

    let committee_session =
        committee_session_repo::get_election_committee_session(conn, election.id).await?;

    if committee_session.status != CommitteeSessionStatus::Completed {
        return Err(ApportionmentApiError::CommitteeSessionNotCompleted.into());
    }

    let state = apportionment_state_repo::get(conn, committee_session.id)
        .await?
        .unwrap_or(ApportionmentState::Uninitialised);

    Ok((committee_session.id, state))
}

/// Update apportionment state:
/// - get current state using `get_apportionment_state`
/// - let callback update state
/// - save new state
/// - log new state to audit log
pub async fn update_state(
    conn: &mut SqliteConnection,
    audit_service: AuditService,
    user: User,
    election_id: ElectionId,
    update_fn: impl FnOnce(ApportionmentState) -> Result<ApportionmentState, ApportionmentStateError>,
) -> Result<ApportionmentState, APIError> {
    let (id, state) = get_state(conn, user, election_id).await?;

    let state = update_fn(state).map_err(|err| APIError::Delegated(Box::new(err)))?;

    apportionment_state_repo::upsert(conn, id, &state).await?;

    audit_service
        .log(
            conn,
            &ApportionmentStateChangeEvent(ApportionmentStateChange {
                election_id,
                state: state.clone(),
            }),
            None,
        )
        .await?;

    Ok(state)
}

#[cfg(test)]
mod tests {
    use sqlx::SqlitePool;
    use test_log::test;

    use super::*;
    use crate::{
        api::middleware::authentication::error::AuthenticationError,
        domain::{
            apportionment_state::DeceasedCandidate, committee_session::CommitteeSessionId,
            role::Role,
        },
        infra::audit_log::assert_last_event,
        repository::user_repo::UserId,
        tests::assert_fmt,
    };

    const ELECTION_ID: u32 = 5;
    const COMMITTEE_SESSION_ID: u32 = 6;

    async fn set_states(
        conn: &mut SqliteConnection,
        committee_session_status: CommitteeSessionStatus,
        apportionment_state: Option<ApportionmentState>,
    ) {
        let committee_session_id = CommitteeSessionId::from(COMMITTEE_SESSION_ID);

        committee_session_repo::change_status(conn, committee_session_id, committee_session_status)
            .await
            .expect("should change committee session status");

        if let Some(apportionment_state) = apportionment_state {
            apportionment_state_repo::upsert(conn, committee_session_id, &apportionment_state)
                .await
                .expect("should upsert apportionment state");
        }
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
    async fn test_election_not_found(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();

        let unknown_election = ElectionId::from(404);

        let result = update_state(
            &mut conn,
            AuditService::new(None, None),
            User::test_user(Role::CoordinatorGSB, UserId::from(1)),
            unknown_election,
            |_| panic!("should not call callback"),
        )
        .await;

        assert!(
            matches!(result, Err(APIError::NotFound(_, _))),
            "Unexpected result {result:?}"
        );
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
    async fn test_not_authorized(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();

        let not_authorized = User::test_user(Role::CoordinatorCSB, UserId::from(1));

        let result = update_state(
            &mut conn,
            AuditService::new(None, None),
            not_authorized,
            ElectionId::from(ELECTION_ID),
            |_| panic!("should not call callback"),
        )
        .await;

        assert_fmt(
            result,
            Err(APIError::Delegated(Box::new(
                AuthenticationError::RoleNotAuthorizedError,
            ))),
        );
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
    async fn test_invalid_committee_session_status(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();

        set_states(&mut conn, CommitteeSessionStatus::DataEntry, None).await;

        let result = update_state(
            &mut conn,
            AuditService::new(None, None),
            User::test_user(Role::CoordinatorGSB, UserId::from(1)),
            ElectionId::from(ELECTION_ID),
            |_| panic!("should not call callback"),
        )
        .await;

        assert_fmt(
            result,
            Err(APIError::Delegated(Box::new(
                ApportionmentApiError::CommitteeSessionNotCompleted,
            ))),
        );
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
    async fn test_get_apportionment_state_not_found(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();

        // Do not create ApportionmentState in the database
        set_states(&mut conn, CommitteeSessionStatus::Completed, None).await;

        // Returns a new ApportionmentState::Uninitialised
        let (id, state) = get_state(
            &mut conn,
            User::test_user(Role::CoordinatorGSB, UserId::from(1)),
            ElectionId::from(ELECTION_ID),
        )
        .await
        .expect("should get state");

        assert_eq!(id, CommitteeSessionId::from(COMMITTEE_SESSION_ID));
        assert_eq!(state, ApportionmentState::Uninitialised);
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
    async fn test_update_apportionment_state_not_found(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();

        // Do not create ApportionmentState in the database
        set_states(&mut conn, CommitteeSessionStatus::Completed, None).await;

        // Creates a new entry in the database
        update_state(
            &mut conn,
            AuditService::new(None, None),
            User::test_user(Role::CoordinatorGSB, UserId::from(1)),
            ElectionId::from(ELECTION_ID),
            Ok,
        )
        .await
        .expect("should update state");

        let state = apportionment_state_repo::get(
            &mut conn,
            CommitteeSessionId::from(COMMITTEE_SESSION_ID),
        )
        .await
        .expect("should get state");

        assert_eq!(state, Some(ApportionmentState::Uninitialised));
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
    async fn test_update_apportionment_state(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();

        set_states(
            &mut conn,
            CommitteeSessionStatus::Completed,
            Some(ApportionmentState::Uninitialised),
        )
        .await;

        let returned_state = update_state(
            &mut conn,
            AuditService::new(None, None),
            User::test_user(Role::CoordinatorGSB, UserId::from(1)),
            ElectionId::from(ELECTION_ID),
            |state| {
                assert_eq!(state, ApportionmentState::Uninitialised);
                Ok(ApportionmentState::RegisteringDeceasedCandidates {
                    deceased_candidates: vec![DeceasedCandidate::from(4, 4)],
                })
            },
        )
        .await
        .expect("should update state");

        let expected_state = ApportionmentState::RegisteringDeceasedCandidates {
            deceased_candidates: vec![DeceasedCandidate::from(4, 4)],
        };

        assert_eq!(returned_state, expected_state);

        let stored_state = apportionment_state_repo::get(
            &mut conn,
            CommitteeSessionId::from(COMMITTEE_SESSION_ID),
        )
        .await
        .expect("should get apportionment state")
        .expect("should be stored");

        assert_eq!(stored_state, expected_state);

        assert_last_event(
            &mut conn,
            AuditEventType::ApportionmentStateUpdated,
            AuditEventLevel::Success,
            serde_json::json!({
                "election_id": ELECTION_ID,
                "RegisteringDeceasedCandidates": {"deceased_candidates": [
                    {"pg_number": 4, "candidate_number": 4}
                ]}
            }),
        )
        .await;
    }
}
