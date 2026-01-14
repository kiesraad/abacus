use axum::{
    extract::{Path, State},
    response::IntoResponse,
};
use axum_extra::response::Attachment;
use chrono::{DateTime, Local, Utc};
use sqlx::{SqliteConnection, SqlitePool};

use crate::{
    APIError, ErrorResponse, SqlitePoolExt,
    api::election::committee_session::CommitteeSessionError,
    authentication::Coordinator,
    domain::{
        committee_session::{CommitteeSession, CommitteeSessionFilesUpdateRequest},
        committee_session_status::CommitteeSessionStatus,
        election::{ElectionId, ElectionWithPoliticalGroups},
        file::File,
        results_input::ResultsInput,
    },
    eml::{EMLDocument, EmlHash},
    error::ErrorReference,
    infra::zip::{ZipResponse, ZipResponseError, zip_single_file},
    repository::{
        committee_session_repo::change_files, election_repo, file_repo,
        investigation_repo::list_investigations_for_committee_session,
    },
    service::{
        audit_log::{AuditEvent, AuditService},
        data_entry::are_results_complete_for_committee_session,
        pdf_gen::generate_pdf,
    },
};

const EML_MIME_TYPE: &str = "text/xml";
const PDF_MIME_TYPE: &str = "application/pdf";

fn download_zip_filename(
    election: &ElectionWithPoliticalGroups,
    committee_session: &CommitteeSession,
    created_at: DateTime<Local>,
) -> String {
    use chrono::Datelike;

    use crate::infra::zip::slugify_filename;
    let location = election.location.to_lowercase();
    let location_without_whitespace: String = location.split_whitespace().collect();
    slugify_filename(&format!(
        "{} {}{} {} gemeente {}-{}-{}.zip",
        if committee_session.is_next_session() {
            "correctie"
        } else {
            "definitieve-documenten"
        },
        election.category.to_eml_code().to_lowercase(),
        election.election_date.year(),
        location_without_whitespace,
        location.replace(" ", "-"),
        created_at.date_naive().format("%Y%m%d"),
        created_at.time().format("%H%M%S"),
    ))
}

fn xml_zip_filename(election: &ElectionWithPoliticalGroups) -> String {
    use chrono::Datelike;

    use crate::infra::zip::slugify_filename;
    let location_without_whitespace: String = election.location.split_whitespace().collect();
    slugify_filename(&format!(
        "Telling {}{} {}.zip",
        election.category.to_eml_code(),
        election.election_date.year(),
        location_without_whitespace
    ))
}

async fn generate_and_save_files(
    conn: &mut SqliteConnection,
    audit_service: &AuditService,
    committee_session: CommitteeSession,
    corrections: bool,
    input: ResultsInput,
) -> Result<(Option<File>, Option<File>, Option<File>), APIError> {
    let mut eml_file: Option<File> = None;
    let mut pdf_file: Option<File> = None;
    let mut overview_pdf_file: Option<File> = None;
    let created_at = input.created_at.with_timezone(&Utc);
    let xml_string = input.as_xml().to_xml_string()?;

    let xml_hash = EmlHash::from(xml_string.as_bytes());
    let xml_filename = input.xml_filename();
    let pdf_files = input.into_pdf_file_models(xml_hash)?;

    // For the first session, or if there are corrections, we also store the EML and count PDF
    // For next sessions without corrections, we don't store these
    if !committee_session.is_next_session() || corrections {
        let eml = create_file(
            conn,
            audit_service,
            xml_filename,
            xml_string.as_bytes(),
            EML_MIME_TYPE.to_string(),
            created_at,
        )
        .await?;

        let pdf = create_file(
            conn,
            audit_service,
            pdf_files.results.file_name.clone(),
            &generate_pdf(pdf_files.results).await?.buffer,
            PDF_MIME_TYPE.to_string(),
            created_at,
        )
        .await?;

        eml_file = Some(eml);
        pdf_file = Some(pdf);
    }

    // Store the overview PDF for next sessions
    if let Some(overview_pdf) = pdf_files.overview {
        let overview_pdf = create_file(
            conn,
            audit_service,
            overview_pdf.file_name.clone(),
            &generate_pdf(overview_pdf).await?.buffer,
            PDF_MIME_TYPE.to_string(),
            created_at,
        )
        .await?;

        overview_pdf_file = Some(overview_pdf);
    }
    change_files(
        conn,
        committee_session.id,
        CommitteeSessionFilesUpdateRequest {
            results_eml: eml_file.as_ref().map(|eml| eml.id),
            results_pdf: pdf_file.as_ref().map(|pdf| pdf.id),
            overview_pdf: overview_pdf_file.as_ref().map(|overview| overview.id),
        },
    )
    .await?;

    Ok((eml_file, pdf_file, overview_pdf_file))
}

