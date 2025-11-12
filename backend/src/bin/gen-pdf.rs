use abacus::pdf_gen::models::{PdfFileModel, PdfModel};
use tokio::{fs, process::Command};

static MODELS: &[&str] = &[
    "model-na-14-2",
    "model-na-14-2-bijlage1",
    "model-na-31-2",
    "model-na-31-2-bijlage1",
    "model-n-10-2",
    "model-p-2a",
];

static TMP_PATH: &str = "tmp-pdf-gen";

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
    let git_hash = get_git_hash().await?;
    let path = format!("{TMP_PATH}/{git_hash}");

    println!("Generating PDFs with git hash: {}", git_hash.trim());
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

        let pdf = abacus::pdf_gen::generate_pdf(file_model).await?;

        // write file
        fs::write(&file_name, pdf.buffer).await?;

        let elapsed = now_pdf.elapsed()?.as_millis();
        println!("Generated PDF {file_name} in {elapsed}ms");
    }

    let elapsed = now.elapsed()?.as_millis();
    println!("PDFs generated in {elapsed}ms");

    Ok(())
}
