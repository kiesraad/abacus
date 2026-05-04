use chrono::{Local, Utc};
use eml_nl::io::EMLWrite;
use pdf_gen::generate_pdf;
use sqlx::{SqliteConnection, SqlitePool};

use crate::{
    APIError, SqlitePoolExt,
    api::{
        apportionment::ApportionmentInputData,
        report::structs::{CsbFiles, FileCreatedAuditData, GsbFiles, NewFile, ResultsInput},
    },
    domain::{
        committee_session::{CommitteeSession, CommitteeSessionError, CommitteeSessionId},
        committee_session_status::CommitteeSessionStatus,
        election::CommitteeCategory,
        file::{File, FileType},
    },
    eml::EmlHash,
    infra::audit_log::AuditService,
    repository::{
        committee_session_repo::{self},
        data_entry_repo::are_results_complete_for_committee_session,
        file_repo,
    },
    service::list_polling_stations_for_session,
};

const EML_MIME_TYPE: &str = "text/xml";
const PDF_MIME_TYPE: &str = "application/pdf";

#[expect(clippy::too_many_lines)]
async fn generate_and_save_files_gsb_election(
    conn: &mut SqliteConnection,
    audit_service: &AuditService,
    committee_session: CommitteeSession,
    corrections: bool,
    input: ResultsInput,
) -> Result<GsbFiles, APIError> {
    if input.election.committee_category != CommitteeCategory::GSB {
        return Err(APIError::DataIntegrityError(
            "Generating GSB files can only be done for GSB elections".to_string(),
        ));
    }

    let mut files = GsbFiles {
        results_eml: None,
        results_pdf: None,
        overview_pdf: None,
    };

    let created_at = input.created_at.with_timezone(&Utc);
    let xml_string = input.as_xml()?.write_eml_root_str(true, true)?;

    let xml_hash = EmlHash::from(xml_string.as_bytes());
    let xml_filename = input.xml_filename();
    let pdf_files = input.as_pdf_file_models_gsb(xml_hash)?;

    // For the first session, or if there are corrections, we also store the EML and count PDF
    // For next sessions without corrections, we don't store these
    if !committee_session.is_next_session() || corrections {
        files.results_eml = Some(
            create_file(
                conn,
                audit_service,
                NewFile {
                    committee_session_id: committee_session.id,
                    file_type: FileType::GsbResultsEml,
                    filename: xml_filename,
                    data: xml_string.into_bytes(),
                    mime_type: EML_MIME_TYPE.to_string(),
                    created_at,
                },
            )
            .await?,
        );

        files.results_pdf = Some(
            create_file(
                conn,
                audit_service,
                NewFile {
                    committee_session_id: committee_session.id,
                    file_type: FileType::GsbResultsPdf,
                    filename: pdf_files.results.file_name.clone(),
                    data: generate_pdf(&pdf_files.results).await?.buffer,
                    mime_type: PDF_MIME_TYPE.to_string(),
                    created_at,
                },
            )
            .await?,
        );
    }

    // Store the overview PDF for next sessions
    if let Some(overview_pdf) = pdf_files.overview {
        files.overview_pdf = Some(
            create_file(
                conn,
                audit_service,
                NewFile {
                    committee_session_id: committee_session.id,
                    file_type: FileType::GsbOverviewPdf,
                    filename: overview_pdf.file_name.clone(),
                    data: generate_pdf(&overview_pdf).await?.buffer,
                    mime_type: PDF_MIME_TYPE.to_string(),
                    created_at,
                },
            )
            .await?,
        );
    }

    Ok(files)
}

