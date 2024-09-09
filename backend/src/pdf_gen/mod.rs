use std::time::Instant;

use models::PdfModel;
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
    println!("Compile took {} ms", compile_start.elapsed().as_millis());

    let warnings = &tracer.warnings();
    println!("{} warnings", warnings.len());
    warnings.iter().for_each(|warning| {
        println!("Warning: {:?}", warning);
    });

    let buffer = match result {
        Ok(document) => {
            println!("Generating PDF...");
            let pdf_gen_start = Instant::now();
            let buffer: Vec<u8> = typst_pdf::pdf(&document, Smart::Auto, None);
            println!(
                "PDF generation took {} ms",
                pdf_gen_start.elapsed().as_millis()
            );
            Ok(buffer)
        }
        Err(err) => Err(APIError::PdfGenError(err.into_iter().collect())),
    }?;

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
            location: "Gemeente Zilverhaven".to_string(),
            election: Election {
                id: 1,
                name: "Gemeente Zilverhaven".to_string(),
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
