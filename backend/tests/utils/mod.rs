#![cfg(test)]

use std::net::SocketAddr;

use abacus::{infra::router, shutdown_signal};
use sqlx::SqlitePool;
use tokio::net::TcpListener;

pub async fn serve_api(pool: SqlitePool) -> SocketAddr {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();

    tokio::spawn(async move {
        let app = router::create_router_without_airgap_detection(pool).unwrap();

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