#[expect(clippy::too_many_lines)]
async fn generate_and_save_files_csb_election(
    conn: &mut SqliteConnection,
    audit_service: &AuditService,
    committee_session: CommitteeSession,
    input: ResultsInput,
) -> Result<CsbFiles, APIError> {
    if input.election.committee_category != CommitteeCategory::CSB {
        return Err(APIError::DataIntegrityError(
            "Generating CSB files can only be done for CSB elections".to_string(),
        ));
    }

    let created_at = input.created_at.with_timezone(&Utc);

    let xml_counts_string = input.as_xml()?.write_eml_root_str(true, true)?;
    let xml_counts_filename = input.xml_filename();

    let apportionment_input = ApportionmentInputData {
        number_of_seats: input.election.number_of_seats,
        list_votes: &input.summary.political_group_votes,
    };
    let apportionment_result = apportionment::process(&apportionment_input)?;

    let eml_results_data = input.election.as_result_eml(
        None,
        created_at,
        &apportionment_result.candidate_nomination,
    )?;
    let xml_results_string = eml_results_data.write_eml_root_str(true, true)?;
    let xml_results_hash = EmlHash::from(xml_results_string.as_bytes());
    let xml_results_filename = input.xml_results_filename();

    let pdf_files = input.as_pdf_file_models_csb(&apportionment_result, xml_results_hash)?;

    let results_eml = create_file(
        conn,
        audit_service,
        NewFile {
            committee_session_id: committee_session.id,
            file_type: FileType::CsbResultsEml,
            filename: xml_results_filename,
            data: xml_results_string.into_bytes(),
            mime_type: EML_MIME_TYPE.to_string(),
            created_at,
        },
    )
    .await?;

    let results_pdf = create_file(
        conn,
        audit_service,
        NewFile {
            committee_session_id: committee_session.id,
            file_type: FileType::CsbResultsPdf,
            filename: pdf_files.results.file_name.clone(),
            data: generate_pdf(&pdf_files.results).await?.buffer,
            mime_type: PDF_MIME_TYPE.to_string(),
            created_at,
        },
    )
    .await?;

    let attachment_pdf = create_file(
        conn,
        audit_service,
        NewFile {
            committee_session_id: committee_session.id,
            file_type: FileType::CsbAttachmentPdf,
            filename: pdf_files.attachment.file_name.clone(),
            data: generate_pdf(&pdf_files.attachment).await?.buffer,
            mime_type: PDF_MIME_TYPE.to_string(),
            created_at,
        },
    )
    .await?;

    let total_counts_eml = create_file(
        conn,
        audit_service,
        NewFile {
            committee_session_id: committee_session.id,
            file_type: FileType::CsbTotalCountsEml,
            filename: xml_counts_filename,
            data: xml_counts_string.into_bytes(),
            mime_type: EML_MIME_TYPE.to_string(),
            created_at,
        },
    )
    .await?;

    Ok(CsbFiles {
        results_eml: Some(results_eml),
        results_pdf: Some(results_pdf),
        attachment_pdf: Some(attachment_pdf),
        total_counts_eml: Some(total_counts_eml),
    })
}

async fn create_file(
    conn: &mut SqliteConnection,
    audit_service: &AuditService,
    new_file: NewFile,
) -> Result<File, APIError> {
    let file = file_repo::create(
        conn,
        new_file.committee_session_id,
        new_file.file_type,
        new_file.filename,
        &new_file.data,
        new_file.mime_type,
        new_file.created_at,
    )
    .await?;

    audit_service
        .log(conn, &FileCreatedAuditData(file.clone().into()), None)
        .await?;
    Ok(file)
}

async fn get_existing_gsb_files(
    conn: &mut SqliteConnection,
    committee_session_id: CommitteeSessionId,
) -> Result<GsbFiles, APIError> {
    use FileType::*;
    Ok(GsbFiles {
        results_eml: file_repo::get_for_session(conn, committee_session_id, GsbResultsEml).await?,
        results_pdf: file_repo::get_for_session(conn, committee_session_id, GsbResultsPdf).await?,
        overview_pdf: file_repo::get_for_session(conn, committee_session_id, GsbOverviewPdf)
            .await?,
    })
}

