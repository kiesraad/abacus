use std::net::SocketAddr;

use axum::{extract::FromRef, serve::ListenerExt};
use sqlx::SqlitePool;
use tokio::{net::TcpListener, signal};
use tracing::{info, trace, warn};

use crate::{
    AppError,
    infra::{airgap::AirgapDetection, router},
};

#[derive(FromRef, Clone)]
pub struct AppState {
    pool: SqlitePool,
    airgap_detection: AirgapDetection,
}

impl AppState {
    pub fn new(pool: SqlitePool, airgap_detection: AirgapDetection) -> Self {
        Self {
            pool,
            airgap_detection,
        }
    }
}

/// Start the API server on the given port, using the given database pool.
#[allow(clippy::cognitive_complexity)]
pub async fn start_server(
    pool: SqlitePool,
    listener: TcpListener,
    enable_airgap_detection: bool,
) -> Result<(), AppError> {
    info!("Starting Abacus (version {})", env!("ABACUS_GIT_VERSION"));
    let airgap_detection = if enable_airgap_detection {
        info!("Airgap detection is enabled, starting airgap detection task...");

        AirgapDetection::start(pool.clone()).await
    } else {
        warn!("Airgap detection is disabled, this is not allowed in production.");

        AirgapDetection::nop()
    };

    let app = router::create_router(pool.clone(), airgap_detection)?;

    info!("Starting Abacus on http://{}", listener.local_addr()?);
    let listener = listener.tap_io(|tcp_stream| {
        if let Err(err) = tcp_stream.set_nodelay(true) {
            trace!("failed to set TCP_NODELAY on incoming connection: {err:#}");
        }
    });

    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .with_graceful_shutdown(shutdown_signal())
    .await?;

    // close the database, this will flush the shm and wal files for sqlite
    pool.close().await;

    info!("Abacus has shut down gracefully.");

    Ok(())
}

/// Graceful shutdown, useful for Docker containers.
///
/// Copied from the
/// [axum graceful-shutdown example](https://github.com/tokio-rs/axum/blob/6318b57fda6b524b4d3c7909e07946e2b246ebd2/examples/graceful-shutdown/src/main.rs)
/// (under the MIT license).
pub async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("failed to install terminate signal handler")
            .recv()
            .await;
    };

    #[cfg(unix)]
    let quit = async {
        signal::unix::signal(signal::unix::SignalKind::quit())
            .expect("failed to install quit signal handler")
            .recv()
            .await;
    };

    #[cfg(windows)]
    let terminate = async {
        signal::windows::ctrl_close()
            .expect("failed to install CTRL_CLOSE handler")
            .recv()
            .await
    };

    #[cfg(windows)]
    let quit = async {
        signal::windows::ctrl_shutdown()
            .expect("failed to install CTRL_SHUTDOWN handler")
            .recv()
            .await
    };

    #[cfg(not(any(unix, windows)))]
    let terminate = std::future::pending::<()>();

    #[cfg(not(any(unix, windows)))]
    let quit = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
        _ = quit => {},
    }
}

#[cfg(test)]
mod tests {
    use test_log::test;

    use super::*;

    async fn run_server_test<F, Fut>(pool: SqlitePool, test_fn: F)
    where
        F: FnOnce(String) -> Fut,
        Fut: Future<Output = ()>,
    {
        // Setup: create server on random port
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        let base_url = format!("http://{addr}");

        // Start server in background task
        let server_task = tokio::spawn(async move {
            start_server(pool, listener, false).await.unwrap();
        });

        // Run the test
        test_fn(base_url).await;

        // Cleanup
        server_task.abort();
        let _ = server_task.await;
    }

    /// Test that Abacus server starts and the account endpoint returns 401 Unauthorized
    #[test(sqlx::test)]
    async fn test_abacus_starts(pool: SqlitePool) {
        run_server_test(pool, |base_url| async move {
            let result = reqwest::get(format!("{base_url}/api/account"))
                .await
                .unwrap();

            assert_eq!(result.status(), 401);
        })
        .await;
    }

