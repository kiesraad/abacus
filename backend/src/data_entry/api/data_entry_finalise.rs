use axum::{
    Json,
    extract::{Path, State},
};
use sqlx::SqlitePool;

use crate::{
    APIError, ErrorResponse, SqlitePoolExt,
    audit_log::{AuditEvent, AuditService},
    authentication::Typist,
    data_entry::{
        domain::{
            data_entry_status::DataEntryStatus,
            data_entry_status_response::DataEntryStatusResponse, entry_number::EntryNumber,
        },
        repository::data_entry_repo,
        service::{make_definitive, validate_and_get_data},
    },
};

/// Finalise the data entry for a polling station
#[utoipa::path(
    post,
    path = "/api/polling_stations/{polling_station_id}/data_entries/{entry_number}/finalise",
    responses(
        (status = 200, description = "Data entry finalised successfully", body = DataEntryStatusResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "Not found", body = ErrorResponse),
        (status = 409, description = "Request cannot be completed", body = ErrorResponse),
        (status = 422, description = "JSON error or invalid data (Unprocessable Content)", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("polling_station_id" = u32, description = "Polling station database id"),
        ("entry_number" = u8, description = "Data entry number (first or second data entry)"),
    ),
    security(("cookie_auth" = ["typist"])),
)]
pub async fn polling_station_data_entry_finalise(
    user: Typist,
    State(pool): State<SqlitePool>,
    Path((polling_station_id, entry_number)): Path<(u32, EntryNumber)>,
    audit_service: AuditService,
) -> Result<Json<DataEntryStatusResponse>, APIError> {
    let mut tx = pool.begin_immediate().await?;

    let (polling_station, election, committee_session, state) =
        validate_and_get_data(&mut tx, polling_station_id, &user.0).await?;

    let user_id = user.0.id();
    match entry_number {
        EntryNumber::FirstEntry => {
            let new_state = state.finalise_first_entry(&polling_station, &election, user_id)?;
            data_entry_repo::upsert(
                &mut tx,
                polling_station_id,
                committee_session.id,
                &new_state,
            )
            .await?;
        }
        EntryNumber::SecondEntry => {
            let (new_state, data) =
                state.finalise_second_entry(&polling_station, &election, user_id)?;

            match (&new_state, data) {
                (DataEntryStatus::Definitive(_), Some(data)) => {
                    // Save the data to the database
                    make_definitive(
                        &mut tx,
                        polling_station_id,
                        committee_session.id,
                        &new_state,
                        &data,
                    )
                    .await?;
                }
                (DataEntryStatus::Definitive(_), None) => {
                    unreachable!("Data entry is in definitive state but no data is present");
                }
                (new_state, _) => {
                    data_entry_repo::upsert(
                        &mut tx,
                        polling_station_id,
                        committee_session.id,
                        new_state,
                    )
                    .await?;
                }
            }
        }
    }

    let data_entry =
        data_entry_repo::get_data_entry(&mut tx, polling_station_id, committee_session.id).await?;

    audit_service
        .log(
            &mut tx,
            &AuditEvent::DataEntryFinalised(data_entry.clone().into()),
            None,
        )
        .await?;

    tx.commit().await?;

    Ok(Json(data_entry.into()))
}

#[cfg(test)]
pub mod tests {
    use axum::{
        http::StatusCode,
        response::{IntoResponse, Response},
    };
    use http_body_util::BodyExt;
    use sqlx::query;
    use test_log::test;

    use super::*;
    use crate::{
        authentication::{Role, User},
        data_entry::{
            api::{
                data_entry_claim::tests::claim,
                data_entry_finalise,
                data_entry_save::{DataEntry, tests::save},
            },
            domain::data_entry_status::DataEntryStatusName,
            repository::{data_entry_repo, polling_station_result_repo},
        },
        election::{
            api::committee_session::tests::change_status_committee_session,
            domain::committee_session_status::CommitteeSessionStatus,
        },
        error::ErrorReference,
    };

    pub async fn finalise(
        pool: SqlitePool,
        polling_station_id: u32,
        entry_number: EntryNumber,
    ) -> Response {
        let user = match entry_number {
            EntryNumber::FirstEntry => User::test_user(Role::Typist, 1),
            EntryNumber::SecondEntry => User::test_user(Role::Typist, 2),
        };
        data_entry_finalise::polling_station_data_entry_finalise(
            Typist(user.clone()),
            State(pool.clone()),
            Path((polling_station_id, entry_number)),
            AuditService::new(Some(user), None),
        )
        .await
        .into_response()
    }

