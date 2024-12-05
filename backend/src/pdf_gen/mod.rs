use std::time::Instant;

use models::PdfModel;
use tracing::{debug, info, warn};

use crate::APIError;
use typst_pdf::{PdfOptions, PdfStandard, PdfStandards};

use self::world::PdfWorld;

pub mod models;
mod world;

pub struct PdfGenResult {
    pub buffer: Vec<u8>,
}

pub fn generate_pdf(model: PdfModel) -> Result<PdfGenResult, APIError> {
    let start = Instant::now();
    let mut world = PdfWorld::new();
    world.set_input_model(model);

    let compile_start = Instant::now();
    let result = typst::compile(&world);
    let document = result
        .output
        .map_err(|err| APIError::PdfGenError(err.to_vec()))?;
    info!("Compile took {} ms", compile_start.elapsed().as_millis());

    info!("{} warnings", result.warnings.len());
    result.warnings.iter().for_each(|warning| {
        warn!("Warning: {:?}", warning);
    });

    debug!("Generating PDF...");
    let pdf_gen_start = Instant::now();
    let pdf_standards =
        PdfStandards::new(&[PdfStandard::A_2b]).expect("PDF standards should be valid");
    let pdf_options = PdfOptions {
        standards: pdf_standards,
        ..Default::default()
    };
    let buffer = typst_pdf::pdf(&document, &pdf_options)
        .map_err(|err| APIError::PdfGenError(err.to_vec()))?;
    debug!(
        "PDF generation took {} ms",
        pdf_gen_start.elapsed().as_millis()
    );

    info!("Finished in {} ms", start.elapsed().as_millis());
    Ok(PdfGenResult { buffer })
}

#[cfg(test)]
pub(crate) mod tests {
    use chrono::Utc;
    use models::ModelNa31_2Input;

    use super::*;
    use crate::election::ElectionStatus;
    use crate::{
        election::{tests::election_fixture, Election, ElectionCategory},
        polling_station::{PollingStation, PollingStationType},
        summary::ElectionSummary,
    };

    pub fn polling_stations_fixture(
        election: &Election,
        polling_station_voter_count: &[i64],
    ) -> Vec<PollingStation> {
        let mut polling_stations = Vec::new();
        for (i, voter_count) in polling_station_voter_count.iter().enumerate() {
            let idx = i + 1;
            polling_stations.push(PollingStation {
                id: idx as u32,
                election_id: election.id,
                name: format!("Testplek {idx}"),
                number: idx as i64 + 30,
                number_of_voters: if *voter_count < 0 {
                    None
                } else {
                    Some(*voter_count)
                },
                polling_station_type: PollingStationType::Special,
                street: "Teststraat".to_string(),
                house_number: format!("{idx}"),
                house_number_addition: if idx % 2 == 0 {
                    Some("b".to_string())
                } else {
                    None
                },
                postal_code: "1234 QY".to_string(),
                locality: "Testdorp".to_string(),
            });
        }
        polling_stations
    }

    #[test]
    fn it_generates_a_pdf() {
        let content = generate_pdf(PdfModel::ModelNa31_2(ModelNa31_2Input {
            election: Election {
                id: 1,
                name: "Municipal Election".to_string(),
                location: "Heemdamseburg".to_string(),
                number_of_voters: 100,
                category: ElectionCategory::Municipal,
                number_of_seats: 29,
                election_date: Utc::now().date_naive(),
                nomination_date: Utc::now().date_naive(),
                status: ElectionStatus::DataEntryFinished,
                political_groups: None,
            },
            polling_stations: vec![],
            summary: ElectionSummary::zero(),
            hash: "ED36 60EB 017A 0D3A D3EF 72B1 6865 F991 A36A 9F92 72D9 1516 39CD 422B 4756 D161"
                .to_string(),
            creation_date_time: "04-12-2024 12:08:55".to_string(),
        }))
        .unwrap();

        assert!(!content.buffer.is_empty());
    }

    #[test]
    fn it_generates_a_pdf_with_polling_stations() {
        let election = election_fixture(&[2, 3]);
        let content = generate_pdf(PdfModel::ModelNa31_2(ModelNa31_2Input {
            polling_stations: polling_stations_fixture(&election, &[100, 200, 300]),
            election,
            summary: ElectionSummary::zero(),
            hash: "ED36 60EB 017A 0D3A D3EF 72B1 6865 F991 A36A 9F92 72D9 1516 39CD 422B 4756 D161"
                .to_string(),
            creation_date_time: "04-12-2024 12:08:55".to_string(),
        }))
        .unwrap();

        assert!(!content.buffer.is_empty());
    }
}
