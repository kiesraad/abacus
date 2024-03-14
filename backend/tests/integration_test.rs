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
