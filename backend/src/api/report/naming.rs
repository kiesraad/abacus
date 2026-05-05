use chrono::{DateTime, Datelike, Local};
use pdf_gen::zip::slugify_filename;

use crate::domain::{election::ElectionWithPoliticalGroups, file::FileType};

pub fn download_zip_filename(
    base: &str,
    election: &ElectionWithPoliticalGroups,
    created_at: DateTime<Local>,
) -> String {
    let location = election.location.to_lowercase();
    let location_without_whitespace: String = location.split_whitespace().collect();
    slugify_filename(&format!(
        "{} {}{} {} gemeente {}-{}-{}.zip",
        base,
        election.category.to_eml_code().to_lowercase(),
        election.election_date.year(),
        location_without_whitespace,
        location.replace(" ", "-"),
        created_at.date_naive().format("%Y%m%d"),
        created_at.time().format("%H%M%S"),
    ))
}

/// Generates aa filename for the given election and file extension
/// E.g. "{base}_GR2026_GemeenteNaam.{ext}"
fn election_filename(election: &ElectionWithPoliticalGroups, base: &str, ext: &str) -> String {
    let location_without_whitespace: String = election.location.split_whitespace().collect();

    format!(
        "{base} {}{} {}.{ext}",
        election.category.to_eml_code(),
        election.election_date.year(),
        location_without_whitespace,
    )
}

pub fn filename_for(
    file_type: FileType,
    election: &ElectionWithPoliticalGroups,
    is_next_session: bool,
) -> String {
    use FileType::*;

    let filename = match file_type {
        GsbResultsEml => election_filename(election, "Telling", "eml.xml"),
        GsbResultsPdf => {
            if is_next_session {
                "Model Na14-2.pdf".to_string()
            } else {
                "Model Na31-2.pdf".to_string()
            }
        }
        GsbOverviewPdf => "Leeg Model P2a.pdf".to_string(),
        CsbResultsEml => election_filename(election, "Resultaat", "eml.xml"),
        CsbTotalCountsEml => election_filename(election, "Totaaltelling", "eml.xml"),
        CsbResultsPdf => "Model P22-2.pdf".to_string(),
        CsbAttachmentPdf => "Model P22-2 bijlage.pdf".to_string(),
    };

    slugify_filename(&filename)
}

/// Replaces the extension of the given filename with .zip
pub fn with_zip_extension(filename: &str) -> String {
    let base = filename.split('.').next().unwrap_or("Noname");
    format!("{}.zip", base)
}
