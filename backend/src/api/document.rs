use axum::{
    extract::{Path, State},
    response::IntoResponse,
};
use axum_extra::response::Attachment;
use chrono::Datelike;
use pdf_gen::{generate_pdf, generate_pdfs, zip::ZipResponse};
use sqlx::SqlitePool;
use tracing::error;
use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{
    APIError, AppState, ErrorResponse,
    api::{
        committee_session::verify_committee_session_details_exist,
        middleware::authentication::RouteAuthorization,
    },
    domain::{
        election::{CommitteeCategory, ElectionId, VoteCountingMethod},
        models::{
            ModelN10_1InlegvelInput, ModelN10_1Input, ModelN10_2Input, ModelNa14_1Versie1Input,
            ModelNa31_1InlegvelInput, ModelNa31_2Bijlage1Input, ModelNa31_2InlegvelInput,
            ToPdfFileModel, votes_table::CandidatesTables,
        },
        role::Role,
    },
    error::ErrorReference,
    repository::{committee_session_repo, election_repo, user_repo::User},
    service::list_polling_stations_for_session,
};

pub fn router() -> OpenApiRouter<AppState> {
    use Role::*;

    const ALLOWED_ROLES: &[Role] = &[Administrator, CoordinatorGSB];

    OpenApiRouter::default()
        .routes(routes!(election_download_n_10_1).authorize(ALLOWED_ROLES))
        .routes(routes!(election_download_n_10_1_inlegvel).authorize(ALLOWED_ROLES))
        .routes(routes!(election_download_n_10_2).authorize(ALLOWED_ROLES))
        .routes(routes!(election_download_na_14_1_versie1).authorize(ALLOWED_ROLES))
        .routes(routes!(election_download_na_31_1_inlegvel).authorize(ALLOWED_ROLES))
        .routes(routes!(election_download_na_31_2_bijlage1).authorize(ALLOWED_ROLES))
        .routes(routes!(election_download_na_31_2_inlegvel).authorize(ALLOWED_ROLES))
}

#[utoipa::path(
    get,
    path = "/api/elections/{election_id}/download_n_10_1",
    responses(
        (
            status = 200,
            description = "ZIP",
            content_type = "application/zip",
            headers(
                ("Content-Disposition", description = "attachment; filename=\"filename.zip\"")
            )
        ),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "Not found", body = ErrorResponse),
        (status = 409, description = "Request cannot be completed", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = ElectionId, description = "Election database id"),
    ),
)]
async fn election_download_n_10_1(
    user: User,
    State(pool): State<SqlitePool>,
    Path(election_id): Path<ElectionId>,
) -> Result<impl IntoResponse, APIError> {
    let mut conn = pool.acquire().await?;
    let election = election_repo::get(&mut conn, election_id).await?;
    user.role().is_authorized(election.committee_category)?;

    if election.committee_category != CommitteeCategory::GSB
        || election.counting_method != Some(VoteCountingMethod::DSO)
    {
        return Err(APIError::NotFound(
            "N 10-1 is only available for GSB DSO elections".into(),
            ErrorReference::EntryNotFound,
        ));
    }

    let current_committee_session =
        committee_session_repo::get_election_committee_session(&mut conn, election.id).await?;
    let polling_stations = list_polling_stations_for_session(&mut conn, &current_committee_session)
        .await?
        .into_polling_stations();
    if polling_stations.is_empty() {
        return Err(APIError::NotFound(
            "No polling stations found".into(),
            ErrorReference::EntryNotFound,
        ));
    }
    drop(conn);

    let zip_filename = format!(
        "{}{}_{}_n_10_1.zip",
        election.category.to_eml_code(),
        election.election_date.year(),
        election.location
    );
    let candidates_tables = CandidatesTables::new(&election)?;
    let models = polling_stations
        .iter()
        .map(|ps| {
            let name = format!(
                "Model_N_10_1_{}{}_Stembureau_{}.pdf",
                election.category.to_eml_code(),
                election.election_date.year(),
                ps.number
            );

            Ok(ModelN10_1Input {
                candidates_tables: candidates_tables.clone(),
                election: election.clone().into(),
                polling_station: ps.clone(),
            }
            .to_pdf_file_model(name))
        })
        .collect::<Result<Vec<_>, APIError>>()?;

    let (zip_response, zip_writer) = ZipResponse::new(&zip_filename);

    tokio::spawn(async move {
        if let Err(e) = generate_pdfs(models, zip_writer).await {
            error!("Failed to generate PDFs: {e:?}");
        }
    });

    Ok(zip_response)
}

