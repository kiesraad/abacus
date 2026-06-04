use apportionment;
use serde::Serialize;
use sqlx::SqliteConnection;

use crate::{
    APIError,
    api::apportionment::{
        ApportionmentApiError, ApportionmentInputData, ElectionApportionmentResponse,
        map_candidate_nomination, map_seat_assignment,
    },
    domain::{
        apportionment::ListDrawingLotsVariant,
        apportionment_state::{
            ApportionmentState, ApportionmentStateError, CandidateDrawingLotsRequired,
            ListDrawingLotsRequired,
        },
        committee_session::CommitteeSessionId,
        committee_session_status::CommitteeSessionStatus,
        election::{CandidateNumber, ElectionId, ElectionWithPoliticalGroups, PGNumber},
        summary::ElectionSummary,
    },
    infra::audit_log::{AsAuditEvent, AuditEventLevel, AuditEventType, AuditService},
    repository::{apportionment_state_repo, committee_session_repo, data_entry_repo},
    service,
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
    state: String,
}

/// Checks preconditions for getting the apportionment state and returns stored state,
/// or `ApportionmentState::Uninitialised` if there is no stored state yet,
/// and the committee session id to which this state belongs.
pub async fn get_state(
    conn: &mut SqliteConnection,
    election_id: ElectionId,
) -> Result<(CommitteeSessionId, ApportionmentState), APIError> {
    let committee_session =
        committee_session_repo::get_election_committee_session(conn, election_id).await?;

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
    election_id: ElectionId,
    update_fn: impl FnOnce(ApportionmentState) -> Result<ApportionmentState, ApportionmentStateError>,
) -> Result<ApportionmentState, APIError> {
    let (id, state) = get_state(conn, election_id).await?;

    let state = update_fn(state).map_err(|err| APIError::Delegated(Box::new(err)))?;

    apportionment_state_repo::upsert(conn, id, &state).await?;

    audit_service
        .log(
            conn,
            &ApportionmentStateChangeEvent(ApportionmentStateChange {
                election_id,
                state: state.to_string(),
            }),
            None,
        )
        .await?;

    Ok(state)
}

#[allow(clippy::large_enum_variant)]
pub enum ApportionmentResult {
    Ok(ElectionApportionmentResponse),
    ListDrawingLotsRequired(ListDrawingLotsRequired),
    CandidateDrawingLotsRequired(CandidateDrawingLotsRequired),
}

impl From<apportionment::ListDrawingLotsRequired<PGNumber>> for ListDrawingLotsRequired {
    fn from(value: apportionment::ListDrawingLotsRequired<PGNumber>) -> Self {
        ListDrawingLotsRequired {
            variant: value.variant.into(),
            options: value.options,
        }
    }
}
impl From<apportionment::CandidateDrawingLotsRequired<PGNumber, CandidateNumber>>
    for CandidateDrawingLotsRequired
{
    fn from(value: apportionment::CandidateDrawingLotsRequired<PGNumber, CandidateNumber>) -> Self {
        CandidateDrawingLotsRequired {
            list: value.list,
            options: value.options,
        }
    }
}

impl From<apportionment::ListDrawingLotsVariant> for ListDrawingLotsVariant {
    fn from(value: apportionment::ListDrawingLotsVariant) -> Self {
        match value {
            apportionment::ListDrawingLotsVariant::HighestAverageResidualSeat => {
                ListDrawingLotsVariant::HighestAverageResidualSeat
            }
            apportionment::ListDrawingLotsVariant::LargestRemainderResidualSeat => {
                ListDrawingLotsVariant::LargestRemainderResidualSeat
            }
            apportionment::ListDrawingLotsVariant::AbsoluteMajority => {
                ListDrawingLotsVariant::AbsoluteMajority
            }
        }
    }
}

type ApportionmentError = apportionment::ApportionmentError<PGNumber, CandidateNumber>;

/// - Collect data for the [ApportionmentInputData] from the database and make sure that the
///   committee session status is completed.
/// - Call the apportionment process funtion
/// - Map the Result from the apportionment into an [ApportionmentResult]
pub async fn process(
    conn: &mut SqliteConnection,
    election: &ElectionWithPoliticalGroups,
) -> Result<ApportionmentResult, APIError> {
    let (committee_session_id, state) = service::get_apportionment_state(conn, election.id).await?;

    let data_entry_results =
        data_entry_repo::list_results_for_committee_session(conn, committee_session_id).await?;
    let election_summary = ElectionSummary::from_results(election, &data_entry_results)?;

    let input = ApportionmentInputData::new(
        election.number_of_seats,
        &election_summary.political_group_votes,
        state.get_deceased_candidates(),
    );

    let apportionment_result = match apportionment::process(&input) {
        Ok(output) => ApportionmentResult::Ok(ElectionApportionmentResponse {
            seat_assignment: map_seat_assignment(&output.seat_assignment),
            candidate_nomination: map_candidate_nomination(
                &output.candidate_nomination,
                &election.political_groups,
            ),
            election_summary,
        }),
        Err(ApportionmentError::ListDrawingLotsRequired(r)) => {
            ApportionmentResult::ListDrawingLotsRequired(r.into())
        }
        Err(ApportionmentError::CandidateDrawingLotsRequired(r)) => {
            ApportionmentResult::CandidateDrawingLotsRequired(r.into())
        }
    };

    Ok(apportionment_result)
}

#[cfg(test)]
mod tests {
    use sqlx::SqlitePool;
    use test_log::test;

    use super::*;
    use crate::{
        domain::{apportionment_state::DeceasedCandidate, committee_session::CommitteeSessionId},
        error::assert_delegated,
        infra::audit_log::assert_last_event,
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
    async fn test_invalid_committee_session_status(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();

        set_states(&mut conn, CommitteeSessionStatus::DataEntry, None).await;

        let err = update_state(
            &mut conn,
            AuditService::new(None, None),
            ElectionId::from(ELECTION_ID),
            |_| panic!("should not call callback"),
        )
        .await
        .expect_err("should return an error");

        assert_delegated(err, &ApportionmentApiError::CommitteeSessionNotCompleted);
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
    async fn test_get_apportionment_state_not_found(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();

        // Do not create ApportionmentState in the database
        set_states(&mut conn, CommitteeSessionStatus::Completed, None).await;

        // Returns a new ApportionmentState::Uninitialised
        let (id, state) = get_state(&mut conn, ElectionId::from(ELECTION_ID))
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
                "state": "RegisteringDeceasedCandidates",
            }),
        )
        .await;
    }
}
