#![cfg(test)]

use std::net::SocketAddr;

use sqlx::SqlitePool;
use tokio::net::TcpListener;

use abacus::{airgap::AirgapDetection, router, shutdown_signal};

async fn serve_api_inner(pool: SqlitePool, airgap_detection: AirgapDetection) -> SocketAddr {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();

    tokio::spawn(async move {
        let app = router(pool, airgap_detection).unwrap();

        axum::serve(
            listener,
            app.into_make_service_with_connect_info::<SocketAddr>(),
        )
        .with_graceful_shutdown(shutdown_signal())
        .await
        .unwrap();
    });

    addr
}

pub async fn serve_api(pool: SqlitePool) -> SocketAddr {
    let airgap_detection = AirgapDetection::nop();

    serve_api_inner(pool, airgap_detection).await
}

pub async fn serve_api_with_airgap_detection(pool: SqlitePool) -> SocketAddr {
    let airgap_detection = AirgapDetection::start().await;

    for i in 0..=100 {
        if i == 100 {
            panic!("Airgap detection failed to detect violation after 5 seconds");
        }

        if airgap_detection.violation_detected() {
            break;
        }

        tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
    }

    assert!(
        airgap_detection.get_last_check().is_some(),
        "Airgap detection did not run"
    );

    serve_api_inner(pool, airgap_detection).await
}