#[utoipa::path(
    get,
    path = "/api/elections/{election_id}/download_n_10_1_inlegvel",
    responses(
        (
            status = 200,
            description = "ZIP",
            content_type = "application/zip",
            headers(
                ("Content-Disposition", description = "attachment; filename=\"filename.zip\"")
            )
        ),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "Not found", body = ErrorResponse),
        (status = 409, description = "Request cannot be completed", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = ElectionId, description = "Election database id"),
    ),
)]
async fn election_download_n_10_1_inlegvel(
    user: User,
    State(pool): State<SqlitePool>,
    Path(election_id): Path<ElectionId>,
) -> Result<impl IntoResponse, APIError> {
    let mut conn = pool.acquire().await?;
    let election = election_repo::get(&mut conn, election_id).await?;
    user.role().is_authorized(election.committee_category)?;

    if election.committee_category != CommitteeCategory::GSB
        || election.counting_method != Some(VoteCountingMethod::DSO)
    {
        return Err(APIError::NotFound(
            "N 10-1 Inlegvel is only available for GSB DSO elections".into(),
            ErrorReference::EntryNotFound,
        ));
    }

    let current_committee_session =
        committee_session_repo::get_election_committee_session(&mut conn, election.id).await?;
    let polling_stations = list_polling_stations_for_session(&mut conn, &current_committee_session)
        .await?
        .into_polling_stations();
    if polling_stations.is_empty() {
        return Err(APIError::NotFound(
            "No polling stations found".into(),
            ErrorReference::EntryNotFound,
        ));
    }
    drop(conn);

    let zip_filename = format!(
        "{}{}_{}_n_10_1_Inlegvel.zip",
        election.category.to_eml_code(),
        election.election_date.year(),
        election.location
    );

    let models = polling_stations
        .iter()
        .map(|ps| {
            let name = format!(
                "Model_N_10_1_Inlegvel_{}{}_Stembureau_{}.pdf",
                election.category.to_eml_code(),
                election.election_date.year(),
                ps.number
            );

            Ok(ModelN10_1InlegvelInput {
                election: election.clone().into(),
                polling_station: ps.clone(),
            }
            .to_pdf_file_model(name))
        })
        .collect::<Result<Vec<_>, APIError>>()?;

    let (zip_response, zip_writer) = ZipResponse::new(&zip_filename);

    tokio::spawn(async move {
        if let Err(e) = generate_pdfs(models, zip_writer).await {
            error!("Failed to generate PDFs: {e:?}");
        }
    });

    Ok(zip_response)
}