    pub async fn finalise_different_entries(pool: SqlitePool) {
        // Save and finalise the first data entry
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
        let response = finalise(pool.clone(), 1, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        // Save and finalise a different second data entry
        let mut request_body = DataEntry::example_data_entry();
        request_body
            .data
            .as_cso_first_session_mut()
            .unwrap()
            .voters_counts
            .poll_card_count = 100;
        request_body
            .data
            .as_cso_first_session_mut()
            .unwrap()
            .voters_counts
            .proxy_certificate_count = 0;
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
        let response = finalise(pool.clone(), 1, EntryNumber::SecondEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        let body = response.into_body().collect().await.unwrap().to_bytes();
        let DataEntryStatusResponse { status } = serde_json::from_slice(&body).unwrap();

        assert_eq!(status, DataEntryStatusName::EntriesDifferent);
    }

    pub async fn finalise_with_errors(pool: SqlitePool) {
        let mut request_body = DataEntry::example_data_entry();
        request_body
            .data
            .as_cso_first_session_mut()
            .unwrap()
            .voters_counts
            .poll_card_count = 100; // incorrect value

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

        // Check that finalise with errors results in FirstEntryHasErrors
        let response = finalise(pool.clone(), 1, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        let body = response.into_body().collect().await.unwrap().to_bytes();
        let DataEntryStatusResponse { status } = serde_json::from_slice(&body).unwrap();

        assert_eq!(status, DataEntryStatusName::FirstEntryHasErrors);
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_2"))))]
    async fn test_finalise_data_entry(pool: SqlitePool) {
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
        let response = finalise(pool.clone(), 1, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_2"))))]
    async fn test_finalise_data_entry_committee_session_status_is_data_entry_paused(
        pool: SqlitePool,
    ) {
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

        let response = finalise(pool.clone(), 1, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::CONFLICT);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: ErrorResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(result.reference, ErrorReference::CommitteeSessionPaused);
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_2"))))]
    async fn test_finalise_data_entry_committee_session_status_not_data_entry_paused_or_in_progress(
        pool: SqlitePool,
    ) {
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

        let response = finalise(pool.clone(), 1, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::CONFLICT);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: ErrorResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(
            result.reference,
            ErrorReference::InvalidCommitteeSessionStatus
        );
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_2"))))]
    async fn test_first_entry_finalise_with_errors(pool: SqlitePool) {
        finalise_with_errors(pool.clone()).await;

        // Check that it has been logged in the audit log
        let audit_log_row =
            query!(r#"SELECT event_name, json(event) as "event: serde_json::Value" FROM audit_log ORDER BY id DESC LIMIT 1"#)
                .fetch_one(&pool)
                .await
                .expect("should have audit log row");
        assert_eq!(audit_log_row.event_name, "DataEntryFinalised");

        let event: serde_json::Value = serde_json::to_value(&audit_log_row.event).unwrap();
        assert_eq!(event["data_entry_status"], "first_entry_has_errors");
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_2"))))]
    async fn test_finalise_second_data_entry(pool: SqlitePool) {
        let request_body = DataEntry::example_data_entry();

        // Save and finalise the first data entry
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

        // Save and finalise the second data entry
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
        let response = finalise(pool.clone(), 1, EntryNumber::SecondEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        // Check that polling_station_results contains the finalised result and that the data entries are deleted
        let mut conn = pool.acquire().await.unwrap();
        assert!(
            polling_station_result_repo::result_exists(&mut conn, 1)
                .await
                .unwrap()
        );

        // Check that the status is 'Definitive'
        let status = get_data_entry_status(pool.clone(), 1, 2).await;
        assert!(matches!(status, DataEntryStatus::Definitive(_)));

        // Check that we can't save a new data entry after finalising
        let response = save(
            pool.clone(),
            request_body.clone(),
            1,
            EntryNumber::FirstEntry,
        )
        .await;
        assert_eq!(response.status(), StatusCode::CONFLICT);
        let response = save(
            pool.clone(),
            request_body.clone(),
            1,
            EntryNumber::SecondEntry,
        )
        .await;
        assert_eq!(response.status(), StatusCode::CONFLICT);
    }

    async fn get_data_entry_status(
        pool: SqlitePool,
        polling_station_id: u32,
        committee_session_id: u32,
    ) -> DataEntryStatus {
        let mut conn = pool.acquire().await.unwrap();
        data_entry_repo::get(&mut conn, polling_station_id, committee_session_id)
            .await
            .unwrap()
    }
}
