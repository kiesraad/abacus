#![cfg(test)]

use abacus::eml::EmlHash;
use axum::http::StatusCode;
use sqlx::SqlitePool;
use test_log::test;

use crate::{
    shared::{
        FixtureUser::*, get_election_details, get_statuses, login, post_election_import,
        post_election_import_validate,
    },
    utils::serve_api,
};

struct ElectionVariant {
    name: &'static str,
    category: &'static str,
    // TODO #4232: remove when CSB is supported for PS/TK
    csb_supported: bool,
    csb_sub_committees: usize,
    gsb_district: DistrictGSB,
    election_data: &'static str,
    candidate_data: &'static str,
}

struct DistrictGSB {
    number: u32,
    authority_id: &'static str,
    authority_name: &'static str,
}

const ELECTIONS: &[ElectionVariant] = &[
    ElectionVariant {
        name: "GR",
        category: "Municipal",
        csb_supported: true,
        csb_sub_committees: 1,
        gsb_district: DistrictGSB {
            number: 0,
            authority_id: "0000",
            authority_name: "Test",
        },
        election_data: include_str!("../../src/eml/tests/eml110a_test.eml.xml"),
        candidate_data: include_str!("../../src/eml/tests/eml230b_test.eml.xml"),
    },
    ElectionVariant {
        name: "WS",
        category: "WaterAuthority",
        csb_supported: true,
        csb_sub_committees: 4,
        gsb_district: DistrictGSB {
            number: 123,
            authority_id: "0123",
            authority_name: "Heemdamseburg",
        },
        election_data: include_str!("../../src/eml/tests/eml110a_test_AB.eml.xml"),
        candidate_data: include_str!("../../src/eml/tests/eml230b_test_AB.eml.xml"),
    },
    ElectionVariant {
        name: "PS1",
        category: "Provincial",
        csb_supported: false,
        csb_sub_committees: 0,
        gsb_district: DistrictGSB {
            number: 123,
            authority_id: "0123",
            authority_name: "Heemdamseburg",
        },
        election_data: include_str!("../../src/eml/tests/eml110a_test_PS1.eml.xml"),
        candidate_data: include_str!("../../src/eml/tests/eml230b_test_PS1.eml.xml"),
    },
    ElectionVariant {
        name: "PS2",
        category: "Provincial",
        csb_supported: false,
        csb_sub_committees: 0,
        gsb_district: DistrictGSB {
            number: 125,
            authority_id: "0125",
            authority_name: "Middelgein",
        },
        election_data: include_str!("../../src/eml/tests/eml110a_test_PS2.eml.xml"),
        candidate_data: include_str!("../../src/eml/tests/eml230b_test_PS2.eml.xml"),
    },
    ElectionVariant {
        name: "TK",
        category: "HouseOfRepresentatives",
        csb_supported: false,
        csb_sub_committees: 0,
        gsb_district: DistrictGSB {
            number: 125,
            authority_id: "0125",
            authority_name: "Middelgein",
        },
        election_data: include_str!("../../src/eml/tests/eml110a_test_TK.eml.xml"),
        candidate_data: include_str!("../../src/eml/tests/eml230b_test_TK.eml.xml"),
    },
];