#[utoipa::path(
    get,
    path = "/api/elections/{election_id}/download_n_10_2",
    responses(
        (
            status = 200,
            description = "ZIP",
            content_type = "application/zip",
            headers(
                ("Content-Disposition", description = "attachment; filename=\"filename.zip\"")
            )
        ),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "Not found", body = ErrorResponse),
        (status = 409, description = "Request cannot be completed", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = ElectionId, description = "Election database id"),
    ),
)]
async fn election_download_n_10_2(
    user: User,
    State(pool): State<SqlitePool>,
    Path(election_id): Path<ElectionId>,
) -> Result<impl IntoResponse, APIError> {
    let mut conn = pool.acquire().await?;
    let election = election_repo::get(&mut conn, election_id).await?;
    user.role().is_authorized(election.committee_category)?;

    if election.committee_category != CommitteeCategory::GSB
        || election.counting_method != Some(VoteCountingMethod::CSO)
    {
        return Err(APIError::NotFound(
            "N 10-2 is only available for GSB CSO elections".into(),
            ErrorReference::EntryNotFound,
        ));
    }

    let current_committee_session =
        committee_session_repo::get_election_committee_session(&mut conn, election.id).await?;
    let polling_stations = list_polling_stations_for_session(&mut conn, &current_committee_session)
        .await?
        .into_polling_stations();
    if polling_stations.is_empty() {
        return Err(APIError::NotFound(
            "No polling stations found".into(),
            ErrorReference::EntryNotFound,
        ));
    }
    drop(conn);

    let zip_filename = format!(
        "{}{}_{}_n_10_2.zip",
        election.category.to_eml_code(),
        election.election_date.year(),
        election.location
    );

    let models = polling_stations
        .iter()
        .map(|ps| {
            let name = format!(
                "Model_N_10_2_{}{}_Stembureau_{}.pdf",
                election.category.to_eml_code(),
                election.election_date.year(),
                ps.number
            );

            Ok(ModelN10_2Input {
                election: election.clone(),
                polling_station: ps.clone(),
            }
            .to_pdf_file_model(name))
        })
        .collect::<Result<Vec<_>, APIError>>()?;

    let (zip_response, zip_writer) = ZipResponse::new(&zip_filename);

    tokio::spawn(async move {
        if let Err(e) = generate_pdfs(models, zip_writer).await {
            error!("Failed to generate PDFs: {e:?}");
        }
    });

    Ok(zip_response)
}

#[utoipa::path(
    get,
    path = "/api/elections/{election_id}/download_na_14_1_versie1",
    responses(
        (
            status = 200,
            description = "ZIP",
            content_type = "application/zip",
            headers(
                ("Content-Disposition", description = "attachment; filename=\"filename.zip\"")
            )
        ),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "Not found", body = ErrorResponse),
        (status = 409, description = "Request cannot be completed", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = ElectionId, description = "Election database id"),
    ),
)]
async fn election_download_na_14_1_versie1(
    user: User,
    State(pool): State<SqlitePool>,
    Path(election_id): Path<ElectionId>,
) -> Result<impl IntoResponse, APIError> {
    let mut conn = pool.acquire().await?;
    let election = election_repo::get(&mut conn, election_id).await?;
    user.role().is_authorized(election.committee_category)?;

    if election.committee_category != CommitteeCategory::GSB
        || election.counting_method != Some(VoteCountingMethod::DSO)
    {
        return Err(APIError::NotFound(
            "Na 14-1 versie 1 is only available for GSB DSO elections".into(),
            ErrorReference::EntryNotFound,
        ));
    }

    let current_committee_session =
        committee_session_repo::get_election_committee_session(&mut conn, election.id).await?;
    verify_committee_session_details_exist(&current_committee_session)?;

    let polling_stations = list_polling_stations_for_session(&mut conn, &current_committee_session)
        .await?
        .into_polling_stations();
    if polling_stations.is_empty() {
        return Err(APIError::NotFound(
            "No polling stations found".into(),
            ErrorReference::EntryNotFound,
        ));
    }
    drop(conn);

    let zip_filename = format!(
        "{}{}_{}_na_14_1_versie1.zip",
        election.category.to_eml_code(),
        election.election_date.year(),
        election.location
    );
    let candidates_tables = CandidatesTables::new(&election)?;
    let models = polling_stations
        .iter()
        .map(|ps| {
            let name = format!(
                "Model_Na14-1_versie_1_{}{}_Stembureau_{}.pdf",
                election.category.to_eml_code(),
                election.election_date.year(),
                ps.number
            );

            Ok(ModelNa14_1Versie1Input {
                committee_session: current_committee_session.clone(),
                candidates_tables: candidates_tables.clone(),
                election: election.clone().into(),
                polling_station: ps.clone(),
            }
            .to_pdf_file_model(name))
        })
        .collect::<Result<Vec<_>, APIError>>()?;

    let (zip_response, zip_writer) = ZipResponse::new(&zip_filename);

    tokio::spawn(async move {
        if let Err(e) = generate_pdfs(models, zip_writer).await {
            error!("Failed to generate PDFs: {e:?}");
        }
    });

    Ok(zip_response)
}

