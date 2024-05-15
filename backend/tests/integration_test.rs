use std::net::SocketAddr;

use reqwest::StatusCode;
use serde_json::json;
use sqlx::SqlitePool;
use tokio::net::TcpListener;

use backend::polling_station::DataEntryResponse;
use backend::router;

async fn serve_api(pool: SqlitePool) -> SocketAddr {
    let app = router(pool).unwrap();
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });
    addr
}

#[sqlx::test]
async fn test_polling_station_data_entry_valid(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let request_body = backend::polling_station::DataEntryRequest {
        data: backend::polling_station::PollingStationResults {
            voters_counts: backend::polling_station::VotersCounts {
                poll_card_count: 1,
                proxy_certificate_count: 2,
                voter_card_count: 3,
                total_admitted_voters_count: 4,
            },
            votes_counts: backend::polling_station::VotesCounts {
                votes_candidates_counts: 5,
                blank_votes_count: 6,
                invalid_votes_count: 7,
                total_votes_cast_count: 8,
            },
        },
    };

    let url = format!("http://{addr}/api/polling_stations/1/data_entries/1");
    let response = reqwest::Client::new()
        .post(&url)
        .json(&request_body)
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    let status = response.status();
    println!("response body: {:?}", &response.text().await.unwrap());
    assert_eq!(status, StatusCode::OK);
}

#[sqlx::test]
async fn test_polling_station_data_entry_invalid(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/polling_stations/1/data_entries/1");
    let response = reqwest::Client::new()
        .post(&url)
        .header("content-type", "application/json")
        .body(r##"{"data":null}"##)
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    let status = response.status();
    let body: DataEntryResponse = response.json().await.unwrap();
    println!("response body: {:?}", &body);
    assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);
    assert_eq!(
        body.message,
        "Failed to deserialize the JSON body into the target type: data: \
         invalid type: null, expected struct PollingStationResults at line 1 column 12"
    );
}

#[sqlx::test]
async fn test_polling_station_data_entry_validation(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let request_body = json!({
        "data": {
            "voters_counts": {
                "poll_card_count": 1,
                "proxy_certificate_count": 2,
                "voter_card_count": 3,
                "total_admitted_voters_count": 4
            },
            "votes_counts": {
                "votes_candidates_counts": 5,
                "blank_votes_count": 6,
                "invalid_votes_count": 7,
                "total_votes_cast_count": 8
            }
        }
    });

    let url = format!("http://{addr}/api/polling_stations/1/data_entries/1");
    let response = reqwest::Client::new()
        .post(&url)
        .json(&request_body)
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    let status = response.status();
    let body: DataEntryResponse = response.json().await.unwrap();
    println!("response body: {:?}", &body);
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body.validation_results.errors.len(), 2);
    assert_eq!(body.validation_results.warnings.len(), 0);
}