    /// Check all security headers are present with expected values
    #[test(sqlx::test)]
    async fn test_security_headers(pool: SqlitePool) {
        run_server_test(pool, |base_url| async move {
            let response = reqwest::get(format!("{base_url}/api/account"))
                .await
                .unwrap();

            assert_eq!(response.headers()["x-frame-options"], "deny");
            assert_eq!(response.headers()["x-content-type-options"], "nosniff");
            assert_eq!(
                response.headers()["x-permitted-cross-domain-policies"],
                "none"
            );
            assert_eq!(
                response.headers()["cross-origin-resource-policy"],
                "same-origin"
            );
            assert_eq!(
                response.headers()["cross-origin-embedder-policy"],
                "require-corp"
            );
            assert_eq!(
                response.headers()["cross-origin-opener-policy"],
                "same-origin"
            );

            #[cfg(feature = "memory-serve")]
            {
                let response = reqwest::get(format!("{base_url}/")).await.unwrap();
                assert_eq!(response.headers()["referrer-policy"], "no-referrer");
                assert_eq!(
                    response.headers()["permissions-policy"],
                    "accelerometer=(), autoplay=(), camera=(), cross-origin-isolated=(), \
                        display-capture=(), encrypted-media=(), fullscreen=(), geolocation=(), \
                        gyroscope=(), keyboard-map=(), magnetometer=(), microphone=(), midi=(), \
                        payment=(), picture-in-picture=(), publickey-credentials-get=(), \
                        screen-wake-lock=(), sync-xhr=(self), usb=(), web-share=(), \
                        xr-spatial-tracking=(), clipboard-read=(), clipboard-write=(), gamepad=(), \
                        hid=(), idle-detection=(), interest-cohort=(), serial=(), unload=()"
                );
                assert_eq!(
                    response.headers()["content-security-policy"],
                    "default-src 'self'; img-src 'self' data:"
                );
            }

            #[cfg(feature = "storybook")]
            {
                // Test that /storybook path doesn't have CSP header
                let storybook_response = reqwest::get(format!("{base_url}/storybook/"))
                    .await
                    .unwrap();
                assert!(
                    !storybook_response
                        .headers()
                        .contains_key("content-security-policy")
                );
            }
        })
        .await;
    }

    /// Check that the Cache-Control header is present with expected value
    #[test(sqlx::test)]
    async fn test_cache_headers(pool: SqlitePool) {
        run_server_test(pool, |base_url| async move {
            let response = reqwest::get(format!("{base_url}/api/account"))
                .await
                .unwrap();
            assert_eq!(response.headers()["cache-control"], "no-store");

            #[cfg(feature = "memory-serve")]
            {
                let response = reqwest::get(format!("{base_url}/")).await.unwrap();
                assert_eq!(response.headers()["cache-control"], "max-age:300, private");
            }
        })
        .await;
    }

    /// Check that unknown API routes return 404
    /// Note that this test is mostly designed for using with the memory-serve feature enabled.
    #[test(sqlx::test)]
    async fn test_api_fallback_route(pool: SqlitePool) {
        run_server_test(pool, |base_url| async move {
            // Test non-existent API endpoints
            let response = reqwest::get(format!("{base_url}/api")).await.unwrap();
            assert_eq!(response.status(), 404);

            let response = reqwest::get(format!("{base_url}/api/")).await.unwrap();
            assert_eq!(response.status(), 404);

            let response = reqwest::get(format!("{base_url}/api/nonexistent"))
                .await
                .unwrap();
            assert_eq!(response.status(), 404);

            let response = reqwest::get(format!("{base_url}/api/some/nested/path"))
                .await
                .unwrap();
            assert_eq!(response.status(), 404);

            // Test that valid API endpoints still work
            let response = reqwest::get(format!("{base_url}/api/account"))
                .await
                .unwrap();
            // Should return 401 (Unauthorized) since we're not logged in
            assert_eq!(response.status(), 401);
        })
        .await;
    }
}
