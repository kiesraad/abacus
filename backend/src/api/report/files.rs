use chrono::{Local, Utc};
use sqlx::{SqliteConnection, SqlitePool};

use crate::{
    APIError, SqlitePoolExt,
    api::{
        apportionment::ApportionmentInputData,
        report::{
            ReportApiError,
            structs::{CsbFiles, FileCreatedAuditData, GeneratedFile, GsbFiles, ResultsInput},
        },
    },
    domain::{
        committee_session::{CommitteeSession, CommitteeSessionError, CommitteeSessionId},
        committee_session_status::CommitteeSessionStatus,
        election::CommitteeCategory,
        file::{File, FileType},
    },
    infra::audit_log::AuditService,
    repository::{
        committee_session_repo::{self},
        data_entry_repo::are_results_complete_for_committee_session,
        file_repo,
    },
    service::{get_apportionment_state, list_polling_stations_for_session},
};

struct FileSaver<'a> {
    conn: &'a mut SqliteConnection,
    audit_service: &'a AuditService,
    input: &'a ResultsInput,
}

impl FileSaver<'_> {
    async fn save(&mut self, generated_file: GeneratedFile) -> Result<File, APIError> {
        let file = file_repo::create(
            self.conn,
            self.input.committee_session.id,
            generated_file.file_type,
            generated_file.filename,
            &generated_file.content,
            generated_file.file_type.mime_type().into(),
            self.input.created_at.with_timezone(&Utc),
        )
        .await?;

        self.audit_service
            .log(self.conn, &FileCreatedAuditData(file.clone().into()), None)
            .await?;
        Ok(file)
    }
}

async fn generate_and_save_files_gsb_election(
    conn: &mut SqliteConnection,
    audit_service: &AuditService,
    committee_session: CommitteeSession,
    corrections: bool,
) -> Result<GsbFiles, APIError> {
    let input = ResultsInput::new(conn, committee_session.id, Local::now()).await?;
    if input.election.committee_category != CommitteeCategory::GSB {
        return Err(APIError::DataIntegrityError(
            "Generating GSB files can only be done for GSB elections".to_string(),
        ));
    }

    let mut saver = FileSaver {
        conn,
        audit_service,
        input: &input,
    };

    let mut files = GsbFiles {
        results_eml: None,
        results_pdf: None,
        overview_pdf: None,
        results_csv: None,
    };

    let generated_files = input.generate_gsb_files().await?;

    // For the first session, or if there are corrections, we also store the EML and count PDF
    // For next sessions without corrections, we don't store these
    if !committee_session.is_next_session() || corrections {
        files.results_eml = Some(saver.save(generated_files.results_eml).await?);
        files.results_csv = Some(saver.save(generated_files.results_csv).await?);

        files.results_pdf = Some(saver.save(generated_files.results_pdf).await?);
    }

    // Store the overview PDF for next sessions
    if let Some(overview_pdf) = generated_files.overview_pdf {
        files.overview_pdf = Some(saver.save(overview_pdf).await?)
    }

    Ok(files)
}

