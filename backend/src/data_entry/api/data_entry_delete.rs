use axum::{
    extract::{Path, State},
    http::StatusCode,
};
use sqlx::SqlitePool;

use crate::{
    APIError, ErrorResponse, SqlitePoolExt,
    audit_log::AuditService,
    authentication::Coordinator,
    data_entry::{
        domain::data_entry_status::DataEntryStatusName, repository::data_entry_repo,
        service::delete_data_entry_and_result_for_polling_station,
    },
    election::repository::committee_session_repo,
    error::ErrorReference,
    polling_station,
};

/// Delete data entries and result for a polling station
#[utoipa::path(
    delete,
    path = "/api/polling_stations/{polling_station_id}/data_entries",
    responses(
        (status = 204, description = "Data entries deleted successfully"),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "Not found", body = ErrorResponse),
        (status = 409, description = "Request cannot be completed", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("polling_station_id" = u32, description = "Polling station database id"),
    ),
    security(("cookie_auth" = ["coordinator"])),
)]
pub async fn polling_station_data_entries_and_result_delete(
    _user: Coordinator,
    State(pool): State<SqlitePool>,
    Path(polling_station_id): Path<u32>,
    audit_service: AuditService,
) -> Result<StatusCode, APIError> {
    let mut tx = pool.begin_immediate().await?;

    let polling_station = polling_station::get(&mut tx, polling_station_id).await?;
    let committee_session =
        committee_session_repo::get(&mut tx, polling_station.committee_session_id).await?;

    let data_entry =
        data_entry_repo::get_data_entry(&mut tx, polling_station_id, committee_session.id).await?;

    if data_entry.state.status_name() == DataEntryStatusName::FirstEntryHasErrors
        || data_entry.state.status_name() == DataEntryStatusName::EntriesDifferent
    {
        tx.rollback().await?;

        Err(APIError::Conflict(
            "Data entry cannot be deleted.".to_string(),
            ErrorReference::DataEntryCannotBeDeleted,
        ))
    } else {
        // The database entries of the data entry (and optional result) are fully deleted
        delete_data_entry_and_result_for_polling_station(
            &mut tx,
            &audit_service,
            &committee_session,
            polling_station_id,
        )
        .await?;

        tx.commit().await?;

        Ok(StatusCode::NO_CONTENT)
    }
}

#[cfg(test)]
mod tests {
    use axum::response::{IntoResponse, Response};
    use http_body_util::BodyExt;
    use test_log::test;

    use super::*;
    use crate::{
        authentication::{Role, User},
        data_entry::{
            api::{
                data_entry_claim::tests::claim,
                data_entry_finalise::tests::{
                    finalise, finalise_different_entries, finalise_with_errors,
                },
                data_entry_save::{DataEntry, tests::save},
            },
            domain::entry_number::EntryNumber,
            repository::polling_station_result_repo,
        },
        election::{
            api::committee_session::tests::change_status_committee_session,
            domain::committee_session_status::CommitteeSessionStatus,
        },
    };

