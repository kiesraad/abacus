#![cfg(test)]

use axum::serve;
use sqlx::SqlitePool;
use std::net::SocketAddr;
use tokio::{net::TcpListener, spawn};

use abacus::router;

pub async fn serve_api(pool: SqlitePool) -> SocketAddr {
    let app = router(pool).unwrap();
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    spawn(async move {
        serve(listener, app).await.unwrap();
    });
    addr
}
