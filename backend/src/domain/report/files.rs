use apportionment::ApportionmentOutput;
use chrono::{Local, Utc};
use eml_signature::SigningKeyPair;
use sqlx::{SqliteConnection, SqlitePool};

use crate::{
    APIError, SqlitePoolExt,
    api::{
        apportionment::{ApportionmentApiError, ApportionmentInputData},
        report::ReportApiError,
    },
    domain::{
        committee_session::{CommitteeSessionError, CommitteeSessionId},
        committee_session_status::CommitteeSessionStatus,
        file::{File, FileType},
        report::structs::{
            CsbFiles, FileCreatedAuditData, GeneratedFile, GsbFiles, ResultsInputCSB,
            ResultsInputData, ResultsInputGSB,
        },
    },
    infra::audit_log::AuditService,
    repository::{
        committee_session_repo::{self},
        data_entry_repo::are_results_complete_for_committee_session,
        election_repo, file_repo,
    },
    service::{get_apportionment_state, get_signing_keypair, list_polling_stations_for_session},
};

struct FileSaver<'a> {
    conn: &'a mut SqliteConnection,
    audit_service: &'a AuditService,
    input: &'a ResultsInputData,
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

/// Generate and save the GSB files of a committee session, signing the EML with the keypair
async fn generate_and_save_files_gsb_election(
    conn: &mut SqliteConnection,
    audit_service: &AuditService,
    committee_session_id: CommitteeSessionId,
    corrections: bool,
    keypair: &SigningKeyPair,
) -> Result<GsbFiles, APIError> {
    let gsb_input = ResultsInputGSB::new(conn, committee_session_id, Local::now()).await?;
    let input_data = &gsb_input.data;

    let mut saver = FileSaver {
        conn,
        audit_service,
        input: input_data,
    };

    let mut files = GsbFiles {
        results_eml: None,
        results_eml_signature: None,
        results_pdf: None,
        overview_pdf: None,
        results_csv: None,
    };

    // For the first session, or if there are corrections, we store the signed EML, CSV and
    // results PDF. For next sessions without corrections, we don't store these.
    if GsbFiles::stores_results(&input_data.committee_session, corrections) {
        let generated_files = gsb_input.generate_gsb_results_files(keypair).await?;

        files.results_eml = Some(saver.save(generated_files.results_eml).await?);
        files.results_eml_signature =
            Some(saver.save(generated_files.results_eml_signature).await?);
        files.results_csv = Some(saver.save(generated_files.results_csv).await?);
        files.results_pdf = Some(saver.save(generated_files.results_pdf).await?);
    }

    // Only generated for next sessions
    let overview_pdf = gsb_input.generate_gsb_overview_pdf().await?;
    if let Some(overview_pdf) = overview_pdf {
        files.overview_pdf = Some(saver.save(overview_pdf).await?)
    }

    Ok(files)
}

