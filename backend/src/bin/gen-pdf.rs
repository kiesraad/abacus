use std::collections::BTreeMap;

use abacus::domain::models::{PdfFileModel, PdfModel};
use clap::Parser;
use pdf_gen::generate_pdf;
use tokio::{fs, process::Command};

/// Generate PDFs for all available models using the input JSON files in
/// `templates/inputs/` and store them in a subdirectory of `tmp-pdf-gen/`. The
/// subdirectory is named after the short git commit hash, or a custom name
#[derive(Parser, Debug)]
struct Args {
    /// Subdirectory to store generated PDFs, short git tag by default
    #[arg(short, long, env = "ABACUS_TEST_PDF_DIRECTORY")]
    directory: Option<String>,
}

/// A model variant is a Typst template with a JSON input
struct ModelVariant {
    /// Output PDF base name (must be unique)
    name: &'static str,
    /// Canonical model name passed to `PdfModel::from_name_with_input`
    model: &'static str,
    /// Input JSON path relative to `templates/inputs/`
    input: &'static str,
}

/// List of all model variants to render
static VARIANTS: &[ModelVariant] = &[
    ModelVariant {
        name: "model-na-14-2",
        model: "model-na-14-2",
        input: "model-na-14-2.json",
    },
    ModelVariant {
        name: "model-na-14-2-bijlage1",
        model: "model-na-14-2-bijlage1",
        input: "model-na-14-2-bijlage1.json",
    },
    ModelVariant {
        name: "model-na-31-2",
        model: "model-na-31-2",
        input: "model-na-31-2.json",
    },
    ModelVariant {
        name: "model-na-31-2-bijlage1",
        model: "model-na-31-2-bijlage1",
        input: "model-na-31-2-bijlage1.json",
    },
    ModelVariant {
        name: "model-na-31-2-inlegvel",
        model: "model-na-31-2-inlegvel",
        input: "model-na-31-2-inlegvel.json",
    },
    ModelVariant {
        name: "model-n-10-2",
        model: "model-n-10-2",
        input: "model-n-10-2.json",
    },
    ModelVariant {
        name: "model-p-2a",
        model: "model-p-2a",
        input: "model-p-2a.json",
    },
    ModelVariant {
        name: "model-p-22-2-gte-19-seats",
        model: "model-p-22-2",
        input: "extra-model-p-22-2-variations/gte-19-seats.json",
    },
    ModelVariant {
        name: "model-p-22-2-gte-19-seats-and-p7-drawing-lots",
        model: "model-p-22-2",
        input: "extra-model-p-22-2-variations/gte-19-seats-and-p7-drawing-lots.json",
    },
    ModelVariant {
        name: "model-p-22-2-gte-19-seats-and-p9",
        model: "model-p-22-2",
        input: "extra-model-p-22-2-variations/gte-19-seats-and-p9.json",
    },
    ModelVariant {
        name: "model-p-22-2-gte-19-seats-and-p9-drawing-lots-and-deceased-candidates",
        model: "model-p-22-2",
        input: "extra-model-p-22-2-variations/gte-19-seats-and-p9-drawing-lots-and-deceased-candidates.json",
    },
    ModelVariant {
        name: "model-p-22-2-lt-19-seats",
        model: "model-p-22-2",
        input: "extra-model-p-22-2-variations/lt-19-seats.json",
    },
    ModelVariant {
        name: "model-p-22-2-lt-19-seats-and-p7-drawing-lots",
        model: "model-p-22-2",
        input: "extra-model-p-22-2-variations/lt-19-seats-and-p7-drawing-lots.json",
    },
    // `lt-19-seats-and-p9-and-p10.json` is equal to input `model-p-22-2.json`
    ModelVariant {
        name: "model-p-22-2-lt-19-seats-and-p9-and-p10",
        model: "model-p-22-2",
        input: "extra-model-p-22-2-variations/lt-19-seats-and-p9-and-p10.json",
    },
    ModelVariant {
        name: "model-p-22-2-lt-19-seats-and-p9-drawing-lots",
        model: "model-p-22-2",
        input: "extra-model-p-22-2-variations/lt-19-seats-and-p9-drawing-lots.json",
    },
    ModelVariant {
        name: "model-p-22-2-lt-19-seats-and-p10",
        model: "model-p-22-2",
        input: "extra-model-p-22-2-variations/lt-19-seats-and-p10.json",
    },
    ModelVariant {
        name: "model-p-22-2-bijlage1",
        model: "model-p-22-2-bijlage1",
        input: "model-p-22-2-bijlage1.json",
    },
];

