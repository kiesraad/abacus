#![cfg(test)]

use std::net::SocketAddr;

use abacus::{
    api::middleware::airgap::AirgapDetection,
    infra::{backup::BackupConfig, router},
    shutdown_signal,
};
use sqlx::SqlitePool;
use tempfile::TempDir;
use tokio::net::TcpListener;

pub async fn serve_api(pool: SqlitePool) -> SocketAddr {
    serve_api_with_backup_dir(pool).await.0
}

pub async fn serve_api_with_backup_dir(pool: SqlitePool) -> (SocketAddr, TempDir) {
    let backup_dir = tempfile::tempdir().unwrap();
    let backup_config = BackupConfig {
        directory: backup_dir.path().to_path_buf(),
    };
    let app = router::create_router(pool, AirgapDetection::nop(), backup_config)
        .unwrap()
        .into_make_service_with_connect_info::<SocketAddr>();
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();

    tokio::spawn(async move {
        axum::serve(listener, app)
            .with_graceful_shutdown(shutdown_signal())
            .await
            .unwrap();
    });

    (addr, backup_dir)
}