async fn generate_and_save_files_csb_election(
    conn: &mut SqliteConnection,
    audit_service: &AuditService,
    committee_session_id: CommitteeSessionId,
) -> Result<CsbFiles, APIError> {
    let input = ResultsInput::new(conn, committee_session_id, Local::now()).await?;
    if input.election.committee_category != CommitteeCategory::CSB {
        return Err(APIError::DataIntegrityError(
            "Generating CSB files can only be done for CSB elections".to_string(),
        ));
    }

    let (_, state) = get_apportionment_state(conn, input.election.id).await?;

    let mut saver = FileSaver {
        conn,
        audit_service,
        input: &input,
    };
    let apportionment_input = ApportionmentInputData::new(
        input.election.number_of_seats,
        &input.summary.political_group_votes,
        state.get_deceased_candidates(),
    );
    let apportionment_result = apportionment::process(&apportionment_input)?;

    let generated_files = input.generate_csb_files(&apportionment_result).await?;

    let results_eml = saver.save(generated_files.results_eml).await?;
    let total_counts_eml = saver.save(generated_files.total_counts_eml).await?;
    let results_pdf = saver.save(generated_files.results_pdf).await?;
    let attachment_pdf = saver.save(generated_files.attachment_pdf).await?;
    let csv_counts = saver.save(generated_files.csv_counts).await?;

    Ok(CsbFiles {
        results_eml: Some(results_eml),
        results_pdf: Some(results_pdf),
        attachment_pdf: Some(attachment_pdf),
        total_counts_eml: Some(total_counts_eml),
        csv_counts: Some(csv_counts),
    })
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
        results_csv: file_repo::get_for_session(conn, committee_session_id, GsbCsvCounts).await?,
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
        csv_counts: file_repo::get_for_session(conn, committee_session_id, CsbCsvCounts).await?,
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
        return Err(CommitteeSessionError::InvalidCommitteeSessionStatus.into());
    }

    // Check if files exist, if so, get files from database
    let mut files = get_existing_gsb_files(&mut conn, committee_session.id).await?;
    drop(conn);

    // If one of the files doesn't exist, generate all and save them to the database
    if files.needs_generation(&committee_session, corrections) {
        let mut tx = pool.begin_immediate().await?;
        files = generate_and_save_files_gsb_election(
            &mut tx,
            &audit_service,
            committee_session,
            corrections,
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
        return Err(CommitteeSessionError::InvalidCommitteeSessionStatus.into());
    }

    let (_, state) = get_apportionment_state(&mut conn, committee_session.election_id).await?;
    if !state.is_finalised() {
        return Err(ReportApiError::ApportionmentStateNotFinalised.into());
    }

    // Check if files exist, if so, get files from database
    let mut files = get_existing_csb_files(&mut conn, committee_session.id).await?;
    drop(conn);

    // If one of the files doesn't exist, generate all and save them to the database
    if files.needs_generation() {
        let mut tx = pool.begin_immediate().await?;
        files = generate_and_save_files_csb_election(&mut tx, &audit_service, committee_session.id)
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
            election::ElectionId,
            file::FileId,
            investigation::{InvestigationConcludedWithoutNewResults, InvestigationStatus},
            polling_station::PollingStationId,
        },
        error::assert_delegated,
        infra::audit_log::list_event_names,
        repository::{
            committee_session_repo::{self, change_status},
            investigation_repo,
        },
        service::update_apportionment_state,
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
            let csv = files.results_csv.expect("should have generated csv");
            let pdf = files.results_pdf.expect("should have generated pdf");

            assert_eq!(eml.name, "Telling_GR2026_GroteStad.eml.xml");
            assert_eq!(eml.id, FileId::from(1));
            assert_eq!(csv.name, "osv4-3_telling_gr2026_grotestad.csv");
            assert_eq!(csv.id, FileId::from(2));
            assert_eq!(pdf.name, "Model_Na31-2.pdf");
            assert_eq!(pdf.id, FileId::from(3));
            assert!(files.overview_pdf.is_none());

            assert_eq!(
                list_event_names(&mut conn).await.unwrap(),
                ["FileCreated", "FileCreated", "FileCreated"]
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
            let csv = files.results_csv.expect("should have generated csv");
            let pdf = files.results_pdf.expect("should have generated pdf");
            let overview = files.overview_pdf.expect("should have generated overview");

            assert_eq!(eml.name, "Telling_GR2026_GroteStad.eml.xml");
            assert_eq!(eml.id, FileId::from(1));
            assert_eq!(csv.name, "osv4-3_telling_gr2026_grotestad.csv");
            assert_eq!(csv.id, FileId::from(2));
            assert_eq!(pdf.name, "Model_Na14-2.pdf");
            assert_eq!(pdf.id, FileId::from(3));
            assert_eq!(overview.name, "Leeg_Model_P2a.pdf");
            assert_eq!(overview.id, FileId::from(4));

            assert_eq!(
                list_event_names(&mut conn).await.unwrap(),
                ["FileCreated", "FileCreated", "FileCreated", "FileCreated"]
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
    async fn test_error_get_files_csb_election_not_in_valid_state(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let audit_service = AuditService::new(None, None);

        let error =
            get_files_csb_election(&pool, audit_service.clone(), CommitteeSessionId::from(801))
                .await
                .expect_err("committee session should not be completed");
        assert_delegated(error, &CommitteeSessionError::InvalidCommitteeSessionStatus);

        // Change committee session status to completed
        change_status(
            &mut conn,
            CommitteeSessionId::from(801),
            CommitteeSessionStatus::Completed,
        )
        .await
        .unwrap();

        let error =
            get_files_csb_election(&pool, audit_service.clone(), CommitteeSessionId::from(801))
                .await
                .expect_err("committee session details should be missing");
        assert_delegated(error, &CommitteeSessionError::InvalidCommitteeSessionStatus);

        // Change committee session details
        committee_session_repo::update(
            &mut conn,
            CommitteeSessionId::from(801),
            "Juinen".to_string(),
            NaiveDateTime::parse_from_str("2026-03-19T09:15", "%Y-%m-%dT%H:%M").unwrap(),
        )
        .await
        .unwrap();

        let error =
            get_files_csb_election(&pool, audit_service.clone(), CommitteeSessionId::from(801))
                .await
                .expect_err("apportionment state should not be finalised");
        assert_delegated(error, &ReportApiError::ApportionmentStateNotFinalised);

        // Finalise apportionment state
        update_apportionment_state(
            &mut conn,
            audit_service.clone(),
            ElectionId::from(8),
            |state| state.skip_deceased_candidates(),
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

        // Finalise apportionment state
        update_apportionment_state(
            &mut conn,
            audit_service.clone(),
            ElectionId::from(8),
            |state| state.skip_deceased_candidates(),
        )
        .await
        .unwrap();

        // Files should be generated exactly once
        for _ in 1..=2 {
            let files =
                get_files_csb_election(&pool, audit_service.clone(), CommitteeSessionId::from(801))
                    .await
                    .expect("should return files");
            let eml_results = files
                .results_eml
                .expect("should have generated results eml");
            let eml_total_counts = files
                .total_counts_eml
                .expect("should have generated total counts eml");
            let pdf = files.results_pdf.expect("should have generated pdf");
            let attachment_pdf = files
                .attachment_pdf
                .expect("should have generated attachment pdf");
            let csv_counts = files.csv_counts.expect("should have generated csv counts");

            assert_eq!(eml_results.name, "Resultaat_GR2024_Juinen.eml.xml");
            assert_eq!(eml_results.id, FileId::from(1));

            assert_eq!(eml_total_counts.name, "Totaaltelling_GR2024_Juinen.eml.xml");
            assert_eq!(eml_total_counts.id, FileId::from(2));

            assert_eq!(pdf.name, "Model_P22-2.pdf");
            assert_eq!(pdf.id, FileId::from(3));

            assert_eq!(attachment_pdf.name, "Model_P22-2_bijlage.pdf");
            assert_eq!(attachment_pdf.id, FileId::from(4));

            assert_eq!(csv_counts.name, "osv4-3_telling_gr2024_juinen.csv");
            assert_eq!(csv_counts.id, FileId::from(5));

            assert_eq!(
                list_event_names(&mut conn).await.unwrap(),
                [
                    "ApportionmentStateUpdated",
                    "FileCreated",
                    "FileCreated",
                    "FileCreated",
                    "FileCreated",
                    "FileCreated"
                ]
            );
        }
    }
}
