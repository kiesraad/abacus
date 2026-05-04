use axum::{
    extract::{Path, State},
    response::IntoResponse,
};
use chrono::Local;
use pdf_gen::zip::{ZipResponse, ZipResponseError, zip_single_file};
use sqlx::SqlitePool;

use crate::{
    APIError, ErrorResponse,
    api::report::{
        files::{get_files_csb_election, get_files_gsb_election},
        naming,
    },
    domain::{committee_session::CommitteeSessionId, election::ElectionId},
    infra::audit_log::AuditService,
    repository::{
        committee_session_repo::{self},
        election_repo,
        user_repo::User,
    },
};

/// Download a zip containing a PDF for the PV and the EML with GSB election results
#[utoipa::path(
    get,
    path = "/api/elections/{election_id}/committee_sessions/{committee_session_id}/download_zip_results",
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
        ("committee_session_id" = CommitteeSessionId, description = "Committee session database id"),
    ),
)]
pub async fn election_download_zip_results_gsb(
    user: User,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path((election_id, committee_session_id)): Path<(ElectionId, CommitteeSessionId)>,
) -> Result<impl IntoResponse, APIError> {
    let mut conn = pool.acquire().await?;

    let committee_category =
        committee_session_repo::get_committee_category(&mut conn, committee_session_id).await?;
    user.role().is_authorized(&committee_category)?;

    let election = election_repo::get(&mut conn, election_id).await?;
    let committee_session = committee_session_repo::get(&mut conn, committee_session_id).await?;
    let files = get_files_gsb_election(&pool, audit_service, committee_session.id).await?;
    drop(conn);

    let download_zip_filename = naming::download_zip_filename(
        naming::ZipDownloadType::GsbResults,
        &election,
        committee_session.is_next_session(),
        files.created_at().with_timezone(&Local),
    );

    let (zip_response, mut zip_writer) = ZipResponse::new(&download_zip_filename);

    tokio::spawn(async move {
        if let Some(pdf_file) = files.results_pdf {
            zip_writer.add_file(&pdf_file.name, &pdf_file.data).await?;
        }

        if let Some(eml_file) = files.results_eml {
            let xml_zip_filename = naming::with_zip_extension(&eml_file.name);
            let xml_zip = zip_single_file(&eml_file.name, &eml_file.data).await?;
            zip_writer.add_file(&xml_zip_filename, &xml_zip).await?;
        }

        if let Some(overview_file) = files.overview_pdf {
            zip_writer
                .add_file(&overview_file.name, &overview_file.data)
                .await?;
        }

        zip_writer.finish().await?;

        Ok::<(), ZipResponseError>(())
    });

    Ok(zip_response)
}

/// Download a zip containing a PDF for the PV and the EML with CSB election results
#[utoipa::path(
    get,
    path = "/api/elections/{election_id}/committee_sessions/{committee_session_id}/download_zip_results_csb",
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
        ("committee_session_id" = CommitteeSessionId, description = "Committee session database id"),
    ),
)]
pub async fn election_download_zip_results_csb(
    user: User,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path((election_id, committee_session_id)): Path<(ElectionId, CommitteeSessionId)>,
) -> Result<impl IntoResponse, APIError> {
    let mut conn = pool.acquire().await?;

    let committee_category =
        committee_session_repo::get_committee_category(&mut conn, committee_session_id).await?;
    user.role().is_authorized(&committee_category)?;

    let election = election_repo::get(&mut conn, election_id).await?;
    let committee_session = committee_session_repo::get(&mut conn, committee_session_id).await?;
    let files = get_files_csb_election(&pool, audit_service, committee_session.id).await?;
    drop(conn);

    let download_zip_filename = naming::download_zip_filename(
        naming::ZipDownloadType::CsbResults,
        &election,
        false,
        files.created_at().with_timezone(&Local),
    );

    let (zip_response, mut zip_writer) = ZipResponse::new(&download_zip_filename);

    tokio::spawn(async move {
        if let Some(pdf_file) = files.results_pdf {
            zip_writer.add_file(&pdf_file.name, &pdf_file.data).await?;
        }

        if let Some(eml_results_file) = files.results_eml {
            let xml_zip_filename = naming::with_zip_extension(&eml_results_file.name);
            let xml_zip = zip_single_file(&eml_results_file.name, &eml_results_file.data).await?;
            zip_writer.add_file(&xml_zip_filename, &xml_zip).await?;
        }

        zip_writer.finish().await?;

        Ok::<(), ZipResponseError>(())
    });

    Ok(zip_response)
}

