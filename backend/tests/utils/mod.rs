#![cfg(test)]

use std::net::SocketAddr;

use abacus::infra::{airgap::AirgapDetection, app::shutdown_signal, router};
use sqlx::SqlitePool;
use tokio::net::TcpListener;

async fn serve_api_inner(pool: SqlitePool, airgap_detection: AirgapDetection) -> SocketAddr {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();

    tokio::spawn(async move {
        let app = router::create_router(pool, airgap_detection).unwrap();

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
    let airgap_detection = AirgapDetection::start(pool.clone()).await;
    let mut violation_detected = false;

    for i in 0..=200 {
        if i == 200 {
            panic!("Airgap detection failed to detect violation after 10 seconds");
        }

        if airgap_detection.violation_detected() {
            violation_detected = true;
            break;
        }

        tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
    }

    assert!(violation_detected, "Airgap detection did not run");

    serve_api_inner(pool, airgap_detection).await
}
