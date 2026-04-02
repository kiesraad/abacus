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
    api::middleware::authentication::RouteAuthorization,
    domain::{
        election::{CommitteeCategory, ElectionId},
        models::{
            ModelN10_2Input, ModelNa31_2Bijlage1Input, ModelNa31_2InlegvelInput, ToPdfFileModel,
        },
        role::Role,
        votes_table::CandidatesTables,
    },
    error::ErrorReference,
    repository::{committee_session_repo, election_repo, user_repo::User},
    service::list_polling_stations_for_session,
};

pub fn router() -> OpenApiRouter<AppState> {
    use Role::*;

    const ALLOWED_ROLES: &[Role] = &[Administrator, CoordinatorGSB];

    OpenApiRouter::default()
        .routes(routes!(election_download_n_10_2).authorize(ALLOWED_ROLES))
        .routes(routes!(election_download_na_31_2_bijlage1).authorize(ALLOWED_ROLES))
        .routes(routes!(election_download_na_31_2_inlegvel).authorize(ALLOWED_ROLES))
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
    user.role().is_authorized(&election.committee_category)?;

    if election.committee_category != CommitteeCategory::GSB {
        return Err(APIError::NotFound(
            "N 10-2 is only available for GSB elections".into(),
            ErrorReference::EntryNotFound,
        ));
    }

    let current_committee_session =
        committee_session_repo::get_election_committee_session(&mut conn, election.id).await?;
    let polling_stations = list_polling_stations_for_session(&mut conn, &current_committee_session)
        .await?
        .into_polling_stations();
    drop(conn);

    let zip_filename = format!(
        "{}{}_{}_n_10_2.zip",
        election.category.to_eml_code(),
        election.election_date.year(),
        election.location
    );

    if polling_stations.is_empty() {
        return Err(APIError::NotFound(
            "No polling stations found".into(),
            ErrorReference::EntryNotFound,
        ));
    }

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
        if let Err(e) = generate_pdfs(&models, zip_writer).await {
            error!("Failed to generate PDFs: {e:?}");
        }
    });

    Ok(zip_response)
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
    user.role().is_authorized(&election.committee_category)?;

    if election.committee_category != CommitteeCategory::GSB {
        return Err(APIError::NotFound(
            "Na 31-2 Bijlage 1 is only available for GSB elections".into(),
            ErrorReference::EntryNotFound,
        ));
    }

    let current_committee_session =
        committee_session_repo::get_election_committee_session(&mut conn, election.id).await?;
    let polling_stations = list_polling_stations_for_session(&mut conn, &current_committee_session)
        .await?
        .into_polling_stations();
    drop(conn);

    let zip_filename = format!(
        "{}{}_{}_na_31_2_bijlage1.zip",
        election.category.to_eml_code(),
        election.election_date.year(),
        election.location
    );

    if polling_stations.is_empty() {
        return Err(APIError::NotFound(
            "No polling stations found".into(),
            ErrorReference::EntryNotFound,
        ));
    }

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
                candidates_tables: CandidatesTables::new(&election)?,
                election: election.clone().into(),
                polling_station: ps.clone(),
            }
            .to_pdf_file_model(name))
        })
        .collect::<Result<Vec<_>, APIError>>()?;

    let (zip_response, zip_writer) = ZipResponse::new(&zip_filename);

    tokio::spawn(async move {
        if let Err(e) = generate_pdfs(&models, zip_writer).await {
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

    user.role().is_authorized(&election.committee_category)?;
    if election.committee_category != CommitteeCategory::GSB {
        return Err(APIError::NotFound(
            "Na 31-2 Inlegvel is only available for GSB elections".into(),
            ErrorReference::EntryNotFound,
        ));
    }

    let name = "Model_Na_31_2_Inlegvel.pdf".to_string();

    let input = ModelNa31_2InlegvelInput {
        election: election.into(),
    }
    .to_pdf_file_model(name.clone());

    let content = generate_pdf(&input).await?;

    Ok(Attachment::new(content.buffer)
        .filename(&name)
        .content_type("application/pdf"))
}

#[cfg(test)]
mod tests {
    use axum::{
        extract::{Path, State},
        response::{IntoResponse, Response},
    };
    use test_log::test;

    use super::*;
    use crate::{
        api::tests::{
            assert_committee_category_authorization_err, assert_committee_category_authorization_ok,
        },
        domain::role::Role,
        repository::user_repo::{User, UserId},
    };

    async fn call_handlers(
        pool: SqlitePool,
        coordinator_role: Role,
    ) -> Vec<(&'static str, Response)> {
        let user = User::test_user(coordinator_role, UserId::from(1));
        let election_id = ElectionId::from(2);

        #[rustfmt::skip]
        let results = vec![
            ("download_n_10_2", election_download_n_10_2(user.clone(), State(pool.clone()), Path(election_id)).await.into_response()),
            ("download_na_31_2_bijlage1", election_download_na_31_2_bijlage1(user.clone(), State(pool.clone()), Path(election_id)).await.into_response()),
            ("download_na_31_2_inlegvel", election_download_na_31_2_inlegvel(user.clone(), State(pool.clone()), Path(election_id)).await.into_response()),
        ];
        results
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_committee_category_authorization_err(pool: SqlitePool) {
        let results = call_handlers(pool, Role::CoordinatorCSB).await;
        assert_committee_category_authorization_err(results).await;
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_committee_category_authorization_ok(pool: SqlitePool) {
        let results = call_handlers(pool, Role::CoordinatorGSB).await;
        assert_committee_category_authorization_ok(results);
    }
}
