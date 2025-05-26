use std::{error::Error, net::SocketAddr};

use airgap::AirgapDetection;
#[cfg(feature = "memory-serve")]
use axum::http::StatusCode;
use axum::{
    Router,
    extract::{DefaultBodyLimit, FromRef},
    middleware,
    serve::ListenerExt,
};
use hyper::http::{HeaderName, HeaderValue, header};
use sqlx::SqlitePool;
use tokio::{net::TcpListener, signal};
use tower_http::{
    set_header::SetResponseHeaderLayer,
    trace::{self, TraceLayer},
};
use tracing::{Level, info, trace};
use utoipa::OpenApi;
use utoipa_axum::router::OpenApiRouter;
#[cfg(feature = "openapi")]
use utoipa_swagger_ui::SwaggerUi;

pub mod airgap;
pub mod apportionment;
pub mod audit_log;
pub mod authentication;
pub mod data_entry;
pub mod election;
pub mod eml;
mod error;
#[cfg(feature = "dev-database")]
pub mod fixtures;
pub mod pdf_gen;
pub mod polling_station;
pub mod report;
pub mod summary;

pub use error::{APIError, ErrorResponse};

/// Maximum size of the request body in megabytes.
pub const MAX_BODY_SIZE_MB: usize = 12;

#[derive(FromRef, Clone)]
pub struct AppState {
    pool: SqlitePool,
    airgap_detection: AirgapDetection,
}

pub fn openapi_router() -> OpenApiRouter<AppState> {
    #[derive(utoipa::OpenApi)]
    struct ApiDoc;

    OpenApiRouter::with_openapi(ApiDoc::openapi())
        .merge(apportionment::router())
        .merge(audit_log::router())
        .merge(authentication::router())
        .merge(data_entry::router())
        .merge(election::router())
        .merge(polling_station::router())
        .merge(report::router())
}

