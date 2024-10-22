use std::time::Instant;

use models::PdfModel;
use tracing::{debug, info, warn};
use typst::{eval::Tracer, foundations::Smart};

use crate::APIError;

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
    let mut tracer = Tracer::new();
    let result = typst::compile(&world, &mut tracer);
    info!("Compile took {} ms", compile_start.elapsed().as_millis());

    let warnings = &tracer.warnings();
    info!("{} warnings", warnings.len());
    warnings.iter().for_each(|warning| {
        warn!("Warning: {:?}", warning);
    });

    let buffer = match result {
        Ok(document) => {
            debug!("Generating PDF...");
            let pdf_gen_start = Instant::now();
            let buffer: Vec<u8> = typst_pdf::pdf(&document, Smart::Auto, None);
            debug!(
                "PDF generation took {} ms",
                pdf_gen_start.elapsed().as_millis()
            );
            Ok(buffer)
        }
        Err(err) => Err(APIError::PdfGenError(err.into_iter().collect())),
    }?;

    info!("Finished in {} ms", start.elapsed().as_millis());
    Ok(PdfGenResult { buffer })
}

#[cfg(test)]
mod tests {
    use chrono::Utc;
    use models::{ModelNa31_2Input, ModelNa31_2Summary};

    use crate::{
        election::{tests::election_fixture, Election, ElectionCategory},
        polling_station::{PollingStation, PollingStationType},
    };

    use super::*;

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
                polling_station_type: PollingStationType::Bijzonder,
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
                election_date: Utc::now().date_naive(),
                nomination_date: Utc::now().date_naive(),
                political_groups: None,
            },
            polling_stations: vec![],
            summary: ModelNa31_2Summary::zero(),
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
            summary: ModelNa31_2Summary::zero(),
        }))
        .unwrap();

        assert!(!content.buffer.is_empty());
    }
}