async fn get_existing_csb_files(
    conn: &mut SqliteConnection,
    committee_session_id: CommitteeSessionId,
) -> Result<CsbFiles, APIError> {
    use FileType::*;
    Ok(CsbFiles {
        results_eml: file_repo::get_for_session(conn, committee_session_id, CsbResultsEml).await?,
        results_pdf: file_repo::get_for_session(conn, committee_session_id, CsbResultsPdf).await?,
        attachment_pdf: file_repo::get_for_session(conn, committee_session_id, CsbAttachmentPdf)
            .await?,
        total_counts_eml: file_repo::get_for_session(conn, committee_session_id, CsbTotalCountsEml)
            .await?,
    })
}

pub async fn get_files_gsb_election(
    pool: &SqlitePool,
    audit_service: AuditService,
    committee_session_id: CommitteeSessionId,
) -> Result<GsbFiles, APIError> {
    let mut conn = pool.acquire().await?;
    let committee_session = committee_session_repo::get(&mut conn, committee_session_id).await?;
    let session_pss = list_polling_stations_for_session(&mut conn, &committee_session).await?;
    let corrections = session_pss.has_corrections();

    // Only generate files if the committee session is completed and has all the data needed
    if committee_session.status != CommitteeSessionStatus::Completed
        || committee_session.start_date_time.is_none()
        || !are_results_complete_for_committee_session(&mut conn, committee_session.id).await?
    {
        return Err(APIError::CommitteeSession(
            CommitteeSessionError::InvalidCommitteeSessionStatus,
        ));
    }

    // Check if files exist, if so, get files from database
    let mut files = get_existing_gsb_files(&mut conn, committee_session.id).await?;
    drop(conn);

    // If one of the files doesn't exist, generate all and save them to the database
    if files.needs_generation(&committee_session, corrections) {
        let mut tx = pool.begin_immediate().await?;
        let input = ResultsInput::new(&mut tx, committee_session.id, Local::now()).await?;
        files = generate_and_save_files_gsb_election(
            &mut tx,
            &audit_service,
            committee_session,
            corrections,
            input,
        )
        .await?;
        tx.commit().await?;
    }

    Ok(files)
}

pub async fn get_files_csb_election(
    pool: &SqlitePool,
    audit_service: AuditService,
    committee_session_id: CommitteeSessionId,
) -> Result<CsbFiles, APIError> {
    let mut conn = pool.acquire().await?;
    let committee_session = committee_session_repo::get(&mut conn, committee_session_id).await?;

    // Only generate files if the committee session is completed and has all the data needed
    if committee_session.status != CommitteeSessionStatus::Completed
        || committee_session.start_date_time.is_none()
        || !are_results_complete_for_committee_session(&mut conn, committee_session.id).await?
    {
        return Err(APIError::CommitteeSession(
            CommitteeSessionError::InvalidCommitteeSessionStatus,
        ));
    }

    // Check if files exist, if so, get files from database
    let mut files = get_existing_csb_files(&mut conn, committee_session.id).await?;
    drop(conn);

    // If one of the files doesn't exist, generate all and save them to the database
    if files.needs_generation() {
        let mut tx = pool.begin_immediate().await?;
        let input = ResultsInput::new(&mut tx, committee_session.id, Local::now()).await?;
        files =
            generate_and_save_files_csb_election(&mut tx, &audit_service, committee_session, input)
                .await?;
        tx.commit().await?;
    }

    Ok(files)
}

#[cfg(test)]
mod tests {
    use chrono::NaiveDateTime;
    use test_log::test;

