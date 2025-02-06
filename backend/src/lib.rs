#[cfg(feature = "memory-serve")]
use axum::http::StatusCode;
use axum::{
    extract::FromRef,
    routing::{get, post},
    Router,
};
#[cfg(feature = "memory-serve")]
use memory_serve::MemoryServe;
use sqlx::SqlitePool;
use std::error::Error;
use tower_http::trace::TraceLayer;
#[cfg(feature = "openapi")]
use utoipa_swagger_ui::SwaggerUi;

pub mod apportionment;
pub mod authentication;
pub mod data_entry;
pub mod election;
pub mod eml;
mod error;
#[cfg(feature = "dev-database")]
pub mod fixtures;
pub mod pdf_gen;
pub mod polling_station;
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
            get(election::election_download_zip_results),
        )
        .route(
            "/{election_id}/download_pdf_results",
            get(election::election_download_pdf_results),
        )
        .route(
            "/{election_id}/download_xml_results",
            get(election::election_download_xml_results),
        )
        .route("/{election_id}/status", get(data_entry::election_status));

    #[cfg(feature = "dev-database")]
    let election_routes = election_routes.route("/", post(election::election_create));

    let user_router = Router::new()
        .route("/", get(authentication::list))
        .route("/login", post(authentication::login))
        .route("/logout", post(authentication::logout))
        .route("/whoami", get(authentication::whoami))
        .route("/change-password", post(authentication::change_password));

    #[cfg(debug_assertions)]
    let user_router = user_router
        .route(
            "/development/create",
            post(authentication::development_create_user),
        )
        .route("/development/login", get(authentication::development_login));

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

    // Add a route to reset the database if the dev-database feature is enabled
    #[cfg(feature = "dev-database")]
    let app = app.route("/reset", post(fixtures::reset_database));

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
            authentication::change_password,
            authentication::list,
            election::election_list,
            election::election_create,
            election::election_details,
            election::election_download_zip_results,
            election::election_download_pdf_results,
            election::election_download_xml_results,
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
                apportionment::DisplayFraction,
                apportionment::ApportionmentResult,
                apportionment::PoliticalGroupStanding,
                apportionment::ApportionmentStep,
                apportionment::AssignedSeat,
                apportionment::HighestAverageAssignedSeat,
                apportionment::HighestSurplusAssignedSeat,
                authentication::Credentials,
                authentication::LoginResponse,
                authentication::ChangePasswordRequest,
                authentication::UserListResponse,
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
            (name = "authentication", description = "Authentication and user API"),
            (name = "election", description = "Election API"),
            (name = "polling_station", description = "Polling station API"),
        )
    )]
    struct ApiDoc;
    ApiDoc::openapi()
}