pub async fn create_file(
    conn: &mut SqliteConnection,
    audit_service: &AuditService,
    filename: String,
    data: &[u8],
    mime_type: String,
    created_at: DateTime<Utc>,
) -> Result<File, APIError> {
    let file = file_repo::create(conn, filename, data, mime_type, created_at).await?;

    audit_service
        .log(conn, &AuditEvent::FileCreated(file.clone().into()), None)
        .await?;
    Ok(file)
}

async fn get_existing_files(
    conn: &mut SqliteConnection,
    committee_session: &CommitteeSession,
) -> Result<(Option<File>, Option<File>, Option<File>, DateTime<Utc>), APIError> {
    let mut created_at = Utc::now();
    let mut eml_file: Option<File> = None;
    let mut pdf_file: Option<File> = None;
    let mut overview_pdf_file: Option<File> = None;
    if let Some(eml_id) = committee_session.results_eml {
        let file = file_repo::get(conn, eml_id).await?;
        created_at = file.created_at;
        eml_file = Some(file);
    }
    if let Some(pdf_id) = committee_session.results_pdf {
        let file = file_repo::get(conn, pdf_id).await?;
        created_at = file.created_at;
        pdf_file = Some(file);
    }
    if let Some(overview_pdf_id) = committee_session.overview_pdf {
        let file = file_repo::get(conn, overview_pdf_id).await?;
        created_at = file.created_at;
        overview_pdf_file = Some(file);
    }
    Ok((eml_file, pdf_file, overview_pdf_file, created_at))
}

async fn get_files(
    pool: &SqlitePool,
    audit_service: AuditService,
    committee_session_id: u32,
) -> Result<(Option<File>, Option<File>, Option<File>, DateTime<Utc>), APIError> {
    let mut conn = pool.acquire().await?;
    let committee_session =
        crate::repository::committee_session_repo::get(&mut conn, committee_session_id).await?;
    let investigations =
        list_investigations_for_committee_session(&mut conn, committee_session.id).await?;
    let corrections = investigations
        .iter()
        .any(|inv| matches!(inv.corrected_results, Some(true)));

    // Only generate files if the committee session is finished and has all the data needed
    if committee_session.status != CommitteeSessionStatus::DataEntryFinished
        || committee_session.start_date_time.is_none()
        || !are_results_complete_for_committee_session(&mut conn, committee_session.id).await?
    {
        return Err(APIError::CommitteeSession(
            CommitteeSessionError::InvalidCommitteeSessionStatus,
        ));
    }

    // Check if files exist, if so, get files from database
    let (mut eml_file, mut pdf_file, mut overview_pdf_file, mut created_at) =
        get_existing_files(&mut conn, &committee_session).await?;
    drop(conn);

    // Determine if we need to generate any of the files
    let generate_files = if committee_session.is_next_session() {
        if corrections {
            eml_file.is_none() || pdf_file.is_none() || overview_pdf_file.is_none()
        } else {
            overview_pdf_file.is_none()
        }
    } else {
        eml_file.is_none() || pdf_file.is_none()
    };

    // If one of the files doesn't exist, generate all and save them to the database
    if generate_files {
        created_at = Utc::now();
        let mut tx = pool.begin_immediate().await?;
        let input = ResultsInput::new(
            &mut tx,
            committee_session.id,
            created_at.with_timezone(&Local),
        )
        .await?;
        (eml_file, pdf_file, overview_pdf_file) = generate_and_save_files(
            &mut tx,
            &audit_service,
            committee_session,
            corrections,
            input,
        )
        .await?;
        tx.commit().await?;
    }

    Ok((eml_file, pdf_file, overview_pdf_file, created_at))
}

/// Download a zip containing a PDF for the PV and the EML with election results
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
        ("committee_session_id" = u32, description = "Committee session database id"),
    ),
    security(("cookie_auth" = ["coordinator"])),
)]
pub async fn election_download_zip_results(
    _user: Coordinator,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path((election_id, committee_session_id)): Path<(ElectionId, u32)>,
) -> Result<impl IntoResponse, APIError> {
    let mut conn = pool.acquire().await?;
    let election = election_repo::get(&mut conn, election_id).await?;
    let committee_session =
        crate::repository::committee_session_repo::get(&mut conn, committee_session_id).await?;
    let (eml_file, pdf_file, overview_file, created_at) =
        get_files(&pool, audit_service, committee_session.id).await?;
    drop(conn);

    let download_zip_filename = download_zip_filename(
        &election,
        &committee_session,
        created_at.with_timezone(&Local),
    );

    let (zip_response, mut zip_writer) = ZipResponse::new(&download_zip_filename);

    tokio::spawn(async move {
        if let Some(pdf_file) = pdf_file {
            zip_writer.add_file(&pdf_file.name, &pdf_file.data).await?;
        }

        if let Some(eml_file) = eml_file {
            let xml_zip_filename = xml_zip_filename(&election);
            let xml_zip = zip_single_file(&eml_file.name, &eml_file.data).await?;
            zip_writer.add_file(&xml_zip_filename, &xml_zip).await?;
        }

        if let Some(overview_file) = overview_file {
            zip_writer
                .add_file(&overview_file.name, &overview_file.data)
                .await?;
        }

        zip_writer.finish().await?;

        Ok::<(), ZipResponseError>(())
    });

    Ok(zip_response)
}

