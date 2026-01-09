#![cfg(test)]

use std::net::SocketAddr;

use sqlx::SqlitePool;
use tokio::net::TcpListener;

use abacus::{router, shutdown_signal};

pub async fn serve_api(pool: SqlitePool) -> SocketAddr {
    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .expect("Failed to bind TCP listener for test server");
    let addr = listener.local_addr().unwrap();

    tokio::spawn(async move {
        let app = router::create_router_without_airgap_detection(pool)
            .expect("failed to create router for test server");

        axum::serve(
            listener,
            app.into_make_service_with_connect_info::<SocketAddr>(),
        )
        .with_graceful_shutdown(shutdown_signal())
        .await
        .expect("Failed to start test server in serve_api");
    });

    addr
}
