use chrono::{DateTime, Datelike, Local};
use pdf_gen::zip::slugify_filename;

use crate::domain::{
    committee_session::CommitteeSession,
    election::{CommitteeCategory, ElectionWithPoliticalGroups},
};

pub fn download_zip_filename(
    election: &ElectionWithPoliticalGroups,
    created_at: DateTime<Local>,
    base_name: &str,
) -> String {
    let location = election.location.to_lowercase();
    let location_without_whitespace: String = location.split_whitespace().collect();
    slugify_filename(&format!(
        "{} {}{} {} gemeente {}-{}-{}.zip",
        base_name,
        election.category.to_eml_code().to_lowercase(),
        election.election_date.year(),
        location_without_whitespace,
        location.replace(" ", "-"),
        created_at.date_naive().format("%Y%m%d"),
        created_at.time().format("%H%M%S"),
    ))
}

pub fn xml_count_base_name(election: &ElectionWithPoliticalGroups) -> &'static str {
    match election.committee_category {
        CommitteeCategory::GSB => "Telling",
        CommitteeCategory::CSB => "Totaaltelling",
    }
}

pub fn zip_file_base_name_gsb(committee_session: &CommitteeSession) -> &'static str {
    if committee_session.is_next_session() {
        "correctie"
    } else {
        "definitieve-documenten"
    }
}

pub fn xml_zip_filename(election: &ElectionWithPoliticalGroups) -> String {
    use chrono::Datelike;
    let location_without_whitespace: String = election.location.split_whitespace().collect();
    slugify_filename(&format!(
        "{} {}{} {}.zip",
        xml_count_base_name(election),
        election.category.to_eml_code(),
        election.election_date.year(),
        location_without_whitespace
    ))
}

pub fn xml_results_zip_filename(election: &ElectionWithPoliticalGroups) -> String {
    use chrono::Datelike;
    let location_without_whitespace: String = election.location.split_whitespace().collect();
    slugify_filename(&format!(
        "Resultaat {}{} {}.zip",
        election.category.to_eml_code(),
        election.election_date.year(),
        location_without_whitespace
    ))
}
