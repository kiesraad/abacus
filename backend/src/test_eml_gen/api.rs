use axum::{extract::Path, http::StatusCode};
use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{
    APIError, AppState, ErrorResponse,
    eml::{
        EML110, EML230, EMLDocument,
        common::Candidate,
        eml_110::{PollingPlace, RegisteredParty},
    },
    test_eml_gen::{EML_110A_ITEM, EML_110B_ITEM, EML_230B_ITEM},
};

/// Router for the e2e helper endpoints
pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::default()
        .routes(routes!(generate_eml110a))
        .routes(routes!(generate_eml110b))
        .routes(routes!(generate_eml230b))
}

#[utoipa::path(
    get,
    path = "/api/generate_eml110a/{min_size_bytes}",
    responses(
        (status = 200, description = "EML generated"),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
)]
async fn generate_eml110a(
    Path(min_size_bytes): Path<usize>,
) -> Result<(StatusCode, String), APIError> {
    Ok((StatusCode::OK, eml110a(min_size_bytes)))
}

fn eml110a(min_size_bytes: usize) -> String {
    let eml110a_str = include_str!("../eml/tests/eml110a_test.eml.xml");
    let mut eml110a = EML110::from_str(eml110a_str).expect("Could not parse EML");
    let registered_party: RegisteredParty =
        quick_xml::de::from_str(EML_110A_ITEM).expect("Could not parse registered party");
    eml110a
        .election_event
        .election
        .registered_parties
        .resize(min_size_bytes / EML_110A_ITEM.len(), registered_party);
    eml110a.to_xml_string().expect("Could not serialize")
}

#[utoipa::path(
    get,
    path = "/api/generate_eml110b/{min_size_bytes}",
    responses(
        (status = 200, description = "EML generated"),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
)]
async fn generate_eml110b(
    Path(min_size_bytes): Path<usize>,
) -> Result<(StatusCode, String), APIError> {
    Ok((StatusCode::OK, eml110b(min_size_bytes)))
}

fn eml110b(min_size_bytes: usize) -> String {
    let eml110b_str = include_str!("../eml/tests/eml110b_test.eml.xml");
    let mut eml110b = EML110::from_str(eml110b_str).expect("Could not parse EML");
    let polling_place: PollingPlace =
        quick_xml::de::from_str(EML_110B_ITEM).expect("Could not parse Polling Place");
    eml110b
        .election_event
        .election
        .contest
        .polling_places
        .resize(min_size_bytes / EML_110B_ITEM.len(), polling_place);
    eml110b.to_xml_string().expect("Could not serialize")
}

#[utoipa::path(
    get,
    path = "/api/generate_eml230b/{min_size_bytes}",
    responses(
        (status = 200, description = "EML generated"),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
)]
async fn generate_eml230b(
    Path(min_size_bytes): Path<usize>,
) -> Result<(StatusCode, String), APIError> {
    Ok((StatusCode::OK, eml230b(min_size_bytes)))
}

fn eml230b(min_size_bytes: usize) -> String {
    let eml230b_str = include_str!("../eml/tests/eml230b_test.eml.xml");
    let mut eml230b = EML230::from_str(eml230b_str).expect("Could not parse EML");
    let candidate: Candidate =
        quick_xml::de::from_str(EML_230B_ITEM).expect("Could not parse candidate");
    eml230b
        .candidate_list
        .election
        .contest
        .affiliations
        .last_mut()
        .expect("No existing affiliation in test file")
        .candidates
        .resize(min_size_bytes / EML_230B_ITEM.len(), candidate);
    eml230b.to_xml_string().expect("Could not serialize")
}