/// Download a zip containing a PDF with model P 22-2 Bijlage 1 for CSB
#[utoipa::path(
    get,
    path = "/api/elections/{election_id}/committee_sessions/{committee_session_id}/download_zip_attachment_csb",
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
        ("committee_session_id" = CommitteeSessionId, description = "Committee session database id"),
    ),
)]
pub async fn election_download_zip_attachment_csb(
    user: User,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path((election_id, committee_session_id)): Path<(ElectionId, CommitteeSessionId)>,
) -> Result<impl IntoResponse, APIError> {
    let mut conn = pool.acquire().await?;

    let committee_category =
        committee_session_repo::get_committee_category(&mut conn, committee_session_id).await?;
    user.role().is_authorized(&committee_category)?;

    let election = election_repo::get(&mut conn, election_id).await?;
    let committee_session = committee_session_repo::get(&mut conn, committee_session_id).await?;
    let files = get_files_csb_election(&pool, audit_service, committee_session.id).await?;
    drop(conn);

    let download_zip_filename = naming::download_zip_filename(
        naming::ZipDownloadType::CsbAttachment,
        &election,
        false,
        files.created_at().with_timezone(&Local),
    );

    let (zip_response, mut zip_writer) = ZipResponse::new(&download_zip_filename);

    tokio::spawn(async move {
        if let Some(attachment_pdf_file) = files.attachment_pdf {
            zip_writer
                .add_file(&attachment_pdf_file.name, &attachment_pdf_file.data)
                .await?;
        }

        zip_writer.finish().await?;

        Ok::<(), ZipResponseError>(())
    });

    Ok(zip_response)
}

/// Download a zip containing a zip with the EML with CSB total counts
#[utoipa::path(
    get,
    path = "/api/elections/{election_id}/committee_sessions/{committee_session_id}/download_zip_total_counts_csb",
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
        ("committee_session_id" = CommitteeSessionId, description = "Committee session database id"),
    ),
)]
pub async fn election_download_zip_total_counts_csb(
    user: User,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path((election_id, committee_session_id)): Path<(ElectionId, CommitteeSessionId)>,
) -> Result<impl IntoResponse, APIError> {
    let mut conn = pool.acquire().await?;

    let committee_category =
        committee_session_repo::get_committee_category(&mut conn, committee_session_id).await?;
    user.role().is_authorized(&committee_category)?;

    let election = election_repo::get(&mut conn, election_id).await?;
    let committee_session = committee_session_repo::get(&mut conn, committee_session_id).await?;
    let files = get_files_csb_election(&pool, audit_service, committee_session.id).await?;
    drop(conn);

    let download_zip_filename = naming::download_zip_filename(
        naming::ZipDownloadType::CsbTotalCounts,
        &election,
        false,
        files.created_at().with_timezone(&Local),
    );

    let (zip_response, mut zip_writer) = ZipResponse::new(&download_zip_filename);

    tokio::spawn(async move {
        if let Some(total_counts_eml_file) = files.total_counts_eml {
            let xml_zip_filename = naming::with_zip_extension(&total_counts_eml_file.name);
            let xml_zip =
                zip_single_file(&total_counts_eml_file.name, &total_counts_eml_file.data).await?;
            zip_writer.add_file(&xml_zip_filename, &xml_zip).await?;
        }

        zip_writer.finish().await?;

        Ok::<(), ZipResponseError>(())
    });

    Ok(zip_response)
}

