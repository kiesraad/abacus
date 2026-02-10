use chrono::Utc;
use test_log::test;

use super::generate_pdf;
use crate::domain::{
    committee_session::committee_session_fixture,
    election::{
        ElectionCategory, ElectionId, ElectionWithPoliticalGroups, VoteCountingMethod,
        tests::election_fixture,
    },
    models::{ModelNa31_2Input, PdfFileModel, PdfModel, ToPdfFileModel, filter_input},
    polling_station::polling_stations_fixture,
    summary::ElectionSummary,
    votes_table::VotesTables,
};

#[test(tokio::test)]
async fn it_generates_a_pdf() {
    let election = ElectionWithPoliticalGroups {
        id: ElectionId::from(1),
        name: "Municipal Election".to_string(),
        counting_method: VoteCountingMethod::CSO,
        election_id: "MunicipalElection_2025".to_string(),
        location: "Heemdamseburg".to_string(),
        domain_id: "0000".to_string(),
        category: ElectionCategory::Municipal,
        number_of_seats: 29,
        number_of_voters: 25000,
        election_date: Utc::now().date_naive(),
        nomination_date: Utc::now().date_naive(),
        political_groups: vec![],
    };

    let content = generate_pdf(
        ModelNa31_2Input {
            summary: ElectionSummary::zero().into(),
            votes_tables: VotesTables::new(&election, &ElectionSummary::zero()).unwrap(),
            committee_session: committee_session_fixture(ElectionId::from(1)),
            election: election.into(),
            polling_stations: vec![],
            hash: "ed36 60eb 017a 0d3a d3ef 72b1 6865 f991 a36a 9f92 72d9 1516 39cd 422b 4756 d161"
                .to_string(),
            creation_date_time: "04-12-2024 12:08".to_string(),
        }
        .to_pdf_file_model("file.pdf".into()),
    )
    .await
    .unwrap();

    assert!(!content.buffer.is_empty());
}

#[test(tokio::test)]
async fn the_default_font_supports_teletex_chars() {
    // See backend/templates/inputs/test-teletex-charset.json for the list of characters that are expected to be supported.
    let input = (32..127)
        .map(|codepoint| char::from_u32(codepoint).unwrap())
        .collect::<String>();

    let filtered_input = filter_input::replace_unsupported_glyphs(input.clone());
    assert_eq!(input, filtered_input);

    let input = (161..383)
        .map(|codepoint| char::from_u32(codepoint).unwrap())
        .collect::<String>();

    let filtered_input = filter_input::replace_unsupported_glyphs(input.clone());
    assert_eq!(input, filtered_input);
}

#[test(tokio::test)]
async fn it_generates_a_pdf_with_teletex_chars() {
    let content = generate_pdf(PdfFileModel {
        file_name: "file.pdf".into(),
        model: PdfModel::TestTeletexCharset(),
    })
    .await
    .unwrap();

    assert!(!content.buffer.is_empty());
}

#[test(tokio::test)]
async fn it_generates_a_pdf_with_unsupported_chars() {
    let content = generate_pdf(PdfFileModel {
        file_name: "file.pdf".into(),
        model: PdfModel::TestUnsupportedChars(),
    })
    .await
    .unwrap();

    assert!(!content.buffer.is_empty());
}

#[test(tokio::test)]
async fn it_generates_a_pdf_with_polling_stations() {
    let election = election_fixture(&[2, 3]);
    let committee_session = committee_session_fixture(election.id);
    let summary = ElectionSummary::from_results(&election, &[]).unwrap();

    let content = generate_pdf(
        ModelNa31_2Input {
            votes_tables: VotesTables::new(&election, &summary).unwrap(),
            summary: summary.into(),
            polling_stations: polling_stations_fixture(
                &election,
                committee_session.id,
                &[100, 200, 300],
            ),
            committee_session,
            election: election.into(),
            hash: "ed36 60eb 017a 0d3a d3ef 72b1 6865 f991 a36a 9f92 72d9 1516 39cd 422b 4756 d161"
                .to_string(),
            creation_date_time: "04-12-2024 12:08".to_string(),
        }
        .to_pdf_file_model("file.pdf".into()),
    )
    .await
    .unwrap();

    assert!(!content.buffer.is_empty());
}