const ELECTION_GR: &ElectionVariant = &ELECTIONS[0];

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("users"))))]
async fn test_election_validate(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let admin_cookie = login(&addr, Admin).await;

    for committee_category in ["GSB", "HSB", "CSB"] {
        let is_gsb = committee_category == "GSB";
        for variant in ELECTIONS {
            // Validate the election definition, without and with candidates
            for with_candidates in [false, true] {
                let case = format!(
                    "{} {} validate, with candidates: {}",
                    committee_category, variant.name, with_candidates
                );
                let mut body = serde_json::json!({
                    "committee_category": committee_category,
                    "election_data": variant.election_data,
                });
                if with_candidates {
                    body["election_hash"] =
                        serde_json::json!(EmlHash::from(variant.election_data.as_bytes()).chunks);
                    body["candidate_data"] = variant.candidate_data.into();
                }
                let response = post_election_import_validate(&addr, &admin_cookie, body).await;

                // TODO #4232: remove when CSB is supported for PS/TK
                if !is_gsb && !variant.csb_supported {
                    assert_eq!(response.status(), StatusCode::BAD_REQUEST, "{case}");
                    let body: serde_json::Value = response.json().await.unwrap();
                    assert_eq!(body["reference"], "EmlImportError", "{case}");
                    continue;
                }

                assert_eq!(response.status(), StatusCode::OK, "{case}");
                let body: serde_json::Value = response.json().await.unwrap();
                assert_eq!(body["committee_category"], committee_category, "{case}");
                assert_eq!(body["election"]["category"], variant.category, "{case}");

                // Only GSB responses have these fields
                assert_eq!(body.get("number_of_voters").is_some(), is_gsb, "{case}");
                assert_eq!(body.get("gsb_list").is_some(), is_gsb, "{case}");

                // No polling station data was sent
                assert!(body.get("polling_stations").is_none(), "{case}");
                assert!(
                    body.get("polling_station_definition_matches_election")
                        .is_none(),
                    "{case}"
                );
            }
        }
    }
}

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("users"))))]
async fn test_election_import(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let admin_cookie = login(&addr, Admin).await;

    for committee_category in ["GSB", "HSB", "CSB"] {
        let is_gsb = committee_category == "GSB";
        for variant in ELECTIONS {
            let case = format!("{} {} import", committee_category, variant.name);
            let mut body = serde_json::json!({
                "committee_category": committee_category,
                "election_hash": EmlHash::from(variant.election_data.as_bytes()).chunks,
                "election_data": variant.election_data,
                "candidate_hash": EmlHash::from(variant.candidate_data.as_bytes()).chunks,
                "candidate_data": variant.candidate_data,
            });
            if is_gsb {
                body["number_of_voters"] = 1234.into();
                body["counting_method"] = "CSO".into();
                body["selected_region"] = serde_json::json!({ "category": "Municipality", "number": variant.gsb_district.number });
            }
            let response = post_election_import(&addr, &admin_cookie, body).await;

            // TODO #4232: remove when CSB is supported for PS/TK
            if !is_gsb && !variant.csb_supported {
                assert_eq!(response.status(), StatusCode::BAD_REQUEST, "{case}");
                let body: serde_json::Value = response.json().await.unwrap();
                assert_eq!(body["reference"], "EmlImportError", "{case}");
                continue;
            }

            assert_eq!(response.status(), StatusCode::CREATED, "{case}");
            let body: serde_json::Value = response.json().await.unwrap();
            assert_eq!(body["committee_category"], committee_category, "{case}");

            let election_id = u32::try_from(body["id"].as_u64().unwrap()).unwrap();
            let election_details = get_election_details(&addr, &admin_cookie, election_id).await;
            let election = &election_details["election"];
            let status = &election_details["current_committee_session"]["status"];
            assert_eq!(election["committee_category"], committee_category, "{case}");
            assert_eq!(election["category"], variant.category, "{case}");

            if is_gsb {
                assert_eq!(election["counting_method"], "CSO", "{case}");
                assert_eq!(election["number_of_voters"], 1234, "{case}");
                assert_eq!(
                    election["authority_id"], variant.gsb_district.authority_id,
                    "{case}"
                );
                assert_eq!(
                    election["authority_name"], variant.gsb_district.authority_name,
                    "{case}"
                );
                assert_eq!(status, "created", "{case}");
            } else {
                assert!(election["counting_method"].is_null(), "{case}");
                assert_eq!(election["number_of_voters"], 1, "{case}");
                assert_eq!(status, "in_preparation", "{case}");

                let statuses = get_statuses(&addr, &admin_cookie, election_id).await;
                assert_eq!(statuses.len(), variant.csb_sub_committees, "{case}");
                let sub_committee = statuses
                    .values()
                    .map(|s| &s["source"])
                    .find(|s| s["number"] == variant.gsb_district.number)
                    .expect(&case);
                assert_eq!(
                    sub_committee["authority_id"], variant.gsb_district.authority_id,
                    "{case}"
                );
                assert_eq!(
                    sub_committee["authority_name"], variant.gsb_district.authority_name,
                    "{case}"
                );
                assert_eq!(
                    sub_committee["name"], variant.gsb_district.authority_name,
                    "{case}"
                );
                assert_eq!(sub_committee["type"], "SubCommittee", "{case}");
            }
        }
    }
}

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("users"))))]
async fn test_csb_water_authority_election_validate_with_candidates(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let admin_cookie = login(&addr, Admin).await;
    let ws = &ELECTIONS[1];

    let response = post_election_import_validate(
        &addr,
        &admin_cookie,
        serde_json::json!({
            "committee_category": "CSB",
            "election_hash": EmlHash::from(ws.election_data.as_bytes()).chunks,
            "election_data": ws.election_data,
            "candidate_data": ws.candidate_data,
        }),
    )
    .await;

    assert_eq!(response.status(), StatusCode::OK);
    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(body["committee_category"], "CSB");
    assert_eq!(body["election"]["authority_id"], "CSB");
    assert_eq!(body["election"]["authority_name"], "Rivier en Polder");
    assert_eq!(body["election"]["category"], "WaterAuthority");
    assert_eq!(body["election"]["committee_category"], "CSB");
    assert_eq!(body["election"]["district"]["district"], "None");
    assert_eq!(body["election"]["name"], "Waterschap Rivier en Polder 2023");
    assert_eq!(
        body["election"]["official_name"],
        "Algemeen bestuur van het waterschap Rivier en Polder 2023"
    );
    // CSB responses don't have these GSB-specific fields.
    assert!(body.get("number_of_voters").is_none());
    assert!(body.get("gsb_list").is_none());
}

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("users"))))]
async fn test_election_validate_invalid_election_data(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let admin_cookie = login(&addr, Admin).await;

    #[rustfmt::skip]
    let cases = [
        ("limited elections supported", include_str!("../../src/eml/tests/eml110a_invalid_election_limited_elections_supported.eml.xml")),
        ("category and sub category mismatch", include_str!("../../src/eml/tests/eml110a_invalid_election_category_and_sub_category_mismatch.eml.xml")),
        ("missing election domain", include_str!("../../src/eml/tests/eml110a_invalid_election_missing_election_domain.eml.xml")),
        ("hash file instead of election definition", "5738 d520 a7f2 89b8 8875 ebfe cfc8 6012 d7b6 f65f 3271 d0e1 180b ccdd 8134 cd5d"),
    ];
    for committee_category in ["GSB", "CSB"] {
        for (name, election_data) in cases {
            let response = post_election_import_validate(
                &addr,
                &admin_cookie,
                serde_json::json!({
                    "committee_category": committee_category,
                    "election_data": election_data,
                }),
            )
            .await;
            let case = format!("{committee_category}: {name}");
            assert_eq!(response.status(), StatusCode::BAD_REQUEST, "{case}");
            let body: serde_json::Value = response.json().await.unwrap();
            assert_eq!(body["reference"], "EmlImportError", "{case}");
        }
    }
}

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("users"))))]
async fn test_election_validate_invalid_candidate_data(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let admin_cookie = login(&addr, Admin).await;

    #[rustfmt::skip]
    let cases = [
        ("wrong document type", include_str!("../../src/eml/tests/eml230b_invalid_document_type.eml.xml")),
        ("missing authority", include_str!("../../src/eml/tests/eml230b_invalid_missing_authority.eml.xml")),
        ("wrong election type", include_str!("../../src/eml/tests/eml230b_invalid_incorrect_election_type.eml.xml")),
        ("wrong election id", include_str!("../../src/eml/tests/eml230b_invalid_incorrect_election.eml.xml")),
        ("wrong election domain", include_str!("../../src/eml/tests/eml230b_invalid_incorrect_election_domain.eml.xml")),
        ("wrong election date", include_str!("../../src/eml/tests/eml230b_invalid_incorrect_election_date.eml.xml")),
        ("empty affiliates", include_str!("../../src/eml/tests/eml230b_invalid_empty_affiliates.eml.xml")),
        ("empty candidates", include_str!("../../src/eml/tests/eml230b_invalid_empty_candidates.eml.xml")),
    ];
    for committee_category in ["GSB", "CSB"] {
        for (name, candidate_data) in cases {
            let response = post_election_import_validate(
                &addr,
                &admin_cookie,
                serde_json::json!({
                    "committee_category": committee_category,
                    "election_hash": EmlHash::from(ELECTION_GR.election_data.as_bytes()).chunks,
                    "election_data": ELECTION_GR.election_data,
                    "candidate_data": candidate_data,
                }),
            )
            .await;
            let case = format!("{committee_category}: {name}");
            assert_eq!(response.status(), StatusCode::BAD_REQUEST, "{case}");
            let body: serde_json::Value = response.json().await.unwrap();
            assert_eq!(body["reference"], "EmlImportError", "{case}");
        }
    }
}

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("users"))))]
async fn test_election_import_wrong_hash(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let admin_cookie = login(&addr, Admin).await;

    for committee_category in ["GSB", "HSB", "CSB"] {
        for endpoint in ["validate", "import"] {
            for (field, valid_hash) in [
                (
                    "election_hash",
                    EmlHash::from(ELECTION_GR.election_data.as_bytes()).chunks,
                ),
                (
                    "candidate_hash",
                    EmlHash::from(ELECTION_GR.candidate_data.as_bytes()).chunks,
                ),
            ] {
                // Empty or wrongly filled in redacted chunks
                for stub in ["", "1234"] {
                    let case = format!("{committee_category} {endpoint}: {field} with {stub:?}");
                    let mut hash = valid_hash.clone();
                    hash[4] = stub.to_string();
                    hash[10] = stub.to_string();
                    let mut body = serde_json::json!({
                        "committee_category": committee_category,
                        "election_hash": EmlHash::from(ELECTION_GR.election_data.as_bytes()).chunks,
                        "election_data": ELECTION_GR.election_data,
                        "candidate_hash": EmlHash::from(ELECTION_GR.candidate_data.as_bytes()).chunks,
                        "candidate_data": ELECTION_GR.candidate_data,
                    });
                    if committee_category == "GSB" {
                        body["number_of_voters"] = 1234.into();
                        body["counting_method"] = "CSO".into();
                    }
                    body[field] = serde_json::json!(hash);
                    let response = match endpoint {
                        "validate" => {
                            post_election_import_validate(&addr, &admin_cookie, body).await
                        }
                        _ => post_election_import(&addr, &admin_cookie, body).await,
                    };
                    assert_eq!(response.status(), StatusCode::BAD_REQUEST, "{case}");
                    let body: serde_json::Value = response.json().await.unwrap();
                    assert_eq!(body["reference"], "InvalidHash", "{case}");
                }
            }
        }
    }
}

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("users"))))]
async fn test_gsb_election_import_save_with_polling_stations(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let admin_cookie = login(&addr, Admin).await;

    let response = post_election_import(
        &addr,
        &admin_cookie,
        serde_json::json!({
            "committee_category": "GSB",
            "election_hash": EmlHash::from(ELECTION_GR.election_data.as_bytes()).chunks,
            "election_data": ELECTION_GR.election_data,
            "candidate_hash": EmlHash::from(ELECTION_GR.candidate_data.as_bytes()).chunks,
            "candidate_data": ELECTION_GR.candidate_data,
            "polling_station_data": include_str!("../../src/eml/tests/eml110b_test.eml.xml"),
            "polling_station_file_name": "eml110b_test.eml.xml",
            "number_of_voters": 1234,
            "counting_method": "CSO",
        }),
    )
    .await;

    assert_eq!(response.status(), StatusCode::CREATED);
    let body: serde_json::Value = response.json().await.unwrap();
    let election_id = u32::try_from(body["id"].as_u64().unwrap()).unwrap();
    let election_details = get_election_details(&addr, &admin_cookie, election_id).await;
    // When importing polling stations, the committee session status changes to "in_preparation"
    assert_eq!(
        election_details["current_committee_session"]["status"],
        "in_preparation"
    );
}

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("users"))))]
async fn test_election_polling_stations_validate(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let admin_cookie = login(&addr, Admin).await;

    #[rustfmt::skip]
    let cases = [
        ("eml110b_test.eml.xml", include_str!("../../src/eml/tests/eml110b_test.eml.xml"), true),
        ("eml110b_not_matching_election_id.eml.xml", include_str!("../../src/eml/tests/eml110b_not_matching_election_id.eml.xml"), false)
    ];

    for (file_name, polling_station_data, matches_election) in cases {
        let response = post_election_import_validate(
            &addr,
            &admin_cookie,
            serde_json::json!({
                "committee_category": "GSB",
                "election_hash": EmlHash::from(ELECTION_GR.election_data.as_bytes()).chunks,
                "election_data": ELECTION_GR.election_data,
                "candidate_hash": EmlHash::from(ELECTION_GR.candidate_data.as_bytes()).chunks,
                "candidate_data": ELECTION_GR.candidate_data,
                "polling_station_data": polling_station_data,
                "polling_station_file_name": file_name,
                "number_of_voters": 1234,
                "counting_method": "CSO",
            }),
        )
        .await;

        assert_eq!(response.status(), StatusCode::OK, "{file_name}");
        let body: serde_json::Value = response.json().await.unwrap();
        assert_eq!(
            body["polling_station_definition_matches_election"], matches_election,
            "{file_name}"
        );
    }
}

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("users"))))]
async fn test_election_polling_stations_invalid(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let admin_cookie = login(&addr, Admin).await;

    #[rustfmt::skip]
    let cases = [
        ("missing file name", include_str!("../../src/eml/tests/eml110b_test.eml.xml"), None),
        ("election definition sent as polling stations", ELECTION_GR.election_data, Some("eml110a_test.eml.xml")),
    ];

    for endpoint in ["validate", "import"] {
        for (name, polling_station_data, file_name) in cases {
            let case = format!("{endpoint}: {name}");
            let mut body = serde_json::json!({
                "committee_category": "GSB",
                "election_hash": EmlHash::from(ELECTION_GR.election_data.as_bytes()).chunks,
                "election_data": ELECTION_GR.election_data,
                "candidate_hash": EmlHash::from(ELECTION_GR.candidate_data.as_bytes()).chunks,
                "candidate_data": ELECTION_GR.candidate_data,
                "polling_station_data": polling_station_data,
                "number_of_voters": 1234,
                "counting_method": "CSO",
            });
            if let Some(file_name) = file_name {
                body["polling_station_file_name"] = file_name.into();
            }
            let response = match endpoint {
                "validate" => post_election_import_validate(&addr, &admin_cookie, body).await,
                _ => post_election_import(&addr, &admin_cookie, body).await,
            };
            assert_eq!(response.status(), StatusCode::BAD_REQUEST, "{case}");
            let body: serde_json::Value = response.json().await.unwrap();
            assert_eq!(body["reference"], "EmlImportError", "{case}");
        }
    }
}
