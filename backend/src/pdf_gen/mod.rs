use std::time::Instant;

use crate::APIError;
use models::PdfModel;
use typst_pdf::PdfOptions;

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
    println!("Compile took {} ms", compile_start.elapsed().as_millis());

    println!("{} warnings", result.warnings.len());
    result.warnings.iter().for_each(|warning| {
        println!("Warning: {:?}", warning);
    });

    println!("Generating PDF...");
    let pdf_gen_start = Instant::now();
    let buffer = typst_pdf::pdf(&document, &PdfOptions::default())
        .map_err(|err| APIError::PdfGenError(err.to_vec()))?;
    println!(
        "PDF generation took {} ms",
        pdf_gen_start.elapsed().as_millis()
    );

    println!("Finished in {} ms", start.elapsed().as_millis());
    Ok(PdfGenResult { buffer })
}

#[cfg(test)]
mod tests {
    use chrono::Utc;
    use models::{ModelNa31_2Input, ModelNa31_2Summary};

    use crate::election::{Election, ElectionCategory};

    use super::*;

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
}