#[utoipa::path(
    get,
    path = "/api/elections/{election_id}/download_na_31_1_inlegvel",
    responses(
        (
            status = 200,
            description = "PDF",
            content_type = "application/pdf",
            headers(
                ("Content-Disposition", description = "attachment; filename=\"filename.pdf\"")
            )
        ),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "Not found", body = ErrorResponse),
        (status = 409, description = "Request cannot be completed", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = ElectionId, description = "Election database id"),
    ),
)]
async fn election_download_na_31_1_inlegvel(
    user: User,
    State(pool): State<SqlitePool>,
    Path(election_id): Path<ElectionId>,
) -> Result<impl IntoResponse, APIError> {
    let mut conn = pool.acquire().await?;
    let election = election_repo::get(&mut conn, election_id).await?;
    drop(conn);

    user.role().is_authorized(election.committee_category)?;
    if election.committee_category != CommitteeCategory::GSB
        || election.counting_method != Some(VoteCountingMethod::DSO)
    {
        return Err(APIError::NotFound(
            "Na 31-1 Inlegvel is only available for GSB DSO elections".into(),
            ErrorReference::EntryNotFound,
        ));
    }

    let name = "Model_Na_31_1_Inlegvel.pdf".to_string();

    let input = ModelNa31_1InlegvelInput {
        election: election.into(),
    }
    .to_pdf_file_model(name.clone());

    let content = generate_pdf(input).await?;

    Ok(Attachment::new(content.buffer)
        .filename(&name)
        .content_type("application/pdf"))
}

#[utoipa::path(
    get,
    path = "/api/elections/{election_id}/download_na_31_2_bijlage1",
    responses(
        (
            status = 200,
            description = "ZIP",
            content_type = "application/zip",
            headers(
                ("Content-Disposition", description = "attachment; filename=\"filename.zip\"")
            )
        ),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "Not found", body = ErrorResponse),
        (status = 409, description = "Request cannot be completed", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = ElectionId, description = "Election database id"),
    ),
)]
async fn election_download_na_31_2_bijlage1(
    user: User,
    State(pool): State<SqlitePool>,
    Path(election_id): Path<ElectionId>,
) -> Result<impl IntoResponse, APIError> {
    let mut conn = pool.acquire().await?;
    let election = election_repo::get(&mut conn, election_id).await?;
    user.role().is_authorized(election.committee_category)?;

    if election.committee_category != CommitteeCategory::GSB
        || election.counting_method != Some(VoteCountingMethod::CSO)
    {
        return Err(APIError::NotFound(
            "Na 31-2 Bijlage 1 is only available for GSB CSO elections".into(),
            ErrorReference::EntryNotFound,
        ));
    }

    let current_committee_session =
        committee_session_repo::get_election_committee_session(&mut conn, election.id).await?;
    let polling_stations = list_polling_stations_for_session(&mut conn, &current_committee_session)
        .await?
        .into_polling_stations();
    if polling_stations.is_empty() {
        return Err(APIError::NotFound(
            "No polling stations found".into(),
            ErrorReference::EntryNotFound,
        ));
    }
    drop(conn);

    let zip_filename = format!(
        "{}{}_{}_na_31_2_bijlage1.zip",
        election.category.to_eml_code(),
        election.election_date.year(),
        election.location
    );
    let candidates_tables = CandidatesTables::new(&election)?;
    let models = polling_stations
        .iter()
        .map(|ps| {
            let name = format!(
                "Model_Na31-2_{}{}_Stembureau_{}_Bijlage_1.pdf",
                election.category.to_eml_code(),
                election.election_date.year(),
                ps.number
            );

            Ok(ModelNa31_2Bijlage1Input {
                candidates_tables: candidates_tables.clone(),
                election: election.clone().into(),
                polling_station: ps.clone(),
            }
            .to_pdf_file_model(name))
        })
        .collect::<Result<Vec<_>, APIError>>()?;

    let (zip_response, zip_writer) = ZipResponse::new(&zip_filename);

    tokio::spawn(async move {
        if let Err(e) = generate_pdfs(models, zip_writer).await {
            error!("Failed to generate PDFs: {e:?}");
        }
    });

    Ok(zip_response)
}