/// Temporary path to store generated PDFs
static TMP_PATH: &str = "tmp-pdf-gen";

/// Get the short git commit hash (7 characters)
async fn get_git_hash() -> Result<String, Box<dyn std::error::Error>> {
    let output = Command::new("git")
        .args(["rev-parse", "HEAD"])
        .output()
        .await?;
    let git_hash = String::from_utf8(output.stdout)?;
    let git_hash = &git_hash[..7];

    Ok(git_hash.to_string())
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args = Args::parse();

    let directory = match args.directory {
        Some(dir) => dir,
        None => get_git_hash().await?,
    };

    let path = format!("{TMP_PATH}/{directory}");

    println!("Generating PDFs in directory: {directory}");
    let now = std::time::SystemTime::now();

    // create tmp directory
    fs::create_dir_all(&path).await?;

    let mut manifest: BTreeMap<String, String> = BTreeMap::new();

    for variant in VARIANTS {
        let now_pdf = std::time::SystemTime::now();

        let input_path = format!("templates/inputs/{}", variant.input);
        let contents = fs::read_to_string(input_path).await?;
        let model = PdfModel::from_name_with_input(variant.model, &contents)?;
        let file_name = format!("{path}/{}.pdf", variant.name);
        manifest.insert(
            format!("{}.pdf", variant.name),
            model.as_template_path_str().to_string(),
        );
        let file_model = PdfFileModel::new(file_name.clone(), model);

        let pdf = match generate_pdf(file_model).await {
            Ok(pdf) => pdf,
            Err(e) => {
                eprintln!("Error generating PDF {file_name}: {e:?}");
                std::process::exit(1);
            }
        };

        fs::write(&file_name, pdf.buffer).await?;

        let elapsed = now_pdf.elapsed()?.as_millis();
        println!("Generated PDF {file_name} in {elapsed}ms");
    }

    let manifest_path = format!("{path}/manifest.json");
    fs::write(&manifest_path, serde_json::to_string_pretty(&manifest)?).await?;

    let elapsed = now.elapsed()?.as_millis();
    println!("PDFs generated in {elapsed}ms");

    Ok(())
}

#[cfg(test)]
mod tests {
    use std::{fs, path::PathBuf};

    use super::*;

    fn inputs_dir() -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("templates/inputs")
    }

    #[test]
    fn variant_names_are_unique() {
        let mut seen = std::collections::HashSet::new();
        for variant in VARIANTS {
            assert!(
                seen.insert(variant.name),
                "Duplicate variant output name `{}`; output names must be unique",
                variant.name
            );
        }
    }

    /// Check that all models exist and can be parsed
    #[test]
    fn variant_templates_exist() {
        let inputs = inputs_dir();
        let templates = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("templates");

        for variant in VARIANTS {
            let input_path = inputs.join(variant.input);
            let contents = fs::read_to_string(&input_path)
                .unwrap_or_else(|err| panic!("Failed to read {}: {err}", input_path.display()));

            let parsed = PdfModel::from_name_with_input(variant.model, &contents)
                .unwrap_or_else(|err| panic!("Failed to parse `{}`: {err}", variant.name));

            let template_path = templates.join(parsed.as_template_path_str());
            assert!(
                template_path.exists(),
                "Variant `{}` maps to missing template {}",
                variant.name,
                template_path.display()
            );
        }
    }
}
