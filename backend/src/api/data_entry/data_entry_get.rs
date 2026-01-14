use axum::{
    Json,
    extract::{Path, State},
};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use utoipa::ToSchema;

use crate::{
    APIError, ErrorResponse,
    authentication::Coordinator,
    domain::{
        data_entry_status::{DataEntryStatus, DataEntryStatusName},
        polling_station_results::PollingStationResults,
        validate::{ValidateRoot, ValidationResults},
    },
    error::ErrorReference,
    repository::polling_station_result_repo,
    service::data_entry::validate_and_get_data,
};

/// Get data entry with validation results
#[utoipa::path(
    get,
    path = "/api/polling_stations/{polling_station_id}/data_entries/get",
    responses(
        (status = 200, description = "Data entry with validation results", body = DataEntryGetResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "Data entry not found", body = ErrorResponse),
        (status = 409, description = "Request cannot be completed", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("polling_station_id" = u32, description = "Polling station database id"),
    ),
    security(("cookie_auth" = ["coordinator"])),
)]
pub async fn polling_station_data_entry_get(
    user: Coordinator,
    State(pool): State<SqlitePool>,
    Path(polling_station_id): Path<u32>,
) -> Result<Json<DataEntryGetResponse>, APIError> {
    let mut conn = pool.acquire().await?;

    let (polling_station, election, committee_session, state) =
        validate_and_get_data(&mut conn, polling_station_id, &user.0).await?;

    match state.clone() {
        DataEntryStatus::FirstEntryInProgress(first_entry_in_progress_state) => {
            Ok(Json(DataEntryGetResponse {
                user_id: Some(first_entry_in_progress_state.first_entry_user_id),
                data: first_entry_in_progress_state.first_entry,
                status: state.status_name(),
                validation_results: ValidationResults::default(),
            }))
        }
        DataEntryStatus::FirstEntryHasErrors(first_entry_has_errors_state) => {
            Ok(Json(DataEntryGetResponse {
                user_id: Some(first_entry_has_errors_state.first_entry_user_id),
                data: first_entry_has_errors_state.finalised_first_entry,
                status: state.status_name(),
                validation_results: state.start_validate(&polling_station, &election)?,
            }))
        }
        DataEntryStatus::SecondEntryNotStarted(second_entry_not_started_state) => {
            Ok(Json(DataEntryGetResponse {
                user_id: Some(second_entry_not_started_state.first_entry_user_id),
                data: second_entry_not_started_state.finalised_first_entry,
                status: state.status_name(),
                validation_results: state.start_validate(&polling_station, &election)?,
            }))
        }
        DataEntryStatus::SecondEntryInProgress(second_entry_in_progress_state) => {
            Ok(Json(DataEntryGetResponse {
                user_id: Some(second_entry_in_progress_state.second_entry_user_id),
                data: second_entry_in_progress_state.second_entry,
                status: state.status_name(),
                validation_results: ValidationResults::default(),
            }))
        }
        DataEntryStatus::Definitive(_) => {
            let result = polling_station_result_repo::get_result(
                &mut conn,
                polling_station_id,
                committee_session.id,
            )
            .await?;
            let data_entry = result.data.0;

            let validation_results = data_entry.start_validate(&polling_station, &election)?;

            Ok(Json(DataEntryGetResponse {
                user_id: None,
                data: data_entry,
                status: state.status_name(),
                validation_results,
            }))
        }
        _ => Err(APIError::Conflict(
            "Data entry is in the wrong state".to_string(),
            ErrorReference::DataEntryGetNotAllowed,
        )),
    }
}

#[derive(Serialize, Deserialize, ToSchema, Debug)]
#[serde(deny_unknown_fields)]
pub struct DataEntryGetResponse {
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub user_id: Option<u32>,
    pub data: PollingStationResults,
    pub status: DataEntryStatusName,
    pub validation_results: ValidationResults,
}

#[cfg(test)]
mod tests {
    use axum::response::IntoResponse;
    use http_body_util::BodyExt;
    use test_log::test;

    use super::*;
    use crate::{
        api::data_entry::{
            data_entry_claim::tests::claim,
            data_entry_finalise::tests::finalise,
            data_entry_save::{DataEntry, tests::save},
        },
        authentication::{Role, User},
        domain::{
            entry_number::EntryNumber,
            validate::{ValidationResult, ValidationResultCode},
        },
    };

