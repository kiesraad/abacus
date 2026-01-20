use axum::{
    extract::{Path, State},
    http::StatusCode,
};
use sqlx::SqlitePool;

use crate::{
    APIError, ErrorResponse,
    domain::{data_entry_status::DataEntryStatus, entry_number::EntryNumber},
    infra::{
        audit_log::{AuditEvent, AuditService},
        authentication::Typist,
        db::SqlitePoolExt,
    },
    repository::data_entry_repo,
    service::data_entry::validate_and_get_data,
};

/// Delete an in-progress (not finalised) data entry for a polling station
#[utoipa::path(
    delete,
    path = "/api/polling_stations/{polling_station_id}/data_entries/{entry_number}",
    responses(
        (status = 204, description = "Data entry deleted successfully"),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "Not found", body = ErrorResponse),
        (status = 409, description = "Request cannot be completed", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("polling_station_id" = u32, description = "Polling station database id"),
        ("entry_number" = u8, description = "Data entry number (first or second data entry)"),
    ),
    security(("cookie_auth" = ["typist"])),
)]
pub async fn polling_station_data_entry_delete(
    user: Typist,
    State(pool): State<SqlitePool>,
    Path((polling_station_id, entry_number)): Path<(u32, EntryNumber)>,
    audit_service: AuditService,
) -> Result<StatusCode, APIError> {
    let mut tx = pool.begin_immediate().await?;

    let (polling_station, election, committee_session, state) =
        validate_and_get_data(&mut tx, polling_station_id, &user.0).await?;

    let user_id = user.0.id();
    let new_state = match entry_number {
        EntryNumber::FirstEntry => state.delete_first_entry(user_id)?,
        EntryNumber::SecondEntry => {
            state.delete_second_entry(user_id, &polling_station, &election)?
        }
    };

    let mut data_entry =
        data_entry_repo::get_data_entry(&mut tx, polling_station_id, committee_session.id).await?;

    if new_state == DataEntryStatus::FirstEntryNotStarted {
        // The database entry of the data entry is fully deleted when the first entry is deleted
        data_entry_repo::delete_data_entry(&mut tx, polling_station_id).await?;
    } else {
        // The status of the data entry is updated when the second entry is deleted
        data_entry = data_entry_repo::upsert(
            &mut tx,
            polling_station_id,
            committee_session.id,
            &new_state,
        )
        .await?;
    }

    audit_service
        .log(
            &mut tx,
            &AuditEvent::DataEntryDeleted(data_entry.into()),
            None,
        )
        .await?;

    tx.commit().await?;

    Ok(StatusCode::NO_CONTENT)
}

#[cfg(test)]
mod tests {
    use axum::response::{IntoResponse, Response};
    use http_body_util::BodyExt;
    use test_log::test;

    use super::*;
    use crate::{
        api::{
            data_entry::{
                data_entry_abort,
                data_entry_claim::tests::claim,
                data_entry_finalise::tests::finalise,
                data_entry_get,
                data_entry_get::DataEntryGetResponse,
                data_entry_save::{DataEntry, tests::save},
            },
            election::committee_session::tests::change_status_committee_session,
        },
        domain::{
            committee_session_status::CommitteeSessionStatus, validate::ValidationResultCode,
        },
        error::ErrorReference,
        infra::authentication::{Coordinator, Role, User},
    };