    use super::*;
    use crate::{
        domain::{
            file::FileId,
            investigation::{InvestigationConcludedWithoutNewResults, InvestigationStatus},
            polling_station::PollingStationId,
        },
        infra::audit_log::list_event_names,
        repository::{
            committee_session_repo::{self, change_status},
            investigation_repo,
        },
    };

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_5_with_results"))))]
    async fn test_error_get_files_gsb_election_not_completed(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let audit_service = AuditService::new(None, None);

        let result =
            get_files_gsb_election(&pool, audit_service.clone(), CommitteeSessionId::from(6)).await;
        assert!(result.is_err());

        // Change committee session status to completed
        change_status(
            &mut conn,
            CommitteeSessionId::from(6),
            CommitteeSessionStatus::Completed,
        )
        .await
        .unwrap();

        let result =
            get_files_gsb_election(&pool, audit_service.clone(), CommitteeSessionId::from(6)).await;
        assert!(result.is_err());

        // Change committee session details
        committee_session_repo::update(
            &mut conn,
            CommitteeSessionId::from(6),
            "Juinen".to_string(),
            NaiveDateTime::parse_from_str("2026-03-19T09:15", "%Y-%m-%dT%H:%M").unwrap(),
        )
        .await
        .unwrap();

        let result =
            get_files_gsb_election(&pool, audit_service.clone(), CommitteeSessionId::from(6)).await;
        assert!(result.is_ok());
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_5_with_results"))))]
    async fn test_get_files_gsb_election_first_session(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let audit_service = AuditService::new(None, None);

        // Files should be generated exactly once
        for _ in 1..=2 {
            let files =
                get_files_gsb_election(&pool, audit_service.clone(), CommitteeSessionId::from(5))
                    .await
                    .expect("should return files");
            let eml = files.results_eml.expect("should have generated eml");
            let pdf = files.results_pdf.expect("should have generated pdf");

            assert_eq!(eml.name, "Telling_GR2026_GroteStad.eml.xml");
            assert_eq!(eml.id, FileId::from(1));
            assert_eq!(pdf.name, "Model_Na31-2.pdf");
            assert_eq!(pdf.id, FileId::from(2));
            assert!(files.overview_pdf.is_none());

            assert_eq!(
                list_event_names(&mut conn).await.unwrap(),
                ["FileCreated", "FileCreated"]
            );
        }
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_7_four_sessions"))))]
    async fn test_get_files_gsb_election_next_session(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let audit_service = AuditService::new(None, None);

        // Files should be generated exactly once
        for _ in 1..=2 {
            let files =
                get_files_gsb_election(&pool, audit_service.clone(), CommitteeSessionId::from(703))
                    .await
                    .expect("should return files");

            let eml = files.results_eml.expect("should have generated eml");
            let pdf = files.results_pdf.expect("should have generated pdf");
            let overview = files.overview_pdf.expect("should have generated overview");

            assert_eq!(eml.name, "Telling_GR2026_GroteStad.eml.xml");
            assert_eq!(eml.id, FileId::from(1));
            assert_eq!(pdf.name, "Model_Na14-2.pdf");
            assert_eq!(pdf.id, FileId::from(2));
            assert_eq!(overview.name, "Leeg_Model_P2a.pdf");
            assert_eq!(overview.id, FileId::from(3));

            assert_eq!(
                list_event_names(&mut conn).await.unwrap(),
                ["FileCreated", "FileCreated", "FileCreated"]
            );
        }
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_7_four_sessions"))))]
    async fn test_get_files_gsb_election_next_session_without_corrections(pool: SqlitePool) {
        let audit_service = AuditService::new(None, None);
        let mut conn = pool.acquire().await.unwrap();

        // Update investigations, set no corrections (ConcludedWithoutNewResults)
        let status = InvestigationStatus::ConcludedWithoutNewResults(
            InvestigationConcludedWithoutNewResults {
                reason: "reason".into(),
                findings: "findings".into(),
            },
        );
        investigation_repo::save(&mut conn, PollingStationId::from(721), &status)
            .await
            .unwrap();
        investigation_repo::save(&mut conn, PollingStationId::from(732), &status)
            .await
            .unwrap();

        // File should be generated exactly once
        for _ in 1..=2 {
            let files =
                get_files_gsb_election(&pool, audit_service.clone(), CommitteeSessionId::from(703))
                    .await
                    .expect("should return files");

            // No EML and no model PDF should be generated at all
            assert_eq!(files.results_eml, None);
            assert_eq!(files.results_pdf, None);
            let overview = files.overview_pdf.expect("should have generated overview");

            assert_eq!(overview.name, "Leeg_Model_P2a.pdf");
            assert_eq!(overview.id, FileId::from(1));

            assert_eq!(list_event_names(&mut conn).await.unwrap(), ["FileCreated"]);
        }
    }

    #[test(sqlx::test(fixtures(
        path = "../../../fixtures",
        scripts("election_8_csb_with_results")
    )))]
    async fn test_error_get_files_csb_election_not_completed(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let audit_service = AuditService::new(None, None);

        let result =
            get_files_csb_election(&pool, audit_service.clone(), CommitteeSessionId::from(801))
                .await;
        assert!(result.is_err());

        // Change committee session status to completed
        change_status(
            &mut conn,
            CommitteeSessionId::from(801),
            CommitteeSessionStatus::Completed,
        )
        .await
        .unwrap();

        let result =
            get_files_csb_election(&pool, audit_service.clone(), CommitteeSessionId::from(801))
                .await;
        assert!(result.is_err());

        // Change committee session details
        committee_session_repo::update(
            &mut conn,
            CommitteeSessionId::from(801),
            "Juinen".to_string(),
            NaiveDateTime::parse_from_str("2026-03-19T09:15", "%Y-%m-%dT%H:%M").unwrap(),
        )
        .await
        .unwrap();

        let result =
            get_files_csb_election(&pool, audit_service.clone(), CommitteeSessionId::from(801))
                .await;
        assert!(result.is_ok());
    }

    #[test(sqlx::test(fixtures(
        path = "../../../fixtures",
        scripts("election_8_csb_with_results")
    )))]
    async fn test_get_files_csb_election(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let audit_service = AuditService::new(None, None);

        // Change committee session status to completed
        change_status(
            &mut conn,
            CommitteeSessionId::from(801),
            CommitteeSessionStatus::Completed,
        )
        .await
        .unwrap();

        // Change committee session details
        committee_session_repo::update(
            &mut conn,
            CommitteeSessionId::from(801),
            "Juinen".to_string(),
            NaiveDateTime::parse_from_str("2026-03-19T09:15", "%Y-%m-%dT%H:%M").unwrap(),
        )
        .await
        .unwrap();

        // Files should be generated exactly once
        for _ in 1..=2 {
            let files =
                get_files_csb_election(&pool, audit_service.clone(), CommitteeSessionId::from(801))
                    .await
                    .expect("should return files");
            let pdf = files.results_pdf.expect("should have generated pdf");
            let attachment_pdf = files
                .attachment_pdf
                .expect("should have generated attachment pdf");
            let eml_total_counts = files
                .total_counts_eml
                .expect("should have generated total counts eml");
            let eml_results = files
                .results_eml
                .expect("should have generated results eml");

            assert_eq!(eml_results.name, "Resultaat_GR2024_Juinen.eml.xml");
            assert_eq!(eml_results.id, FileId::from(1));

            assert_eq!(pdf.name, "Model_P22-2.pdf");
            assert_eq!(pdf.id, FileId::from(2));

            assert_eq!(attachment_pdf.name, "Model_P22-2_bijlage.pdf");
            assert_eq!(attachment_pdf.id, FileId::from(3));

            assert_eq!(eml_total_counts.name, "Totaaltelling_GR2024_Juinen.eml.xml");
            assert_eq!(eml_total_counts.id, FileId::from(4));

            assert_eq!(
                list_event_names(&mut conn).await.unwrap(),
                ["FileCreated", "FileCreated", "FileCreated", "FileCreated"]
            );
        }
    }
}
