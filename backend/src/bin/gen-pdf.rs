use abacus::{
    domain::models::{PdfFileModel, PdfModel},
    service::pdf_gen::generate_pdf,
};
use clap::Parser;
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

/// List of all available models
static MODELS: &[&str] = &[
    "model-na-14-2",
    "model-na-14-2-bijlage1",
    "model-na-31-2",
    "model-na-31-2-bijlage1",
    "model-na-31-2-inlegvel",
    "model-n-10-2",
    "model-p-2a",
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

    for model in MODELS {
        let now_pdf = std::time::SystemTime::now();

        let input_path = format!("templates/inputs/{}.json", model);
        let contents = fs::read_to_string(input_path).await?;
        let model = PdfModel::from_name_with_input(model, &contents)?;
        let file_name = format!("{path}/{}.pdf", model.as_model_name());
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
    fn each_model_has_a_template_input() {
        let dir = inputs_dir();

        for model in MODELS {
            let path = dir.join(format!("{model}.json"));
            assert!(
                path.exists(),
                "Missing template input for `{model}` at {}",
                path.display()
            );
        }
    }

    #[test]
    fn models_deserialize_using_their_template_input() {
        let dir = inputs_dir();

        for model in MODELS {
            let path = dir.join(format!("{model}.json"));
            let contents = fs::read_to_string(&path)
                .unwrap_or_else(|err| panic!("Failed to read {}: {err}", path.display()));

            let parsed = PdfModel::from_name_with_input(model, &contents)
                .unwrap_or_else(|err| panic!("Failed to parse `{model}`: {err}"));

            assert_eq!(parsed.as_model_name(), *model);
        }
    }
}
