#[cfg(feature = "memory-serve")]
use axum::http::StatusCode;
use axum::{Router, extract::FromRef, middleware, serve::ListenerExt};
#[cfg(feature = "memory-serve")]
use memory_serve::MemoryServe;
use sqlx::SqlitePool;
use std::{error::Error, net::SocketAddr};
use tokio::{net::TcpListener, signal};
use tower_http::trace::TraceLayer;
use tracing::{info, trace};
use utoipa::OpenApi;
use utoipa_axum::router::OpenApiRouter;
#[cfg(feature = "openapi")]
use utoipa_swagger_ui::SwaggerUi;

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

#[derive(FromRef, Clone)]
pub struct AppState {
    pool: SqlitePool,
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
pub fn router(pool: SqlitePool) -> Result<Router, Box<dyn Error>> {
    let state = AppState { pool };

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
    let router =
        router
            .layer(TraceLayer::new_for_http())
            .layer(middleware::map_response_with_state(
                state.clone(),
                authentication::extend_session,
            ));

    // Add the memory-serve router to serve the frontend (if the memory-serve feature is enabled)
    #[cfg(feature = "memory-serve")]
    let router = router.merge(
        MemoryServe::from_env()
            .index_file(Some("/index.html"))
            .fallback(Some("/index.html"))
            .fallback_status(StatusCode::OK)
            .into_router(),
    );

    // Add the state to the app
    let router = router.with_state(state);

    Ok(router)
}

/// Start the API server on the given port, using the given database pool.
pub async fn start_server(pool: SqlitePool, listener: TcpListener) -> Result<(), Box<dyn Error>> {
    let app = router(pool)?;

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

    #[test(sqlx::test)]
    async fn test_abacus_starts(pool: SqlitePool) {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();

        let task = tokio::spawn(async move {
            start_server(pool, listener).await.unwrap();
        });

        let result = reqwest::get(format!("http://{addr}/api/user/whoami"))
            .await
            .unwrap();

        assert_eq!(result.status(), 401);

        task.abort();
        let _ = task.await;
    }
}
