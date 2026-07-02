use std::{future::Future, net::SocketAddr, str::FromStr};

use api::middleware::airgap::AirgapDetection;
use axum::{extract::FromRef, serve::ListenerExt};
use serde::Serialize;
use sqlx::{
    Sqlite, SqliteConnection, SqlitePool,
    sqlite::{SqliteConnectOptions, SqliteJournalMode},
};
use tokio::{net::TcpListener, signal};
use tracing::{info, trace, warn};

pub mod api;
pub mod app_error;
pub mod domain;
pub mod eml;
mod error;
pub mod infra;
pub mod repository;
pub mod service;
#[cfg(feature = "dev-database")]
pub mod test_data_gen;
#[cfg(test)]
pub(crate) mod test_support;

pub use app_error::AppError;
pub use error::{APIError, ErrorResponse};
#[cfg(feature = "dev-database")]
use infra::seed_data;
use infra::{audit_log, backup::BackupConfig, router};

use crate::{
    app_error::{DatabaseErrorWithPath, DatabaseMigrationErrorWithPath},
    infra::audit_log::{AsAuditEvent, AuditEventLevel, AuditEventType},
};

/// Maximum size of the request body in megabytes.
pub const MAX_BODY_SIZE_MB: usize = 12;

/// Extension trait for SqlitePool to add begin_immediate functionality
pub trait SqlitePoolExt {
    /// Acquire a connection and start a transaction with "BEGIN IMMEDIATE",
    /// which is needed to prevent database is busy errors.
    /// See <https://sqlite.org/isolation.html> for details.
    fn begin_immediate(
        &self,
    ) -> impl Future<Output = Result<sqlx::Transaction<'_, Sqlite>, sqlx::Error>> + Send;
}

impl SqlitePoolExt for SqlitePool {
    async fn begin_immediate(&self) -> Result<sqlx::Transaction<'_, Sqlite>, sqlx::Error> {
        self.begin_with("BEGIN IMMEDIATE").await
    }
}

#[derive(FromRef, Clone)]
pub struct AppState {
    pool: SqlitePool,
    airgap_detection: AirgapDetection,
    backup_config: BackupConfig,
}

/// Start airgap detection if enabled, logging which path was taken.
fn setup_airgap_detection(pool: &SqlitePool, enable: bool) -> AirgapDetection {
    if enable {
        info!("Airgap detection is enabled, starting airgap detection task...");
        AirgapDetection::start(pool.clone())
    } else {
        warn!("Airgap detection is disabled, this is not allowed in production.");
        AirgapDetection::nop()
    }
}

/// Log startup, start airgap detection, and build the router shared by the
/// HTTP and HTTPS servers.
fn build_app(
    pool: &SqlitePool,
    enable_airgap_detection: bool,
    backup_config: BackupConfig,
) -> Result<axum::Router, AppError> {
    info!("Starting Abacus (version {})", env!("ABACUS_GIT_VERSION"));
    let airgap_detection = setup_airgap_detection(pool, enable_airgap_detection);
    router::create_router(pool.clone(), airgap_detection, backup_config)
}

/// Close the database pool (flushing SQLite WAL/shm) and log a clean shutdown.
async fn close_and_log(pool: SqlitePool) {
    pool.close().await;
    info!("Abacus has shut down gracefully.");
}

/// Start the API server on the given port, using the given database pool.
pub async fn start_server(
    pool: SqlitePool,
    listener: TcpListener,
    enable_airgap_detection: bool,
    backup_config: BackupConfig,
) -> Result<(), AppError> {
    let app = build_app(&pool, enable_airgap_detection, backup_config)?;

    warn!("TLS is disabled, serving Abacus over plain HTTP. This is not allowed in production.");
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

    close_and_log(pool).await;

    Ok(())
}

/// Start the API server over HTTPS using axum-server/rustls.
#[cfg(feature = "tls")]
#[allow(clippy::cognitive_complexity)]
pub async fn start_server_tls(
    pool: SqlitePool,
    listener: TcpListener,
    enable_airgap_detection: bool,
    backup_config: BackupConfig,
    tls_config: std::sync::Arc<rustls::ServerConfig>,
    ca: std::sync::Arc<infra::tls::CaCertificate>,
) -> Result<(), AppError> {
    use std::time::Duration;

    use axum_server::{
        accept::NoDelayAcceptor,
        tls_rustls::{RustlsAcceptor, RustlsConfig},
    };

    let app = build_app(&pool, enable_airgap_detection, backup_config)?
        .merge(infra::router::ca_router(&ca));

    info!("Starting Abacus on https://{}", listener.local_addr()?);

    // Set up graceful shutdown from the existing signal handler
    let handle = axum_server::Handle::new();
    let shutdown_handle = handle.clone();
    tokio::spawn(async move {
        shutdown_signal().await;
        shutdown_handle.graceful_shutdown(Some(Duration::from_secs(10)));
    });

    // Serve Abacus using the axum-server/rustls acceptor
    let acceptor =
        RustlsAcceptor::new(RustlsConfig::from_config(tls_config)).acceptor(NoDelayAcceptor::new());
    let std_listener = listener.into_std()?;
    axum_server::from_tcp(std_listener)?
        .acceptor(acceptor)
        .handle(handle)
        .serve(app.into_make_service_with_connect_info::<SocketAddr>())
        .await?;

    close_and_log(pool).await;

    Ok(())
}

