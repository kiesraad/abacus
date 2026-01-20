use axum::{
    Json,
    extract::{Path, State},
};
use sqlx::SqlitePool;

use crate::{
    APIError, ErrorResponse,
    domain::{election::ElectionId, election_status::ElectionStatusResponse},
    infra::authentication::User,
    repository::{committee_session_repo, election_status_repo},
};

/// Get election polling stations data entry statuses
#[utoipa::path(
    get,
    path = "/api/elections/{election_id}/status",
    responses(
        (status = 200, description = "Election", body = ElectionStatusResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 404, description = "Not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = ElectionId, description = "Election database id"),
    ),
    security(("cookie_auth" = ["administrator", "coordinator", "typist"])),
)]
pub async fn election_status(
    _user: User,
    State(pool): State<SqlitePool>,
    Path(election_id): Path<ElectionId>,
) -> Result<Json<ElectionStatusResponse>, APIError> {
    let mut conn = pool.acquire().await?;

    let current_committee_session =
        committee_session_repo::get_election_committee_session(&mut conn, election_id).await?;

    let statuses = election_status_repo::statuses(&mut conn, current_committee_session.id).await?;
    Ok(Json(ElectionStatusResponse { statuses }))
}

#[cfg(test)]
mod tests {
    use axum::{http::StatusCode, response::IntoResponse};
    use http_body_util::BodyExt;
    use test_log::test;

    use super::*;
    use crate::{api::data_entry::election_status, infra::authentication::Role};

    /// First committee session, should return all polling station statuses
    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_2"))))]
    async fn test_statuses_first_session_all_polling_stations(pool: SqlitePool) {
        let user = User::test_user(Role::Coordinator, 1);
        let response = election_status::election_status(
            user.clone(),
            State(pool.clone()),
            Path(ElectionId::from(2)),
        )
        .await
        .into_response();

        assert_eq!(response.status(), StatusCode::OK);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: ElectionStatusResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(result.statuses.len(), 2);
    }

    /// New committee session without investigations, should return no polling station statuses
    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_7_four_sessions"))))]
    async fn test_statuses_second_session_no_polling_stations(pool: SqlitePool) {
        let user = User::test_user(Role::Coordinator, 1);
        let response = election_status::election_status(
            user.clone(),
            State(pool.clone()),
            Path(ElectionId::from(7)),
        )
        .await
        .into_response();

        assert_eq!(response.status(), StatusCode::OK);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: ElectionStatusResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(result.statuses.len(), 0);
    }

    /// Second committee session with 1 investigation, should return 1 polling station status
    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_5_with_results"))))]
    async fn test_statuses_second_session_with_investigation(pool: SqlitePool) {
        let user = User::test_user(Role::Coordinator, 1);

        let response = election_status::election_status(
            user.clone(),
            State(pool.clone()),
            Path(ElectionId::from(5)),
        )
        .await
        .into_response();

        assert_eq!(response.status(), StatusCode::OK);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: ElectionStatusResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(result.statuses.len(), 1);
    }
}