/// Download a generated PDF with election results
#[utoipa::path(
    get,
    path = "/api/elections/{election_id}/committee_sessions/{committee_session_id}/download_pdf_results",
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
        ("committee_session_id" = u32, description = "Committee session database id"),
    ),
    security(("cookie_auth" = ["coordinator"])),
)]
pub async fn election_download_pdf_results(
    _user: Coordinator,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path((_election_id, committee_session_id)): Path<(ElectionId, u32)>,
) -> Result<Attachment<Vec<u8>>, APIError> {
    let (_, pdf_file, _, _) = get_files(&pool, audit_service, committee_session_id).await?;

    let pdf_file = pdf_file.ok_or(APIError::BadRequest(
        "PDF results are not generated".to_string(),
        ErrorReference::PdfGenerationError,
    ))?;

    Ok(Attachment::new(pdf_file.data)
        .filename(pdf_file.name)
        .content_type(pdf_file.mime_type))
}

#[cfg(test)]
mod tests {
    use test_log::test;

    use super::*;
    use crate::service::audit_log::list_event_names;

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_5_with_results"))))]
    async fn test_get_files_first_session(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let audit_service = AuditService::new(None, None);

        // Files should be generated exactly once
        for _ in 1..=2 {
            let (eml, pdf, overview, _) = get_files(&pool, audit_service.clone(), 5)
                .await
                .expect("should return files");
            let eml = eml.expect("should have generated eml");
            let pdf = pdf.expect("should have generated pdf");

            assert_eq!(eml.name, "Telling_GR2026_GroteStad.eml.xml");
            assert_eq!(eml.id, 1);
            assert_eq!(pdf.name, "Model_Na31-2.pdf");
            assert_eq!(pdf.id, 2);
            assert!(overview.is_none());

            assert_eq!(
                list_event_names(&mut conn).await.unwrap(),
                ["FileCreated", "FileCreated"]
            );
        }
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_7_four_sessions"))))]
    async fn test_get_files_next_session(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let audit_service = AuditService::new(None, None);

        // Files should be generated exactly once
        for _ in 1..=2 {
            let (eml, pdf, overview, _) = get_files(&pool, audit_service.clone(), 703)
                .await
                .expect("should return files");

            let eml = eml.expect("should have generated eml");
            let pdf = pdf.expect("should have generated pdf");
            let overview = overview.expect("should have generated overview");

            assert_eq!(eml.name, "Telling_GR2026_GroteStad.eml.xml");
            assert_eq!(eml.id, 1);
            assert_eq!(pdf.name, "Model_Na14-2.pdf");
            assert_eq!(pdf.id, 2);
            assert_eq!(overview.name, "Leeg_Model_P2a.pdf");
            assert_eq!(overview.id, 3);

            assert_eq!(
                list_event_names(&mut conn).await.unwrap(),
                ["FileCreated", "FileCreated", "FileCreated"]
            );
        }
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_7_four_sessions"))))]
    async fn test_get_files_next_session_without_corrections(pool: SqlitePool) {
        let audit_service = AuditService::new(None, None);
        let mut conn = pool.acquire().await.unwrap();

        // Update investigations, set no corrections
        sqlx::query("UPDATE polling_station_investigations SET corrected_results = false")
            .execute(&mut *conn)
            .await
            .unwrap();

        // File should be generated exactly once
        for _ in 1..=2 {
            let (eml, pdf, overview, _) = get_files(&pool, audit_service.clone(), 703)
                .await
                .expect("should return files");

            // No EML and no model PDF should be generated at all
            assert_eq!(eml, None);
            assert_eq!(pdf, None);
            let overview = overview.expect("should have generated overview");

            assert_eq!(overview.name, "Leeg_Model_P2a.pdf");
            assert_eq!(overview.id, 1);

            assert_eq!(list_event_names(&mut conn).await.unwrap(), ["FileCreated"]);
        }
    }
}