/// Graceful shutdown signal handler.
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

#[derive(Serialize)]
pub struct ApplicationStartedAuditData {
    pub version: String,
    pub commit: String,
}

impl AsAuditEvent for ApplicationStartedAuditData {
    const EVENT_TYPE: AuditEventType = AuditEventType::ApplicationStarted;
    const EVENT_LEVEL: AuditEventLevel = AuditEventLevel::Info;
}

/// Log that the application started and thereby check that the database is writeable
/// This maps common sqlite errors to an AppError
async fn log_app_started(conn: &mut SqliteConnection, db_path: &str) -> Result<(), AppError> {
    Ok(audit_log::create(
        conn,
        ApplicationStartedAuditData {
            version: env!("ABACUS_GIT_VERSION").to_string(),
            commit: env!("ABACUS_GIT_REV").to_string(),
        }
        .as_audit_event()?,
        None,
        None,
        None,
    )
    .await
    .map_err(DatabaseErrorWithPath::with_path(db_path))?)
}

/// Create a SQLite database if needed, then connect to it and run migrations.
/// Return a connection pool.
pub async fn create_sqlite_pool(
    database: &str,
    #[cfg(feature = "dev-database")] reset_database: bool,
    #[cfg(feature = "dev-database")] seed_data: bool,
) -> Result<SqlitePool, AppError> {
    let db = format!("sqlite://{database}");
    let opts = SqliteConnectOptions::from_str(&db)?
        .create_if_missing(true)
        .journal_mode(SqliteJournalMode::Wal)
        .busy_timeout(std::time::Duration::from_secs(20));

    #[cfg(feature = "dev-database")]
    if reset_database {
        // remove the file, ignoring any errors that occurred (such as the file not existing)
        let _ = tokio::fs::remove_file(opts.get_filename()).await;
        info!("removed database file");
    }

    let pool = SqlitePool::connect_with(opts).await?;

    // run database migrations, this creates the necessary tables if they don't exist yet
    sqlx::migrate!()
        .run(&pool)
        .await
        .map_err(DatabaseMigrationErrorWithPath::with_path(database))?;

    #[cfg(feature = "dev-database")]
    if seed_data {
        seed_data::seed_fixture_data(&pool).await?;
    }

    // log startup event and verify the database is writeable
    let mut connection = pool.acquire().await?;
    log_app_started(&mut connection, database).await?;

    Ok(pool)
}

#[cfg(test)]
mod test {
    use sqlx::SqlitePool;
    use test_log::test;
    use tokio::net::TcpListener;

    use super::start_server;
    use crate::{AppError, create_sqlite_pool, infra::backup::BackupConfig};

