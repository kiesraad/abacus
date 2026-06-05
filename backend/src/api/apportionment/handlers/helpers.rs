use sqlx::SqliteConnection;

use crate::{
    APIError,
    domain::{apportionment_state::ApportionmentState, election::ElectionId},
    infra::audit_log::AuditService,
    service::{ApportionmentResult, update_apportionment_state},
};

pub(crate) async fn update_apportionment_state_helper(
    tx: &mut SqliteConnection,
    audit_service: AuditService,
    election_id: ElectionId,
    apportionment_result: ApportionmentResult,
) -> Result<ApportionmentState, APIError> {
    update_apportionment_state(
        tx,
        audit_service,
        election_id,
        |state| match apportionment_result {
            ApportionmentResult::Ok(_) => state.finalise(),
            ApportionmentResult::ListDrawingLotsRequired(drawing_lots_details) => {
                state.draw_lots(drawing_lots_details.into())
            }
            ApportionmentResult::CandidateDrawingLotsRequired(drawing_lots_details) => {
                state.draw_lots(drawing_lots_details.into())
            }
        },
    )
    .await
}