    async fn delete(
        pool: SqlitePool,
        polling_station_id: u32,
        entry_number: EntryNumber,
    ) -> Response {
        let user = match entry_number {
            EntryNumber::FirstEntry => User::test_user(Role::Typist, 1),
            EntryNumber::SecondEntry => User::test_user(Role::Typist, 2),
        };
        data_entry_abort::polling_station_data_entry_delete(
            Typist(user.clone()),
            State(pool.clone()),
            Path((polling_station_id, entry_number)),
            AuditService::new(Some(user), None),
        )
        .await
        .into_response()
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_2"))))]
    async fn test_polling_station_data_entry_delete_first_entry(pool: SqlitePool) {
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

        // delete data entry
        let response = delete(pool.clone(), 1, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::NO_CONTENT);

        // Check that the data entry is deleted
        assert!(
            !data_entry_repo::data_entry_exists(&mut conn, 1)
                .await
                .unwrap()
        );
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_2"))))]
    async fn test_polling_station_data_entry_delete_second_entry(pool: SqlitePool) {
        // create data entry with warning
        let request_body = DataEntry::example_data_entry_with_warning();
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
        let response = finalise(pool.clone(), 1, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        let user = User::test_user(Role::Coordinator, 1);
        let response = data_entry_get::polling_station_data_entry_get(
            Coordinator(user),
            State(pool.clone()),
            Path(1),
        )
        .await
        .into_response();
        assert_eq!(response.status(), StatusCode::OK);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: DataEntryGetResponse = serde_json::from_slice(&body).unwrap();

        let warnings = result.validation_results.warnings;
        assert_eq!(warnings.len(), 1);
        assert_eq!(warnings[0].code, ValidationResultCode::W201);
        assert_eq!(
            warnings[0].fields,
            vec!["data.votes_counts.blank_votes_count",]
        );
        let errors = result.validation_results.errors;
        assert_eq!(errors.len(), 0);

        // Check that the data entry is created
        let mut conn = pool.acquire().await.unwrap();
        assert!(
            data_entry_repo::data_entry_exists(&mut conn, 1)
                .await
                .unwrap()
        );

        let response = claim(pool.clone(), 1, EntryNumber::SecondEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = save(
            pool.clone(),
            request_body.clone(),
            1,
            EntryNumber::SecondEntry,
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);

        // Check that the data entry is in SecondEntryInProgress state
        let data_entry = data_entry_repo::get_data_entry(&mut conn, 1, 2)
            .await
            .unwrap();
        let status: DataEntryStatus = data_entry.state.0;
        assert!(matches!(status, DataEntryStatus::SecondEntryInProgress(_)));

        // delete second data entry
        let response = delete(pool.clone(), 1, EntryNumber::SecondEntry).await;
        assert_eq!(response.status(), StatusCode::NO_CONTENT);

        // Check that the second data entry is deleted
        let data_entry = data_entry_repo::get_data_entry(&mut conn, 1, 2)
            .await
            .unwrap();
        let status: DataEntryStatus = data_entry.state.0;
        assert!(matches!(status, DataEntryStatus::SecondEntryNotStarted(_)));
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_2"))))]
    async fn test_polling_station_data_entry_delete_committee_session_status_is_data_entry_paused(
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

        change_status_committee_session(pool.clone(), 2, CommitteeSessionStatus::DataEntryPaused)
            .await;

        // delete data entry
        let response = delete(pool.clone(), 1, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::CONFLICT);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: ErrorResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(result.reference, ErrorReference::CommitteeSessionPaused);

        // Check if entry is still in FirstEntryInProgress state
        let mut conn = pool.acquire().await.unwrap();
        let data_entry = data_entry_repo::get_data_entry(&mut conn, 1, 2)
            .await
            .unwrap();
        let status: DataEntryStatus = data_entry.state.0;
        assert!(matches!(status, DataEntryStatus::FirstEntryInProgress(_)));
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_2"))))]
    async fn test_polling_station_data_entry_delete_committee_session_status_not_data_entry_paused_or_in_progress(
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

        change_status_committee_session(pool.clone(), 2, CommitteeSessionStatus::DataEntryFinished)
            .await;

        // delete data entry
        let response = delete(pool.clone(), 1, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::CONFLICT);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: ErrorResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(
            result.reference,
            ErrorReference::InvalidCommitteeSessionStatus
        );

        // Check if entry is still in FirstEntryInProgress state
        let mut conn = pool.acquire().await.unwrap();
        let data_entry = data_entry_repo::get_data_entry(&mut conn, 1, 2)
            .await
            .unwrap();
        let status: DataEntryStatus = data_entry.state.0;
        assert!(matches!(status, DataEntryStatus::FirstEntryInProgress(_)));
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_2"))))]
    async fn test_polling_station_data_entry_delete_nonexistent(pool: SqlitePool) {
        let user = User::test_user(Role::Typist, 1);
        // check that deleting a non-existing data entry returns 404
        let response = data_entry_abort::polling_station_data_entry_delete(
            Typist(User::test_user(Role::Typist, 1)),
            State(pool.clone()),
            Path((1, EntryNumber::FirstEntry)),
            AuditService::new(Some(user), None),
        )
        .await
        .into_response();

        assert_eq!(response.status(), StatusCode::CONFLICT);
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_2"))))]
    async fn test_data_entry_delete_finalised_not_possible(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();

        for entry_number in 1..=2 {
            let entry_number = EntryNumber::try_from(entry_number).unwrap();
            // create and finalise the first data entry
            let request_body = DataEntry::example_data_entry();
            let response = claim(pool.clone(), 1, entry_number).await;
            assert_eq!(response.status(), StatusCode::OK);
            let response = save(pool.clone(), request_body.clone(), 1, entry_number).await;
            assert_eq!(response.status(), StatusCode::OK);
            let response = finalise(pool.clone(), 1, entry_number).await;
            assert_eq!(response.status(), StatusCode::OK);

            // check that deleting finalised or non-existent data entry returns 404
            for _entry_number in 1..=2 {
                let response = delete(pool.clone(), 1, entry_number).await;
                assert_eq!(response.status(), StatusCode::CONFLICT);
            }

            // after the first data entry, check if it is still in the database
            // (after the second data entry, the results are finalised so we do not expect rows)
            if entry_number == EntryNumber::FirstEntry {
                assert!(
                    data_entry_repo::data_entry_exists(&mut conn, 1)
                        .await
                        .unwrap()
                );
            }
        }
    }
}
