#![cfg(test)]

use axum::http::StatusCode;
use sqlx::SqlitePool;
use test_log::test;

use crate::{
    shared::{
        EML110A_TEST_AB_HASH, EML110A_TEST_HASH, EML110A_TEST_PS1_HASH, EML110A_TEST_PS2_HASH,
        EML110A_TEST_TK_HASH, EML230B_TEST_AB_HASH, EML230B_TEST_HASH, EML230B_TEST_PS1_HASH,
        EML230B_TEST_PS2_HASH, EML230B_TEST_TK_HASH, FixtureUser::*, get_election_details,
        get_statuses, login, post_election_import, post_election_import_validate,
    },
    utils::serve_api,
};

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("users"))))]
async fn test_election_validate_valid(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let admin_cookie = login(&addr, Admin).await;

    #[rustfmt::skip]
    let elections = [
        ("GR", "Municipal", true, include_str!("../../src/eml/tests/eml110a_test.eml.xml"), EML110A_TEST_HASH, include_str!("../../src/eml/tests/eml230b_test.eml.xml")),
        ("WS", "WaterAuthority", true, include_str!("../../src/eml/tests/eml110a_test_AB.eml.xml"), EML110A_TEST_AB_HASH, include_str!("../../src/eml/tests/eml230b_test_AB.eml.xml")),
        ("PS1", "Provincial", true, include_str!("../../src/eml/tests/eml110a_test_PS1.eml.xml"), EML110A_TEST_PS1_HASH, include_str!("../../src/eml/tests/eml230b_test_PS1.eml.xml")),

        // TODO #4232: set csb_supported=true when implemented
        ("PS2", "Provincial", false, include_str!("../../src/eml/tests/eml110a_test_PS2.eml.xml"), EML110A_TEST_PS2_HASH, include_str!("../../src/eml/tests/eml230b_test_PS2.eml.xml")),
        ("TK", "HouseOfRepresentatives", false, include_str!("../../src/eml/tests/eml110a_test_TK.eml.xml"), EML110A_TEST_TK_HASH, include_str!("../../src/eml/tests/eml230b_test_TK.eml.xml")),
    ];

    // TODO #3861: add HSB when election creation is allowed
    for committee_category in ["GSB", "CSB"] {
        for (name, category, csb_supported, election_data, election_hash, candidate_data) in
            elections
        {
            for with_candidates in [false, true] {
                let case =
                    format!("{committee_category} {name}, with candidates: {with_candidates}");
                let mut body = serde_json::json!({
                    "committee_category": committee_category,
                    "election_data": election_data,
                });
                if with_candidates {
                    body["election_hash"] = serde_json::json!(election_hash);
                    body["candidate_data"] = candidate_data.into();
                }
                let response = post_election_import_validate(&addr, &admin_cookie, body).await;

                let is_gsb = committee_category == "GSB";
                if !is_gsb && !csb_supported {
                    assert_eq!(response.status(), StatusCode::BAD_REQUEST, "{case}");
                    let body: serde_json::Value = response.json().await.unwrap();
                    assert_eq!(body["reference"], "EmlImportError", "{case}");
                    continue;
                }

                assert_eq!(response.status(), StatusCode::OK, "{case}");
                let body: serde_json::Value = response.json().await.unwrap();
                assert_eq!(body["committee_category"], committee_category, "{case}");
                assert_eq!(body["election"]["category"], category, "{case}");

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
async fn test_csb_water_authority_election_validate_with_candidates(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let admin_cookie = login(&addr, Admin).await;

    let response = post_election_import_validate(
        &addr,
        &admin_cookie,
        serde_json::json!({
            "committee_category": "CSB",
            "election_hash": EML110A_TEST_AB_HASH,
            "election_data": include_str!("../../src/eml/tests/eml110a_test_AB.eml.xml"),
            "candidate_data": include_str!("../../src/eml/tests/eml230b_test_AB.eml.xml"),
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
                    "election_hash": EML110A_TEST_HASH,
                    "election_data": include_str!("../../src/eml/tests/eml110a_test.eml.xml"),
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

    // TODO #3861: add HSB when election creation is allowed
    for committee_category in ["GSB", "CSB"] {
        for endpoint in ["validate", "import"] {
            for (field, valid_hash) in [
                ("election_hash", EML110A_TEST_HASH),
                ("candidate_hash", EML230B_TEST_HASH),
            ] {
                // Empty or wrongly filled in redacted chunks
                for stub in ["", "1234"] {
                    let case = format!("{committee_category} {endpoint}: {field} with {stub:?}");
                    let mut hash = valid_hash;
                    hash[4] = stub;
                    hash[10] = stub;
                    let mut body = serde_json::json!({
                        "committee_category": committee_category,
                        "election_hash": EML110A_TEST_HASH,
                        "election_data": include_str!("../../src/eml/tests/eml110a_test.eml.xml"),
                        "candidate_hash": EML230B_TEST_HASH,
                        "candidate_data": include_str!("../../src/eml/tests/eml230b_test.eml.xml"),
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
async fn test_csb_election_import_only_municipal_and_water_authority_elections_supported(
    pool: SqlitePool,
) {
    let addr = serve_api(pool).await;
    let admin_cookie = login(&addr, Admin).await;

    let cases = [
        (
            "PS1",
            include_str!("../../src/eml/tests/eml110a_test_PS1.eml.xml"),
            EML110A_TEST_PS1_HASH,
            include_str!("../../src/eml/tests/eml230b_test_PS1.eml.xml"),
            EML230B_TEST_PS1_HASH,
        ),
        (
            "PS2",
            include_str!("../../src/eml/tests/eml110a_test_PS2.eml.xml"),
            EML110A_TEST_PS2_HASH,
            include_str!("../../src/eml/tests/eml230b_test_PS2.eml.xml"),
            EML230B_TEST_PS2_HASH,
        ),
        (
            "TK",
            include_str!("../../src/eml/tests/eml110a_test_TK.eml.xml"),
            EML110A_TEST_TK_HASH,
            include_str!("../../src/eml/tests/eml230b_test_TK.eml.xml"),
            EML230B_TEST_TK_HASH,
        ),
    ];
    for (name, election_data, election_hash, candidate_data, candidate_hash) in cases {
        let response = post_election_import(
            &addr,
            &admin_cookie,
            serde_json::json!({
                "committee_category": "CSB",
                "election_hash": election_hash,
                "election_data": election_data,
                "candidate_hash": candidate_hash,
                "candidate_data": candidate_data,
            }),
        )
        .await;
        assert_eq!(response.status(), StatusCode::BAD_REQUEST, "{name}");
        let body: serde_json::Value = response.json().await.unwrap();
        assert_eq!(body["reference"], "EmlImportError", "{name}");
    }
}

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("users"))))]
async fn test_gsb_election_import_save(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let admin_cookie = login(&addr, Admin).await;

    // When importing polling stations, the committee session status changes to "in_preparation"
    for (with_polling_stations, status) in [(true, "in_preparation"), (false, "created")] {
        let case = format!("with polling stations: {with_polling_stations}");
        let mut body = serde_json::json!({
            "committee_category": "GSB",
            "election_hash": EML110A_TEST_HASH,
            "election_data": include_str!("../../src/eml/tests/eml110a_test.eml.xml"),
            "candidate_hash": EML230B_TEST_HASH,
            "candidate_data": include_str!("../../src/eml/tests/eml230b_test.eml.xml"),
            "number_of_voters": 1234,
            "counting_method": "CSO",
        });
        if with_polling_stations {
            body["polling_station_data"] =
                include_str!("../../src/eml/tests/eml110b_test.eml.xml").into();
            body["polling_station_file_name"] = "eml110b_test.eml.xml".into();
        }
        let response = post_election_import(&addr, &admin_cookie, body).await;

        assert_eq!(response.status(), StatusCode::CREATED, "{case}");
        let body: serde_json::Value = response.json().await.unwrap();
        let election_id = u32::try_from(body["id"].as_u64().unwrap()).unwrap();
        let election_details = get_election_details(&addr, &admin_cookie, election_id).await;
        assert_eq!(
            election_details["election"]["counting_method"], "CSO",
            "{case}"
        );
        assert_eq!(
            election_details["election"]["number_of_voters"], 1234,
            "{case}"
        );
        assert_eq!(
            election_details["current_committee_session"]["status"], status,
            "{case}"
        );
    }
}

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("users"))))]
async fn test_csb_election_import_save(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let admin_cookie = login(&addr, Admin).await;

    #[rustfmt::skip]
    let cases = [
        // GR CSB : 1 sub committee
        ("municipal", include_str!("../../src/eml/tests/eml110a_test.eml.xml"), EML110A_TEST_HASH, include_str!("../../src/eml/tests/eml230b_test.eml.xml"), EML230B_TEST_HASH, 1, ("0000", "Test", 0)),
        // WS CSB: one sub committee per GSB
        ("water authority", include_str!("../../src/eml/tests/eml110a_test_AB.eml.xml"), EML110A_TEST_AB_HASH, include_str!("../../src/eml/tests/eml230b_test_AB.eml.xml"), EML230B_TEST_AB_HASH, 4, ("0123", "Heemdamseburg", 123)),
    ];
    for (
        name,
        election_data,
        election_hash,
        candidate_data,
        candidate_hash,
        sub_committee_count,
        (authority_id, sub_committee_name, number),
    ) in cases
    {
        let response = post_election_import(
            &addr,
            &admin_cookie,
            serde_json::json!({
                "committee_category": "CSB",
                "election_hash": election_hash,
                "election_data": election_data,
                "candidate_hash": candidate_hash,
                "candidate_data": candidate_data,
            }),
        )
        .await;

        assert_eq!(response.status(), StatusCode::CREATED, "{name}");
        let body: serde_json::Value = response.json().await.unwrap();
        assert_eq!(body["committee_category"], "CSB", "{name}");
        assert!(body["counting_method"].is_null(), "{name}");

        let election_id = u32::try_from(body["id"].as_u64().unwrap()).unwrap();
        let election_details = get_election_details(&addr, &admin_cookie, election_id).await;
        assert_eq!(
            election_details["election"]["committee_category"], "CSB",
            "{name}"
        );
        assert!(
            election_details["election"]["counting_method"].is_null(),
            "{name}"
        );
        assert_eq!(
            election_details["election"]["number_of_voters"], 1,
            "{name}"
        );
        assert_eq!(
            election_details["current_committee_session"]["status"], "in_preparation",
            "{name}"
        );

        let statuses = get_statuses(&addr, &admin_cookie, election_id).await;
        assert_eq!(statuses.len(), sub_committee_count, "{name}");
        let sub_committee = &statuses.values().next().unwrap()["source"];
        assert_eq!(sub_committee["authority_id"], authority_id, "{name}");
        assert_eq!(
            sub_committee["authority_name"], sub_committee_name,
            "{name}"
        );
        assert_eq!(sub_committee["name"], sub_committee_name, "{name}");
        assert_eq!(sub_committee["number"], number, "{name}");
        assert_eq!(sub_committee["type"], "SubCommittee", "{name}");
    }
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
                "election_hash": EML110A_TEST_HASH,
                "election_data": include_str!("../../src/eml/tests/eml110a_test.eml.xml"),
                "candidate_hash": EML230B_TEST_HASH,
                "candidate_data": include_str!("../../src/eml/tests/eml230b_test.eml.xml"),
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
        ("election definition sent as polling stations", include_str!("../../src/eml/tests/eml110a_test.eml.xml"), Some("eml110a_test.eml.xml")),
    ];

    for endpoint in ["validate", "import"] {
        for (name, polling_station_data, file_name) in cases {
            let case = format!("{endpoint}: {name}");
            let mut body = serde_json::json!({
                "committee_category": "GSB",
                "election_hash": EML110A_TEST_HASH,
                "election_data": include_str!("../../src/eml/tests/eml110a_test.eml.xml"),
                "candidate_hash": EML230B_TEST_HASH,
                "candidate_data": include_str!("../../src/eml/tests/eml230b_test.eml.xml"),
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