#[cfg(test)]
mod tests {
    use axum::{
        extract::{Path, State},
        response::{IntoResponse, Response},
    };
    use chrono::NaiveDateTime;
    use sqlx::SqlitePool;
    use test_log::test;

    use super::*;
    use crate::{
        api::tests::{
            assert_committee_category_authorization_err, assert_committee_category_authorization_ok,
        },
        domain::{committee_session_status::CommitteeSessionStatus, role::Role},
        repository::{
            committee_session_repo::{self, change_status},
            user_repo::{User, UserId},
        },
    };

    async fn call_handlers_gsb(
        pool: SqlitePool,
        coordinator_role: Role,
    ) -> Vec<(&'static str, Response)> {
        let user = User::test_user(coordinator_role, UserId::from(1));
        let audit = AuditService::new(Some(user.clone()), None);
        let election_id = ElectionId::from(5);
        let committee_session_id = CommitteeSessionId::from(5);

        #[rustfmt::skip]
            let results = vec![
                ("download_zip_results_gsb", election_download_zip_results_gsb(user.clone(), State(pool.clone()), audit.clone(), Path((election_id, committee_session_id))).await.into_response()),
            ];
        results
    }

    async fn call_handlers_csb(
        pool: SqlitePool,
        coordinator_role: Role,
    ) -> Vec<(&'static str, Response)> {
        let mut conn = pool.acquire().await.unwrap();
        let user = User::test_user(coordinator_role, UserId::from(1));
        let audit = AuditService::new(Some(user.clone()), None);
        let election_id = ElectionId::from(8);
        let committee_session_id = CommitteeSessionId::from(801);

        // Change committee session status to completed
        change_status(
            &mut conn,
            committee_session_id,
            CommitteeSessionStatus::Completed,
        )
        .await
        .unwrap();

        // Change committee session details
        committee_session_repo::update(
            &mut conn,
            committee_session_id,
            "Juinen".to_string(),
            NaiveDateTime::parse_from_str("2026-03-19T09:15", "%Y-%m-%dT%H:%M").unwrap(),
        )
        .await
        .unwrap();

        #[rustfmt::skip]
            let results = vec![
                ("download_zip_results_csb", election_download_zip_results_csb(user.clone(), State(pool.clone()), audit.clone(), Path((election_id, committee_session_id))).await.into_response()),
                ("download_zip_attachment_csb", election_download_zip_attachment_csb(user.clone(), State(pool.clone()), audit.clone(), Path((election_id, committee_session_id))).await.into_response()),
                ("download_zip_total_counts_csb", election_download_zip_total_counts_csb(user.clone(), State(pool.clone()), audit.clone(), Path((election_id, committee_session_id))).await.into_response()),
            ];
        results
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_5_with_results"))))]
    async fn test_gsb_election_committee_category_authorization_err(pool: SqlitePool) {
        let results = call_handlers_gsb(pool, Role::CoordinatorCSB).await;
        assert_committee_category_authorization_err(results).await;
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_5_with_results"))))]
    async fn test_gsb_election_committee_category_authorization_ok(pool: SqlitePool) {
        let results = call_handlers_gsb(pool, Role::CoordinatorGSB).await;
        assert_committee_category_authorization_ok(results);
    }

    #[test(sqlx::test(fixtures(
        path = "../../../fixtures",
        scripts("election_8_csb_with_results")
    )))]
    async fn test_csb_election_committee_category_authorization_err(pool: SqlitePool) {
        let results = call_handlers_csb(pool, Role::CoordinatorGSB).await;
        assert_committee_category_authorization_err(results).await;
    }

    #[test(sqlx::test(fixtures(
        path = "../../../fixtures",
        scripts("election_8_csb_with_results")
    )))]
    async fn test_csb_election_committee_category_authorization_ok(pool: SqlitePool) {
        let results = call_handlers_csb(pool, Role::CoordinatorCSB).await;
        assert_committee_category_authorization_ok(results);
    }
}