    pub(crate) async fn run_server_test<F, Fut>(pool: SqlitePool, test_fn: F)
    where
        F: FnOnce(String) -> Fut,
        Fut: Future<Output = ()>,
    {
        // Setup: create server on random port
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        let base_url = format!("http://{addr}");

        // Start server in background task
        let backup_dir = tempfile::tempdir().unwrap();
        let backup_config = BackupConfig::new(backup_dir.path().to_path_buf());
        let server_task = tokio::spawn(async move {
            start_server(pool, listener, false, backup_config)
                .await
                .unwrap();
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

    #[test(tokio::test)]
    async fn test_readonly_database_error() {
        // Create a read-only in-memory database
        let db_url = "sqlite::memory:?mode=ro";
        let result = create_sqlite_pool(
            db_url,
            #[cfg(feature = "dev-database")]
            false,
            #[cfg(feature = "dev-database")]
            false,
        )
        .await;

        assert!(matches!(result, Err(AppError::DatabaseReadOnly(_))));
    }

    /// TLS tests
    #[cfg(feature = "tls")]
    mod tls {
        use std::net::{IpAddr, Ipv4Addr, Ipv6Addr, SocketAddr};

        use reqwest::StatusCode;
        use sqlx::SqlitePool;
        use test_log::test;
        use tokio::{net::TcpListener, task::JoinHandle};

        use crate::{
            infra::audit_log, infra::backup::BackupConfig, infra::tls::load_or_generate,
            start_server_tls,
        };

        /// Helper to start an HTTPS server on `bind_addr` with a new CA+leaf certificate
        async fn spawn_https_server(
            pool: SqlitePool,
            bind_addr: &str,
        ) -> (SocketAddr, String, JoinHandle<()>) {
            let dir = tempfile::tempdir().unwrap();
            let certificates = load_or_generate(&dir.path().join("tls")).unwrap();
            let ca_pem = certificates.ca.pem.clone();
            let server_config = certificates.server_config().unwrap();
            let ca = std::sync::Arc::new(certificates.ca);
            let backup_config = BackupConfig::new(dir.path().join("backups"));

            let listener = TcpListener::bind(bind_addr).await.unwrap();
            let addr = listener.local_addr().unwrap();
            let task = tokio::spawn(async move {
                start_server_tls(pool, listener, false, backup_config, server_config, ca)
                    .await
                    .unwrap();
            });
            (addr, ca_pem, task)
        }

        /// A reqwest client that trusts only the given CA (no system roots).
        fn client_trusting(ca_pem: &str) -> reqwest::Client {
            let ca = reqwest::Certificate::from_pem(ca_pem.as_bytes()).unwrap();
            reqwest::Client::builder()
                .tls_certs_only([ca])
                .build()
                .unwrap()
        }

        /// Assert that an HTTPS server is reachable and a login succeeds
        async fn assert_login_works(pool: SqlitePool, bind_addr: &str, expected_ip: IpAddr) {
            let (addr, ca_pem, task) = spawn_https_server(pool.clone(), bind_addr).await;
            let base = format!("https://{addr}");
            let client = client_trusting(&ca_pem);

            // account endpoint can be loaded without TLS error
            let account = client
                .get(format!("{base}/api/account"))
                .send()
                .await
                .unwrap();
            assert_eq!(
                account.status(),
                StatusCode::UNAUTHORIZED,
                "leaf must chain to the trusted CA"
            );

            // A valid login over HTTPS succeeds
            let login = client
                .post(format!("{base}/api/login"))
                .json(&serde_json::json!({"username": "admin1", "password": "Admin1Password01"}))
                .send()
                .await
                .unwrap();
            assert_eq!(
                login.status(),
                StatusCode::OK,
                "login over HTTPS should succeed"
            );

            // Login audit event records correct client IP
            let mut conn = pool.acquire().await.unwrap();
            let events = audit_log::list_all(&mut conn).await.unwrap();
            let last = events.last().expect("there should be an audit event");
            assert_eq!(
                last.ip(),
                Some(expected_ip),
                "the real client IP should reach the audit log"
            );
            assert_eq!(last.username(), Some("admin1"));

            task.abort();
            let _ = task.await;
        }

        #[test(sqlx::test(fixtures("../fixtures/users.sql")))]
        async fn test_login_ipv4(pool: SqlitePool) {
            assert_login_works(pool, "127.0.0.1:0", IpAddr::V4(Ipv4Addr::LOCALHOST)).await;
        }

        #[test(sqlx::test(fixtures("../fixtures/users.sql")))]
        async fn test_login_ipv6(pool: SqlitePool) {
            assert_login_works(pool, "[::1]:0", IpAddr::V6(Ipv6Addr::LOCALHOST)).await;
        }

        /// A client that has not imported the local CA must fail the TLS handshake.
        #[test(sqlx::test(fixtures("../fixtures/users.sql")))]
        async fn test_https_client_fails_without_ca(pool: SqlitePool) {
            let (addr, _ca_pem, task) = spawn_https_server(pool, "127.0.0.1:0").await;

            // Default client does not trust our local test CA
            let client = reqwest::Client::new();
            let err = client
                .get(format!("https://{addr}/api/account"))
                .send()
                .await
                .expect_err("a client that does not trust the local CA must fail the handshake");

            // Connection should fail during the TLS handshake
            assert!(
                err.is_connect(),
                "expected a connect-phase error, got: {err:?}"
            );
            assert!(
                format!("{err:?}").contains("UnknownIssuer"),
                "expected an untrusted-issuer certificate error, got: {err:?}"
            );

            task.abort();
            let _ = task.await;
        }

        /// The CA certificate is downloadable over HTTPS as well as over the
        /// plaintext HTTP redirect server.
        #[test(sqlx::test)]
        async fn test_ca_download_over_https(pool: SqlitePool) {
            let (addr, ca_pem, task) = spawn_https_server(pool, "127.0.0.1:0").await;
            let client = client_trusting(&ca_pem);

            let response = client
                .get(format!("https://{addr}/ca.pem"))
                .send()
                .await
                .unwrap();
            assert_eq!(response.status(), StatusCode::OK);
            assert_eq!(
                response.headers()[reqwest::header::X_CONTENT_TYPE_OPTIONS],
                "nosniff",
                "the CA download carries the app's security headers"
            );
            assert_eq!(
                response.text().await.unwrap(),
                ca_pem,
                "the served CA matches the trusted CA"
            );

            task.abort();
            let _ = task.await;
        }
    }
}
