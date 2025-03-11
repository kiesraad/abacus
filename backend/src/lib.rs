#[cfg(feature = "memory-serve")]
use axum::http::StatusCode;
use axum::{
    Router,
    extract::FromRef,
    middleware,
    routing::{get, post, put},
    serve::ListenerExt,
};
#[cfg(feature = "memory-serve")]
use memory_serve::MemoryServe;
use sqlx::SqlitePool;
use std::{error::Error, net::SocketAddr};
use tokio::{net::TcpListener, signal};
use tower_http::trace::TraceLayer;
use tracing::{info, trace};
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

/// Axum router for the application
pub fn router(pool: SqlitePool) -> Result<Router, Box<dyn Error>> {
    let data_entry_routes = Router::new()
        .route(
            "/{entry_number}",
            get(data_entry::polling_station_data_entry_get)
                .post(data_entry::polling_station_data_entry_save)
                .delete(data_entry::polling_station_data_entry_delete),
        )
        .route(
            "/{entry_number}/finalise",
            post(data_entry::polling_station_data_entry_finalise),
        );

    let polling_station_routes = Router::new()
        .route(
            "/",
            get(polling_station::polling_station_list)
                .post(polling_station::polling_station_create),
        )
        .route(
            "/{polling_station_id}",
            get(polling_station::polling_station_get)
                .put(polling_station::polling_station_update)
                .delete(polling_station::polling_station_delete),
        );

    let election_routes = Router::new()
        .route("/", get(election::election_list))
        .route("/{election_id}", get(election::election_details))
        .route(
            "/{election_id}/apportionment",
            post(apportionment::election_apportionment),
        )
        .route(
            "/{election_id}/download_zip_results",
            get(report::election_download_zip_results),
        )
        .route(
            "/{election_id}/download_pdf_results",
            get(report::election_download_pdf_results),
        )
        .route(
            "/{election_id}/download_xml_results",
            get(report::election_download_xml_results),
        )
        .route("/{election_id}/status", get(data_entry::election_status));

    #[cfg(feature = "dev-database")]
    let election_routes = election_routes.route("/", post(election::election_create));

    let user_router = Router::new()
        .route(
            "/",
            get(authentication::user_list).post(authentication::user_create),
        )
        .route(
            "/{user_id}",
            get(authentication::user_get)
                .put(authentication::user_update)
                .delete(authentication::user_delete),
        )
        .route("/login", post(authentication::login))
        .route("/logout", post(authentication::logout))
        .route("/whoami", get(authentication::whoami))
        .route("/account", put(authentication::account_update))
        .layer(middleware::from_fn_with_state(
            pool.clone(),
            authentication::extend_session,
        ));

    let app = Router::new()
        .nest("/api/user", user_router)
        .nest("/api/elections", election_routes)
        .nest(
            "/api/elections/{election_id}/polling_stations",
            polling_station_routes,
        )
        .nest(
            "/api/polling_stations/{polling_station_id}/data_entries",
            data_entry_routes,
        );

    let app = app.layer(TraceLayer::new_for_http());

    #[cfg(feature = "memory-serve")]
    let app = {
        app.merge(
            MemoryServe::from_env()
                .index_file(Some("/index.html"))
                .fallback(Some("/index.html"))
                .fallback_status(StatusCode::OK)
                .into_router(),
        )
    };

    // Add the state to the app
    let state = AppState { pool };
    let app = app.with_state(state);

    // Only include the OpenAPI spec if the feature is enabled
    #[cfg(feature = "openapi")]
    let app = {
        let openapi = create_openapi();
        app.merge(SwaggerUi::new("/api-docs").url("/api-docs/openapi.json", openapi.clone()))
    };

    Ok(app)
}

#[cfg(feature = "openapi")]
pub fn create_openapi() -> utoipa::openapi::OpenApi {
    use error::ErrorResponse;
    use utoipa::OpenApi;

    #[derive(OpenApi)]
    #[openapi(
        paths(
            apportionment::election_apportionment,
            authentication::login,
            authentication::logout,
            authentication::whoami,
            authentication::account_update,
            authentication::user_list,
            authentication::user_create,
            authentication::user_get,
            authentication::user_update,
            authentication::user_delete,
            election::election_list,
            election::election_create,
            election::election_details,
            report::election_download_zip_results,
            report::election_download_pdf_results,
            report::election_download_xml_results,
            data_entry::polling_station_data_entry_save,
            data_entry::polling_station_data_entry_get,
            data_entry::polling_station_data_entry_delete,
            data_entry::polling_station_data_entry_finalise,
            data_entry::election_status,
            polling_station::polling_station_list,
            polling_station::polling_station_create,
            polling_station::polling_station_get,
            polling_station::polling_station_update,
            polling_station::polling_station_delete,
        ),
        components(
            schemas(
                ErrorResponse,
                apportionment::AssignedSeat,
                apportionment::CandidateNominationResult,
                apportionment::DisplayFraction,
                apportionment::LargestAverageAssignedSeat,
                apportionment::LargestRemainderAssignedSeat,
                apportionment::PoliticalGroupCandidateNomination,
                apportionment::PoliticalGroupStanding,
                apportionment::SeatAssignmentResult,
                apportionment::SeatAssignmentStep,
                authentication::Credentials,
                authentication::LoginResponse,
                authentication::AccountUpdateRequest,
                authentication::UserListResponse,
                authentication::UpdateUserRequest,
                authentication::CreateUserRequest,
                data_entry::CandidateVotes,
                data_entry::DataEntry,
                data_entry::SaveDataEntryResponse,
                data_entry::GetDataEntryResponse,
                data_entry::DifferencesCounts,
                data_entry::PoliticalGroupVotes,
                data_entry::status::DataEntryStatusName,
                data_entry::PollingStationResults,
                data_entry::VotersCounts,
                data_entry::VotesCounts,
                data_entry::ElectionStatusResponse,
                data_entry::ElectionStatusResponseEntry,
                data_entry::ValidationResult,
                data_entry::ValidationResultCode,
                data_entry::ValidationResults,
                election::Election,
                election::ElectionCategory,
                election::PoliticalGroup,
                election::Candidate,
                election::CandidateGender,
                election::ElectionListResponse,
                election::ElectionDetailsResponse,
                election::ElectionRequest,
                polling_station::PollingStation,
                polling_station::PollingStationListResponse,
                polling_station::PollingStationType,
                polling_station::PollingStationRequest,
                summary::ElectionSummary,
                summary::SummaryDifferencesCounts,
            ),
        ),
        tags(
            (name = "apportionment", description = "Election apportionment API"),
            (name = "authentication", description = "Authentication and user API"),
            (name = "election", description = "Election API"),
            (name = "polling_station", description = "Polling station API"),
        )
    )]
    struct ApiDoc;
    ApiDoc::openapi()
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
