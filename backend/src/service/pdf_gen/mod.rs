#[cfg(feature = "embed-typst")]
mod embedded;

#[cfg(not(feature = "embed-typst"))]
mod external;

#[cfg(test)]
mod typst_tests;

#[cfg(feature = "embed-typst")]
pub use embedded::{PdfGenError, generate_pdf, generate_pdfs};
#[cfg(not(feature = "embed-typst"))]
pub use external::{PdfGenError, generate_pdf, generate_pdfs};

pub use crate::domain::votes_table::{
    CandidatesTables, VotesTables, VotesTablesWithOnlyPreviousVotes, VotesTablesWithPreviousVotes,
};

pub struct PdfGenResult {
    pub buffer: Vec<u8>,
}

#[cfg(test)]
pub(crate) mod tests {
    use chrono::Utc;
    use test_log::test;

    use super::*;
    use crate::{
        api::election::committee_session::tests::committee_session_fixture,
        domain::{
            election::{
                ElectionCategory, ElectionId, ElectionWithPoliticalGroups, VoteCountingMethod,
            },
            models::{ModelNa31_2Input, PdfFileModel, PdfModel, ToPdfFileModel},
            polling_station::{PollingStation, PollingStationType},
            summary::ElectionSummary,
            votes_table::VotesTables,
        },
    };

    pub fn polling_stations_fixture(
        election: &ElectionWithPoliticalGroups,
        committee_session_id: u32,
        polling_station_voter_count: &[u32],
    ) -> Vec<PollingStation> {
        let mut polling_stations = Vec::new();
        for (i, voter_count) in polling_station_voter_count.iter().enumerate() {
            let idx = i + 1;
            polling_stations.push(PollingStation {
                id: u32::try_from(idx).unwrap(),
                election_id: election.id,
                committee_session_id,
                id_prev_session: None,
                name: format!("Testplek {idx}"),
                number: u32::try_from(idx).unwrap() + 30,
                number_of_voters: Some(*voter_count),
                polling_station_type: Some(PollingStationType::Special),
                address: "Teststraat 2a".to_string(),
                postal_code: "1234 QY".to_string(),
                locality: "Testdorp".to_string(),
            });
        }
        polling_stations
    }

    #[test(tokio::test)]
    async fn it_generates_a_pdf() {
        let election = ElectionWithPoliticalGroups {
            id: ElectionId::from(1),
            name: "Municipal Election".to_string(),
            counting_method: VoteCountingMethod::CSO,
            election_id: "MunicipalElection_2025".to_string(),
            location: "Heemdamseburg".to_string(),
            domain_id: "0000".to_string(),
            category: ElectionCategory::Municipal,
            number_of_seats: 29,
            number_of_voters: 25000,
            election_date: Utc::now().date_naive(),
            nomination_date: Utc::now().date_naive(),
            political_groups: vec![],
        };

        let content = generate_pdf(ModelNa31_2Input {
            summary: ElectionSummary::zero().into(),
            votes_tables: VotesTables::new(&election, &ElectionSummary::zero()).unwrap(),
            committee_session: committee_session_fixture(ElectionId::from(1)),
            election: election.into(),
            polling_stations: vec![],
            hash: "ed36 60eb 017a 0d3a d3ef 72b1 6865 f991 a36a 9f92 72d9 1516 39cd 422b 4756 d161"
                .to_string(),
            creation_date_time: "04-12-2024 12:08".to_string(),
        }.to_pdf_file_model("file.pdf".into()))
        .await
        .unwrap();

        assert!(!content.buffer.is_empty());
    }

    #[test(tokio::test)]
    async fn it_generates_a_pdf_with_teletex_chars() {
        let content = generate_pdf(PdfFileModel {
            file_name: "file.pdf".into(),
            model: PdfModel::TestTeletexCharset(),
        })
        .await
        .unwrap();

        assert!(!content.buffer.is_empty());
    }

    #[test(tokio::test)]
    async fn it_generates_a_pdf_with_unsupported_chars() {
        let content = generate_pdf(PdfFileModel {
            file_name: "file.pdf".into(),
            model: PdfModel::TestUnsupportedChars(),
        })
        .await
        .unwrap();

        assert!(!content.buffer.is_empty());
    }

    #[test(tokio::test)]
    async fn it_generates_a_pdf_with_polling_stations() {
        let election = ElectionWithPoliticalGroups::election_fixture(&[2, 3]);
        let committee_session = committee_session_fixture(election.id);
        let summary = ElectionSummary::from_results(&election, &[]).unwrap();

        let content = generate_pdf(ModelNa31_2Input {
            votes_tables: VotesTables::new(&election, &summary).unwrap(),
            summary: summary.into(),
            polling_stations: polling_stations_fixture(&election, committee_session.id,  &[100, 200, 300]),
            committee_session,
            election: election.into(),
            hash: "ed36 60eb 017a 0d3a d3ef 72b1 6865 f991 a36a 9f92 72d9 1516 39cd 422b 4756 d161"
                .to_string(),
            creation_date_time: "04-12-2024 12:08".to_string(),
        }.to_pdf_file_model("file.pdf".into()))
        .await
        .unwrap();

        assert!(!content.buffer.is_empty());
    }
}