async fn generate_and_save_files_csb_election(
    conn: &mut SqliteConnection,
    audit_service: &AuditService,
    committee_session_id: CommitteeSessionId,
) -> Result<CsbFiles, APIError> {
    let csb_input = ResultsInputCSB::new(conn, committee_session_id, Local::now()).await?;
    let input_data = &csb_input.data;

    let (_, state) = get_apportionment_state(conn, input_data.election.id).await?;

    let mut saver = FileSaver {
        conn,
        audit_service,
        input: input_data,
    };

    let apportionment_input = ApportionmentInputData::new(
        input_data.election.number_of_seats,
        &input_data.totals.political_group_votes,
        state.get_deceased_candidates(),
        state.get_lists_drawn(),
        state.get_candidates_drawn(),
    );
    let ApportionmentOutput::Completed(apportionment_result) =
        apportionment::process(&apportionment_input)?
    else {
        return Err(ApportionmentApiError::ApportionmentNotCompleted.into());
    };

    let generated_files = csb_input.generate_csb_files(&apportionment_result).await?;

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
        results_eml_signature: file_repo::get_for_session(
            conn,
            committee_session_id,
            GsbResultsEmlSignature,
        )
        .await?,
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
    let mut tx = pool.begin_immediate().await?;
    let committee_session = committee_session_repo::get(&mut tx, committee_session_id).await?;
    let session_pss = list_polling_stations_for_session(&mut tx, &committee_session).await?;
    let corrections = session_pss.has_corrections();

    // Only generate files if the committee session is completed and has all the data needed
    if committee_session.status != CommitteeSessionStatus::Completed
        || committee_session.start_date_time.is_none()
        || !are_results_complete_for_committee_session(&mut tx, committee_session.id).await?
    {
        return Err(CommitteeSessionError::InvalidCommitteeSessionStatus.into());
    }

    // Check if files exist, if so, get files from database
    let mut files = get_existing_gsb_files(&mut tx, committee_session.id).await?;

    // If one of the files doesn't exist, generate all and save them to the database
    if files.needs_generation(&committee_session, corrections) {
        let election = election_repo::get(&mut tx, committee_session.election_id).await?;
        let keypair = get_signing_keypair(&mut tx, &audit_service, &election).await?;

        files = generate_and_save_files_gsb_election(
            &mut tx,
            &audit_service,
            committee_session.id,
            corrections,
            &keypair,
        )
        .await?;
    }
    tx.commit().await?;

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
    use std::assert_matches;

    use chrono::NaiveDateTime;
    use eml_signature::{Certificate, Signature};
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
            investigation_repo, signing_keypair_repo,
        },
        service::update_apportionment_state,
    };

    #[test(sqlx::test(fixtures(
        path = "../../../fixtures",
        scripts("election_5_with_results", "signing_keypair")
    )))]
    async fn test_error_get_files_gsb_election_not_completed(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let audit_service = AuditService::new(None, None);

        let error =
            get_files_gsb_election(&pool, audit_service.clone(), CommitteeSessionId::from(6))
                .await
                .expect_err("Should have failed");
        assert_delegated(error, &CommitteeSessionError::InvalidCommitteeSessionStatus);

        // Change committee session status to completed
        change_status(
            &mut conn,
            CommitteeSessionId::from(6),
            CommitteeSessionStatus::Completed,
        )
        .await
        .unwrap();

        let error =
            get_files_gsb_election(&pool, audit_service.clone(), CommitteeSessionId::from(6))
                .await
                .expect_err("Should have failed");
        assert_delegated(error, &CommitteeSessionError::InvalidCommitteeSessionStatus);

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
        assert_matches!(result, Ok(_));
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_5_with_results"))))]
    async fn test_get_files_gsb_cso_election_first_session(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let audit_service = AuditService::new(None, None);

        // Files should be generated exactly once
        for _ in 1..=2 {
            let files =
                get_files_gsb_election(&pool, audit_service.clone(), CommitteeSessionId::from(5))
                    .await
                    .expect("should return files");
            let eml = files.results_eml.expect("should have generated eml");
            let signature = files
                .results_eml_signature
                .expect("should have generated signature");
            let csv = files.results_csv.expect("should have generated csv");
            let pdf = files.results_pdf.expect("should have generated pdf");

            assert_eq!(eml.name, "Telling_GR2026_Juinen_gemeente_Juinen.eml.xml");
            assert_eq!(eml.id, FileId::from(1));
            assert_eq!(
                signature.name,
                "Telling_GR2026_Juinen_gemeente_Juinen.eml.xml.signature"
            );
            assert_eq!(signature.id, FileId::from(2));
            assert_eq!(csv.name, "abacus_telling_gr2026_juinen.csv");
            assert_eq!(csv.id, FileId::from(3));
            assert_eq!(pdf.name, "Model_Na31-2.pdf");
            assert_eq!(pdf.id, FileId::from(4));
            assert!(files.overview_pdf.is_none());

            // The signature verifies against the stored certificate of the election
            let (certificate, _) =
                signing_keypair_repo::get_keypair(&mut conn, ElectionId::from(5))
                    .await
                    .unwrap()
                    .expect("keypair should have been generated");
            let certificate = Certificate::from_pem(certificate.as_bytes()).unwrap();
            let der_signature = Signature::from_der(&signature.data).unwrap();
            certificate
                .public_key()
                .verify(&eml.data, &der_signature)
                .expect("signature should verify");

            assert_eq!(
                list_event_names(&mut conn).await.unwrap(),
                [
                    "SigningKeypairCreated",
                    "FileCreated",
                    "FileCreated",
                    "FileCreated",
                    "FileCreated"
                ]
            );
        }
    }

    #[test(sqlx::test(fixtures(
        path = "../../../fixtures",
        scripts("election_12_dso_with_results", "signing_keypair")
    )))]
    async fn test_get_files_gsb_dso_election_first_session(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let audit_service = AuditService::new(None, None);

        // Files should be generated exactly once
        for _ in 1..=2 {
            let files =
                get_files_gsb_election(&pool, audit_service.clone(), CommitteeSessionId::from(12))
                    .await
                    .expect("should return files");
            let eml = files.results_eml.expect("should have generated eml");
            let signature = files
                .results_eml_signature
                .expect("should have generated signature");
            let csv = files.results_csv.expect("should have generated csv");
            let pdf = files.results_pdf.expect("should have generated pdf");

            assert_eq!(eml.name, "Telling_AB2026_Juinen_gemeente_Juinen.eml.xml");
            assert_eq!(eml.id, FileId::from(1));
            assert_eq!(
                signature.name,
                "Telling_AB2026_Juinen_gemeente_Juinen.eml.xml.signature"
            );
            assert_eq!(signature.id, FileId::from(2));
            assert_eq!(csv.name, "abacus_telling_ab2026_juinen.csv");
            assert_eq!(csv.id, FileId::from(3));
            assert_eq!(pdf.name, "Model_Na31-1.pdf");
            assert_eq!(pdf.id, FileId::from(4));
            assert!(files.overview_pdf.is_none());

            assert_eq!(
                list_event_names(&mut conn).await.unwrap(),
                ["FileCreated", "FileCreated", "FileCreated", "FileCreated"]
            );
        }
    }

    #[test(sqlx::test(fixtures(
        path = "../../../fixtures",
        scripts("election_7_four_sessions", "signing_keypair")
    )))]
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
            let signature = files
                .results_eml_signature
                .expect("should have generated signature");
            let csv = files.results_csv.expect("should have generated csv");
            let pdf = files.results_pdf.expect("should have generated pdf");
            let overview = files.overview_pdf.expect("should have generated overview");

            assert_eq!(
                eml.name,
                "Telling_GR2026_GroteStad_gemeente_Grote_Stad.eml.xml"
            );
            assert_eq!(eml.id, FileId::from(1));
            assert_eq!(
                signature.name,
                "Telling_GR2026_GroteStad_gemeente_Grote_Stad.eml.xml.signature"
            );
            assert_eq!(signature.id, FileId::from(2));
            assert_eq!(csv.name, "abacus_telling_gr2026_grotestad.csv");
            assert_eq!(csv.id, FileId::from(3));
            assert_eq!(pdf.name, "Model_Na14-2.pdf");
            assert_eq!(pdf.id, FileId::from(4));
            assert_eq!(overview.name, "Leeg_Model_P2a.pdf");
            assert_eq!(overview.id, FileId::from(5));

            assert_eq!(
                list_event_names(&mut conn).await.unwrap(),
                [
                    "FileCreated",
                    "FileCreated",
                    "FileCreated",
                    "FileCreated",
                    "FileCreated"
                ]
            );
        }
    }

    #[test(sqlx::test(fixtures(
        path = "../../../fixtures",
        scripts("election_7_four_sessions", "signing_keypair")
    )))]
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
        update_apportionment_state(&mut conn, &audit_service, ElectionId::from(8), |state| {
            state.finalise()
        })
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
        update_apportionment_state(&mut conn, &audit_service, ElectionId::from(8), |state| {
            state.finalise()
        })
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

            assert_eq!(
                eml_total_counts.name,
                "Totaaltelling_GR2024_Juinen_gemeente_Juinen.eml.xml"
            );
            assert_eq!(eml_total_counts.id, FileId::from(2));

            assert_eq!(pdf.name, "Model_P22-2.pdf");
            assert_eq!(pdf.id, FileId::from(3));

            assert_eq!(attachment_pdf.name, "Model_P22-2_bijlage.pdf");
            assert_eq!(attachment_pdf.id, FileId::from(4));

            assert_eq!(csv_counts.name, "abacus_telling_gr2024_juinen.csv");
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