/// Axum router for the application
pub fn router(
    pool: SqlitePool,
    airgap_detection: AirgapDetection,
) -> Result<Router, Box<dyn Error>> {
    let state = AppState {
        pool,
        airgap_detection,
    };

    // Serve the OpenAPI documentation at /api-docs (if the openapi feature is enabled)
    #[cfg(feature = "openapi")]
    let router = {
        let (router, openapi) = openapi_router().split_for_parts();
        router.merge(SwaggerUi::new("/api-docs").url("/api-docs/openapi.json", openapi))
    };

    // Discard the OpenAPI documentation if the openapi feature is disabled
    #[cfg(not(feature = "openapi"))]
    let router = Router::from(openapi_router());

    // Add middleware to trace all HTTP requests and extend the user's session lifetime if needed
    // Caution: make sure "inject_user" is added after "extend_session"
    let router = router
        .layer(middleware::map_response(error::map_error_response))
        .layer(DefaultBodyLimit::max(1024 * 1024 * MAX_BODY_SIZE_MB))
        .layer(
            TraceLayer::new_for_http()
                .make_span_with(trace::DefaultMakeSpan::new().level(Level::INFO))
                .on_response(trace::DefaultOnResponse::new().level(Level::INFO)),
        )
        .layer(middleware::map_response_with_state(
            state.clone(),
            audit_log::log_error,
        ))
        .layer(middleware::map_response_with_state(
            state.clone(),
            authentication::extend_session,
        ))
        .layer(middleware::map_request_with_state(
            state.clone(),
            authentication::inject_user,
        ));

    // Set Cache-Control header to prevent caching of API responses
    let router = router.layer(SetResponseHeaderLayer::overriding(
        header::CACHE_CONTROL,
        HeaderValue::from_static("no-store"),
    ));

    // Add the memory-serve router to serve the frontend (if the memory-serve feature is enabled)
    // Note that memory-serve includes its own Cache-Control header.
    #[cfg(feature = "memory-serve")]
    let router = router.merge(
        memory_serve::from_local_build!()
            .index_file(Some("/index.html"))
            .fallback(Some("/index.html"))
            .fallback_status(StatusCode::OK)
            .into_router()
            // Add Referrer-Policy and Permissions-Policy headers,
            // these are only needed on HTML documents (not API requests)
            .layer(SetResponseHeaderLayer::overriding(
                header::REFERRER_POLICY,
                HeaderValue::from_static("no-referrer"),
            ))
            .layer(SetResponseHeaderLayer::overriding(
                HeaderName::from_static("permissions-policy"),
                HeaderValue::from_static(
                    "accelerometer=(), autoplay=(), camera=(), cross-origin-isolated=(), \
                     display-capture=(), encrypted-media=(), fullscreen=(), geolocation=(), \
                     gyroscope=(), keyboard-map=(), magnetometer=(), microphone=(), midi=(), \
                     payment=(), picture-in-picture=(), publickey-credentials-get=(), \
                     screen-wake-lock=(), sync-xhr=(self), usb=(), web-share=(), \
                     xr-spatial-tracking=(), clipboard-read=(), clipboard-write=(), gamepad=(), \
                     hid=(), idle-detection=(), interest-cohort=(), serial=(), unload=()",
                ),
            )),
    );

    // Add headers for security hardening
    // Best practices according to the OWASP Secure Headers Project, https://owasp.org/www-project-secure-headers/
    let security_headers_service = tower::ServiceBuilder::new()
        .layer(SetResponseHeaderLayer::overriding(
            header::X_FRAME_OPTIONS,
            HeaderValue::from_static("deny"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            header::X_CONTENT_TYPE_OPTIONS,
            HeaderValue::from_static("nosniff"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            header::CONTENT_SECURITY_POLICY,
            HeaderValue::from_static("default-src 'self'; img-src 'self' data:"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            HeaderName::from_static("x-permitted-cross-domain-policies"),
            HeaderValue::from_static("none"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            HeaderName::from_static("cross-origin-resource-policy"),
            HeaderValue::from_static("same-origin"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            HeaderName::from_static("cross-origin-embedder-policy"),
            HeaderValue::from_static("require-corp"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            HeaderName::from_static("cross-origin-opener-policy"),
            HeaderValue::from_static("same-origin"),
        ));
    let router = router.layer(security_headers_service);

    // Add the state to the app
    let router = router.with_state(state);

    Ok(router)
}

/// Start the API server on the given port, using the given database pool.
pub async fn start_server(pool: SqlitePool, listener: TcpListener) -> Result<(), Box<dyn Error>> {
    let airgap_detection = AirgapDetection::start().await;
    let app = router(pool, airgap_detection)?;

    info!("Starting API server on http://{}", listener.local_addr()?);
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

    Ok(())
}

/// Graceful shutdown, useful for Docker containers.
///
/// Copied from the
/// [axum graceful-shutdown example](https://github.com/tokio-rs/axum/blob/6318b57fda6b524b4d3c7909e07946e2b246ebd2/examples/graceful-shutdown/src/main.rs)
/// (under the MIT license).
async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }
}

#[cfg(test)]
mod test {
    use sqlx::SqlitePool;
    use test_log::test;
    use tokio::net::TcpListener;

    use super::start_server;

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
            start_server(pool, listener).await.unwrap();
        });

        // Run the test
        test_fn(base_url).await;

        // Cleanup
        server_task.abort();
        let _ = server_task.await;
    }

    /// Test that Abacus server starts and the whoami endpoint returns 401 Unauthorized
    #[test(sqlx::test)]
    async fn test_abacus_starts(pool: SqlitePool) {
        run_server_test(pool, |base_url| async move {
            let result = reqwest::get(format!("{base_url}/api/user/whoami"))
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
            let response = reqwest::get(format!("{base_url}/api/user/whoami"))
                .await
                .unwrap();

            assert_eq!(response.headers()["x-frame-options"], "deny");
            assert_eq!(response.headers()["x-content-type-options"], "nosniff");
            assert_eq!(
                response.headers()["content-security-policy"],
                "default-src 'self'; img-src 'self' data:"
            );
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
            }
        })
        .await;
    }

    /// Check that the Cache-Control header is present with expected value
    #[test(sqlx::test)]
    async fn test_cache_headers(pool: SqlitePool) {
        run_server_test(pool, |base_url| async move {
            let response = reqwest::get(format!("{base_url}/api/user/whoami"))
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
}