    async fn delete_data_entries_and_result(pool: SqlitePool, polling_station_id: u32) -> Response {
        let user = User::test_user(Role::Coordinator, 1);
        polling_station_data_entries_and_result_delete(
            Coordinator(user.clone()),
            State(pool.clone()),
            Path(polling_station_id),
            AuditService::new(Some(user), None),
        )
        .await
        .into_response()
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_2"))))]
    async fn test_polling_station_data_entries_and_result_delete_first_entry_in_progress(
        pool: SqlitePool,
    ) {
        // create data entry
        let request_body = DataEntry::example_data_entry();
        let response = claim(pool.clone(), 1, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = save(
            pool.clone(),
            request_body.clone(),
            1,
            EntryNumber::FirstEntry,
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);

        let mut conn = pool.acquire().await.unwrap();
        assert!(
            data_entry_repo::data_entry_exists(&mut conn, 1)
                .await
                .unwrap()
        );

        // delete data entry with status FirstEntryInProgress
        let response = delete_data_entries_and_result(pool.clone(), 1).await;
        assert_eq!(response.status(), StatusCode::NO_CONTENT);

        // Check that the data entry is deleted
        assert!(
            !data_entry_repo::data_entry_exists(&mut conn, 1)
                .await
                .unwrap()
        );
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_3"))))]
    async fn test_polling_station_data_entries_and_result_delete_definitive(pool: SqlitePool) {
        let polling_station_id = 3;

        // create data entry
        let request_body = DataEntry::example_data_entry();
        let response = claim(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = save(
            pool.clone(),
            request_body.clone(),
            polling_station_id,
            EntryNumber::FirstEntry,
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = finalise(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = claim(pool.clone(), polling_station_id, EntryNumber::SecondEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = save(
            pool.clone(),
            request_body.clone(),
            polling_station_id,
            EntryNumber::SecondEntry,
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = finalise(pool.clone(), polling_station_id, EntryNumber::SecondEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        let mut conn = pool.acquire().await.unwrap();
        assert!(
            data_entry_repo::data_entry_exists(&mut conn, polling_station_id)
                .await
                .unwrap()
        );
        assert!(
            polling_station_result_repo::result_exists(&mut conn, polling_station_id)
                .await
                .unwrap()
        );

        change_status_committee_session(pool.clone(), 3, CommitteeSessionStatus::DataEntryFinished)
            .await;

        // delete data entry with status Definitive
        let response = delete_data_entries_and_result(pool.clone(), polling_station_id).await;
        assert_eq!(response.status(), StatusCode::NO_CONTENT);

        // Check that the data entry and result are deleted
        assert!(
            !data_entry_repo::data_entry_exists(&mut conn, polling_station_id)
                .await
                .unwrap()
        );
        assert!(
            !polling_station_result_repo::result_exists(&mut conn, polling_station_id)
                .await
                .unwrap()
        );

        // Check that the committee session status is changed to DataEntryInProgress
        let committee_session = committee_session_repo::get(&mut conn, 3).await.unwrap();

        assert_eq!(
            committee_session.status,
            CommitteeSessionStatus::DataEntryInProgress
        );
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_2"))))]
    async fn test_polling_station_data_entries_and_result_delete_fails_entries_different(
        pool: SqlitePool,
    ) {
        finalise_different_entries(pool.clone()).await;

        let mut conn = pool.acquire().await.unwrap();
        assert!(
            data_entry_repo::data_entry_exists(&mut conn, 1)
                .await
                .unwrap()
        );

        // delete data entry with status EntriesDifferent fails
        let response = delete_data_entries_and_result(pool.clone(), 1).await;
        assert_eq!(response.status(), StatusCode::CONFLICT);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: ErrorResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(result.reference, ErrorReference::DataEntryCannotBeDeleted);

        // Check that the data entry is not deleted
        assert!(
            data_entry_repo::data_entry_exists(&mut conn, 1)
                .await
                .unwrap()
        );
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_2"))))]
    async fn test_polling_station_data_entries_and_result_delete_fails_first_entry_has_errors(
        pool: SqlitePool,
    ) {
        finalise_with_errors(pool.clone()).await;

        let mut conn = pool.acquire().await.unwrap();
        assert!(
            data_entry_repo::data_entry_exists(&mut conn, 1)
                .await
                .unwrap()
        );

        // delete data entry with status FirstEntryHasErrors fails
        let response = delete_data_entries_and_result(pool.clone(), 1).await;
        assert_eq!(response.status(), StatusCode::CONFLICT);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: ErrorResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(result.reference, ErrorReference::DataEntryCannotBeDeleted);

        // Check that the data entry is not deleted
        assert!(
            data_entry_repo::data_entry_exists(&mut conn, 1)
                .await
                .unwrap()
        );
    }
}
