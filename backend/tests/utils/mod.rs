#![cfg(test)]

use std::net::SocketAddr;

use sqlx::SqlitePool;
use tokio::net::TcpListener;

use abacus::start_server;

pub async fn serve_api(pool: SqlitePool) -> SocketAddr {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        start_server(pool, listener).await.unwrap();
    });
    addr
}