#[utoipa::path(
    get,
    path = "/api/elections/{election_id}/download_na_31_2_inlegvel",
    responses(
        (
            status = 200,
            description = "PDF",
            content_type = "application/pdf",
            headers(
                ("Content-Disposition", description = "attachment; filename=\"filename.pdf\"")
            )
        ),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "Not found", body = ErrorResponse),
        (status = 409, description = "Request cannot be completed", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = ElectionId, description = "Election database id"),
    ),
)]
async fn election_download_na_31_2_inlegvel(
    user: User,
    State(pool): State<SqlitePool>,
    Path(election_id): Path<ElectionId>,
) -> Result<impl IntoResponse, APIError> {
    let mut conn = pool.acquire().await?;
    let election = election_repo::get(&mut conn, election_id).await?;
    drop(conn);

    user.role().is_authorized(election.committee_category)?;
    if election.committee_category != CommitteeCategory::GSB
        || election.counting_method != Some(VoteCountingMethod::CSO)
    {
        return Err(APIError::NotFound(
            "Na 31-2 Inlegvel is only available for GSB CSO elections".into(),
            ErrorReference::EntryNotFound,
        ));
    }

    let name = "Model_Na_31_2_Inlegvel.pdf".to_string();

    let input = ModelNa31_2InlegvelInput {
        election: election.into(),
    }
    .to_pdf_file_model(name.clone());

    let content = generate_pdf(input).await?;

    Ok(Attachment::new(content.buffer)
        .filename(&name)
        .content_type("application/pdf"))
}

#[cfg(test)]
mod tests {
    use axum::{
        extract::{Path, State},
        http::StatusCode,
        response::{IntoResponse, Response},
    };
    use http_body_util::BodyExt;
    use test_log::test;

    use super::*;
    use crate::{
        api::tests::{
            assert_committee_category_authorization_err,
            assert_committee_category_authorization_ok, assert_counting_method_authorization_err,
            assert_counting_method_authorization_ok,
        },
        domain::role::Role,
        repository::user_repo::{User, UserId},
    };

    async fn call_cso_handlers(
        pool: SqlitePool,
        coordinator_role: Role,
        election_id: ElectionId,
    ) -> Vec<(&'static str, Response)> {
        let user = User::test_user(coordinator_role, UserId::from(1));

        #[rustfmt::skip]
        let results = vec![
            ("download_n_10_2", election_download_n_10_2(user.clone(), State(pool.clone()), Path(election_id)).await.into_response()),
            ("download_na_31_2_bijlage1", election_download_na_31_2_bijlage1(user.clone(), State(pool.clone()), Path(election_id)).await.into_response()),
            ("download_na_31_2_inlegvel", election_download_na_31_2_inlegvel(user.clone(), State(pool.clone()), Path(election_id)).await.into_response()),
        ];
        results
    }

