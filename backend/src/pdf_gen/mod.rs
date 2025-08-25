pub mod models;

#[cfg(feature = "embed-typst")]
mod embedded;

#[cfg(not(feature = "embed-typst"))]
mod external;

#[cfg(feature = "embed-typst")]
pub use embedded::{PdfGenError, generate_pdf, generate_pdfs};
#[cfg(not(feature = "embed-typst"))]
pub use external::{PdfGenError, generate_pdf, generate_pdfs};

pub struct PdfGenResult {
    pub buffer: Vec<u8>,
}

#[cfg(test)]
pub(crate) mod tests {
    use chrono::Utc;
    use models::ModelNa31_2Input;

    use super::*;
    use crate::{
        committee_session::tests::committee_session_fixture,
        election::{
            ElectionCategory, ElectionWithPoliticalGroups, VoteCountingMethod,
            tests::election_fixture,
        },
        pdf_gen::models::ToPdfFileModel,
        polling_station::{PollingStation, PollingStationType},
        summary::ElectionSummary,
    };

    pub fn polling_stations_fixture(
        election: &ElectionWithPoliticalGroups,
        committee_session_id: u32,
        polling_station_voter_count: &[i64],
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
                number: idx as i64 + 30,
                number_of_voters: if *voter_count < 0 {
                    None
                } else {
                    Some(*voter_count)
                },
                polling_station_type: Some(PollingStationType::Special),
                address: "Teststraat 2a".to_string(),
                postal_code: "1234 QY".to_string(),
                locality: "Testdorp".to_string(),
            });
        }
        polling_stations
    }

    #[tokio::test]
    async fn it_generates_a_pdf() {
        let content = generate_pdf(ModelNa31_2Input {
            committee_session: committee_session_fixture(1),
            election: ElectionWithPoliticalGroups {
                id: 1,
                name: "Municipal Election".to_string(),
                counting_method: VoteCountingMethod::CSO,
                election_id: "MunicipalElection_2025".to_string(),
                location: "Heemdamseburg".to_string(),
                domain_id: "0000".to_string(),
                category: ElectionCategory::Municipal,
                number_of_seats: 29,
                election_date: Utc::now().date_naive(),
                nomination_date: Utc::now().date_naive(),
                political_groups: vec![],
            },
            polling_stations: vec![],
            summary: ElectionSummary::zero(),
            hash: "ed36 60eb 017a 0d3a d3ef 72b1 6865 f991 a36a 9f92 72d9 1516 39cd 422b 4756 d161"
                .to_string(),
            creation_date_time: "04-12-2024 12:08".to_string(),
        }.to_pdf_file_model("file.pdf".into()))
        .await
        .unwrap();

        assert!(!content.buffer.is_empty());
    }

    #[tokio::test]
    async fn it_generates_a_pdf_with_polling_stations() {
        let election = election_fixture(&[2, 3]);
        let committee_session = committee_session_fixture(election.id);
        let content = generate_pdf(ModelNa31_2Input {
            polling_stations: polling_stations_fixture(&election, committee_session.id,  &[100, 200, 300]),
            committee_session,
            election,
            summary: ElectionSummary::zero(),
            hash: "ed36 60eb 017a 0d3a d3ef 72b1 6865 f991 a36a 9f92 72d9 1516 39cd 422b 4756 d161"
                .to_string(),
            creation_date_time: "04-12-2024 12:08".to_string(),
        }.to_pdf_file_model("file.pdf".into()))
        .await
        .unwrap();

        assert!(!content.buffer.is_empty());
    }
}