    async fn call_polling_station_data_entry_get(
        pool: SqlitePool,
        polling_station_id: u32,
    ) -> Result<DataEntryGetResponse, ErrorResponse> {
        let user = User::test_user(Role::Coordinator, 1);
        let response = polling_station_data_entry_get(
            Coordinator(user),
            State(pool),
            Path(polling_station_id),
        )
        .await
        .into_response();

        let is_success = response.status().is_success();
        let body = response.into_body().collect().await.unwrap().to_bytes();

        if is_success {
            Ok(serde_json::from_slice(&body).unwrap())
        } else {
            Err(serde_json::from_slice(&body).unwrap())
        }
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_2"))))]
    async fn test_status_first_entry_not_started(pool: SqlitePool) {
        let result = call_polling_station_data_entry_get(pool.clone(), 1)
            .await
            .err()
            .unwrap();

        assert_eq!(result.reference, ErrorReference::DataEntryGetNotAllowed);
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_2"))))]
    async fn test_status_first_entry_in_progress(pool: SqlitePool) {
        claim(pool.clone(), 1, EntryNumber::FirstEntry).await;

        let result = call_polling_station_data_entry_get(pool.clone(), 1)
            .await
            .unwrap();

        assert_eq!(result.status, DataEntryStatusName::FirstEntryInProgress);
        assert_eq!(result.user_id, Some(1));
        assert_eq!(result.data.as_common().voters_counts.poll_card_count, 0);
        assert!(!result.validation_results.has_errors());
        assert!(!result.validation_results.has_warnings());
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_2"))))]
    async fn test_status_first_entry_has_errors(pool: SqlitePool) {
        let mut data_entry_body = DataEntry::example_data_entry();
        data_entry_body.data.voters_counts_mut().poll_card_count = 1234; // incorrect value

        claim(pool.clone(), 1, EntryNumber::FirstEntry).await;
        save(pool.clone(), data_entry_body, 1, EntryNumber::FirstEntry).await;
        finalise(pool.clone(), 1, EntryNumber::FirstEntry).await;

        let result = call_polling_station_data_entry_get(pool.clone(), 1)
            .await
            .unwrap();

        assert_eq!(result.status, DataEntryStatusName::FirstEntryHasErrors);
        assert_eq!(result.user_id, Some(1));
        assert_eq!(result.data.as_common().voters_counts.poll_card_count, 1234);
        assert_eq!(
            result.validation_results.errors,
            [ValidationResult {
                code: ValidationResultCode::F201,
                fields: vec![
                    "data.voters_counts.poll_card_count".into(),
                    "data.voters_counts.proxy_certificate_count".into(),
                    "data.voters_counts.total_admitted_voters_count".into()
                ],
                context: None,
            },]
        );
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_2"))))]
    async fn test_status_second_entry_not_started(pool: SqlitePool) {
        claim(pool.clone(), 1, EntryNumber::FirstEntry).await;
        save(
            pool.clone(),
            DataEntry::example_data_entry_with_warning(),
            1,
            EntryNumber::FirstEntry,
        )
        .await;
        finalise(pool.clone(), 1, EntryNumber::FirstEntry).await;

        let result = call_polling_station_data_entry_get(pool.clone(), 1)
            .await
            .unwrap();

        assert_eq!(result.status, DataEntryStatusName::SecondEntryNotStarted);
        assert_eq!(result.user_id, Some(1));
        assert_eq!(result.data.as_common().voters_counts.poll_card_count, 199);
        assert!(!result.validation_results.has_errors());
        assert!(result.validation_results.has_warnings());
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_2"))))]
    async fn test_status_second_entry_in_progress(pool: SqlitePool) {
        // Complete first entry
        let data_entry_body = DataEntry::example_data_entry_with_warning();
        claim(pool.clone(), 1, EntryNumber::FirstEntry).await;
        save(pool.clone(), data_entry_body, 1, EntryNumber::FirstEntry).await;
        finalise(pool.clone(), 1, EntryNumber::FirstEntry).await;

        // Start second entry
        claim(pool.clone(), 1, EntryNumber::SecondEntry).await;

        let result = call_polling_station_data_entry_get(pool.clone(), 1)
            .await
            .unwrap();

        assert_eq!(result.status, DataEntryStatusName::SecondEntryInProgress);
        assert_eq!(result.user_id, Some(2));
        assert_eq!(result.data.as_common().voters_counts.poll_card_count, 0);
        assert!(!result.validation_results.has_errors());
        assert!(!result.validation_results.has_warnings());
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_2"))))]
    async fn test_status_entries_different(pool: SqlitePool) {
        // Complete first entry
        let data_entry_body = DataEntry::example_data_entry();
        claim(pool.clone(), 1, EntryNumber::FirstEntry).await;
        save(pool.clone(), data_entry_body, 1, EntryNumber::FirstEntry).await;
        finalise(pool.clone(), 1, EntryNumber::FirstEntry).await;

        // Start and complete second entry with different values
        let mut data_entry_body = DataEntry::example_data_entry();
        data_entry_body.data.voters_counts_mut().poll_card_count = 80;
        data_entry_body
            .data
            .voters_counts_mut()
            .proxy_certificate_count = 20;

        claim(pool.clone(), 1, EntryNumber::SecondEntry).await;
        save(pool.clone(), data_entry_body, 1, EntryNumber::SecondEntry).await;
        finalise(pool.clone(), 1, EntryNumber::SecondEntry).await;

        let result = call_polling_station_data_entry_get(pool.clone(), 1)
            .await
            .err()
            .unwrap();

        assert_eq!(result.reference, ErrorReference::DataEntryGetNotAllowed);
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_2"))))]
    async fn test_status_definitive(pool: SqlitePool) {
        // Complete first entry
        let data_entry_body = DataEntry::example_data_entry_with_warning();
        claim(pool.clone(), 1, EntryNumber::FirstEntry).await;
        save(pool.clone(), data_entry_body, 1, EntryNumber::FirstEntry).await;
        finalise(pool.clone(), 1, EntryNumber::FirstEntry).await;

        // Complete second entry
        let data_entry_body = DataEntry::example_data_entry_with_warning();
        claim(pool.clone(), 1, EntryNumber::SecondEntry).await;
        save(pool.clone(), data_entry_body, 1, EntryNumber::SecondEntry).await;
        finalise(pool.clone(), 1, EntryNumber::SecondEntry).await;

        let result = call_polling_station_data_entry_get(pool.clone(), 1)
            .await
            .unwrap();

        assert_eq!(result.status, DataEntryStatusName::Definitive);
        assert_eq!(result.user_id, None);
        assert!(!result.validation_results.has_errors());
        assert!(result.validation_results.has_warnings());
    }
}