    async fn call_dso_handlers(
        pool: SqlitePool,
        coordinator_role: Role,
        election_id: ElectionId,
    ) -> Vec<(&'static str, Response)> {
        let user = User::test_user(coordinator_role, UserId::from(1));

        #[rustfmt::skip]
        let results = vec![
            ("download_n_10_1", election_download_n_10_1(user.clone(), State(pool.clone()), Path(election_id)).await.into_response()),
            ("download_n_10_1_inlegvel", election_download_n_10_1_inlegvel(user.clone(), State(pool.clone()), Path(election_id)).await.into_response()),
            ("download_na_14_1_versie1", election_download_na_14_1_versie1(user.clone(), State(pool.clone()), Path(election_id)).await.into_response()),
            ("download_na_31_1_inlegvel", election_download_na_31_1_inlegvel(user.clone(), State(pool.clone()), Path(election_id)).await.into_response()),
        ];
        results
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_cso_documents_committee_category_authorization_err(pool: SqlitePool) {
        let results = call_cso_handlers(pool, Role::CoordinatorCSB, ElectionId::from(2)).await;
        assert_committee_category_authorization_err(results).await;
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_cso_documents_committee_category_authorization_ok(pool: SqlitePool) {
        let results = call_cso_handlers(pool, Role::CoordinatorGSB, ElectionId::from(2)).await;
        assert_committee_category_authorization_ok(results);
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_11_dso"))))]
    async fn test_cso_documents_counting_method_authorization_err(pool: SqlitePool) {
        let results = call_cso_handlers(pool, Role::CoordinatorGSB, ElectionId::from(11)).await;
        assert_counting_method_authorization_err(results, VoteCountingMethod::CSO).await;
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_cso_documents_counting_method_authorization_ok(pool: SqlitePool) {
        let results = call_cso_handlers(pool, Role::CoordinatorGSB, ElectionId::from(2)).await;
        assert_counting_method_authorization_ok(results);
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_11_dso"))))]
    async fn test_dso_documents_committee_category_authorization_err(pool: SqlitePool) {
        let results = call_dso_handlers(pool, Role::CoordinatorCSB, ElectionId::from(11)).await;
        assert_committee_category_authorization_err(results).await;
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_11_dso"))))]
    async fn test_dso_documents_committee_category_authorization_ok(pool: SqlitePool) {
        let results = call_dso_handlers(pool, Role::CoordinatorGSB, ElectionId::from(11)).await;
        assert_committee_category_authorization_ok(results);
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_dso_documents_counting_method_authorization_err(pool: SqlitePool) {
        let results = call_dso_handlers(pool, Role::CoordinatorGSB, ElectionId::from(2)).await;
        assert_counting_method_authorization_err(results, VoteCountingMethod::DSO).await;
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_11_dso"))))]
    async fn test_dso_documents_counting_method_authorization_ok(pool: SqlitePool) {
        let results = call_dso_handlers(pool, Role::CoordinatorGSB, ElectionId::from(11)).await;
        assert_counting_method_authorization_ok(results);
    }

    #[test(sqlx::test(fixtures(
        path = "../../fixtures",
        scripts("election_12_dso_with_results")
    )))]
    async fn test_na_14_1_versie_1_committee_session_missing_details_err(pool: SqlitePool) {
        let user = User::test_user(Role::CoordinatorGSB, UserId::from(1));
        let response = election_download_na_14_1_versie1(
            user.clone(),
            State(pool.clone()),
            Path(ElectionId::from(12)),
        )
        .await
        .into_response();
        let status = response.status();
        assert_eq!(
            status,
            StatusCode::NOT_FOUND,
            "handler 'download_na_14_1_versie1'"
        );

        let body = response.into_body().collect().await.unwrap().to_bytes();
        let error: ErrorResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(
            error.reference,
            ErrorReference::EntryNotFound,
            "handler 'download_na_14_1_versie1'"
        );
        let expected_error =
            "Committee session is missing start date, start time and location details";
        assert!(
            error.error.contains(expected_error),
            "handler 'download_na_14_1_versie1'"
        );
    }
}
