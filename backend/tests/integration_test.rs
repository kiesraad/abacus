use std::net::SocketAddr;

use sqlx::SqlitePool;
use tokio::net::TcpListener;

use backend::{router, HelloWorld};

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
async fn test_hello_world(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    // Make a request to the server with reqwest
    let response = reqwest::get(format!("http://{addr}/hello_world"))
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), 200);
    let body = response.text().await.unwrap();
    assert_eq!(body, r#"{"message":"Hello World"}"#);

    // Alternatively: check response with JSON decoding
    let response = reqwest::get(format!("http://{addr}/hello_world"))
        .await
        .unwrap();
    let body: HelloWorld = response.json().await.unwrap();
    assert_eq!(
        body,
        HelloWorld {
            message: "Hello World".to_string()
        }
    );
}

#[sqlx::test]
async fn test_polling_station_data_entry(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let request_body = backend::polling_station::DataEntryRequest {
        entry_number: 1,
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
                total_cast_votes_count: 8,
            },
        },
    };

    let url = format!("http://{addr}/api/polling_stations/1/data_entry");
    let response = reqwest::Client::new()
        .post(&url)
        .json(&request_body)
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), 200);
}
