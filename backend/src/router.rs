use airgap::AirgapDetection;
use axum::{
    Router, extract::DefaultBodyLimit, http::StatusCode, middleware, response::IntoResponse,
    routing::any,
};
use hyper::http::{HeaderName, HeaderValue, header};
use sqlx::SqlitePool;
use tower_http::{
    set_header::SetResponseHeaderLayer,
    trace::{self, TraceLayer},
};
use tracing::Level;
use utoipa::OpenApi;
use utoipa_axum::router::OpenApiRouter;
#[cfg(feature = "openapi")]
use utoipa_swagger_ui::SwaggerUi;

use crate::{
    AppError, AppState, MAX_BODY_SIZE_MB, airgap, audit_log, authentication, committee_session,
    data_entry, document, election, error, investigation, polling_station, report,
};

#[cfg(feature = "dev-database")]
use crate::test_data_gen;

pub fn openapi_router() -> OpenApiRouter<AppState> {
    #[derive(utoipa::OpenApi)]
    struct ApiDoc;

    let router = OpenApiRouter::with_openapi(ApiDoc::openapi())
        .merge(audit_log::router())
        .merge(authentication::router())
        .merge(authentication::user_router())
        .merge(committee_session::router())
        .merge(data_entry::router())
        .merge(election::router())
        .merge(polling_station::router())
        .merge(report::router())
        .merge(document::router())
        .merge(investigation::router());

    #[cfg(feature = "dev-database")]
    let router = router.merge(test_data_gen::router());

    router
}

fn axum_router_from_openapi(router: OpenApiRouter<AppState>) -> Router<AppState> {
    // Serve the OpenAPI documentation at /api-docs if the openapi feature is enabled
    #[cfg(feature = "openapi")]
    let router = {
        let (router, openapi) = router.split_for_parts();
        router.merge(SwaggerUi::new("/api-docs").url("/api-docs/openapi.json", openapi))
    };

    // Serve without OpenAPI documentation if the openapi feature is disabled
    #[cfg(not(feature = "openapi"))]
    let router = Router::from(router);

    // Add fallback for unmatched /api/* routes to return 404
    // This must come before the frontend memory-serve routes
    async fn api_fallback_handler() -> impl IntoResponse {
        (StatusCode::NOT_FOUND, "Not Found")
    }
    router
        .route("/api", any(api_fallback_handler))
        .route("/api/", any(api_fallback_handler))
        .route("/api/{*path}", any(api_fallback_handler))
}

/// Add middleware to trace all HTTP requests and extend the user's session lifetime if needed
fn add_middleware(router: Router<AppState>, state: &AppState) -> Router<AppState> {
    router
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
        // Caution: make sure "inject_user" is added after "extend_session"
        .layer(middleware::map_request_with_state(
            state.clone(),
            authentication::inject_user,
        ))
        .layer(middleware::from_fn_with_state(
            state.clone(),
            airgap::block_request_on_airgap_violation,
        ))
        // Set Cache-Control header to prevent caching of API responses
        .layer(SetResponseHeaderLayer::overriding(
            header::CACHE_CONTROL,
            HeaderValue::from_static("no-store"),
        ))
}

/// Add the memory-serve router to serve the frontend (if the memory-serve feature is enabled)
/// Note that memory-serve includes its own Cache-Control header.
#[cfg(feature = "memory-serve")]
fn add_frontend_memory_serve(router: Router<AppState>) -> Router<AppState> {
    router.merge(
        memory_serve::from_local_build!("frontend")
            .index_file(Some("/index.html"))
            .fallback(Some("/index.html"))
            .fallback_status(StatusCode::OK)
            .into_router()
            // Add Referrer-Policy, Permissions-Policy and Content-Security-Policy headers.
            // These are only needed on HTML documents, not API requests.
            // From https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html#security-headers:
            // "The headers below are only intended to provide additional security when responses are rendered as HTML."
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
            ))
            .layer(SetResponseHeaderLayer::overriding(
                header::CONTENT_SECURITY_POLICY,
                HeaderValue::from_static("default-src 'self'; img-src 'self' data:"),
            )),
    )
}

/// Add memory-serve router to serve Storybook
#[cfg(feature = "storybook")]
fn add_storybook_memory_serve(router: Router<AppState>) -> Router<AppState> {
    router
        .nest(
            "/storybook/",
            memory_serve::from_local_build!("storybook")
                .index_file(Some("/index.html"))
                .into_router()
                .layer(SetResponseHeaderLayer::overriding(
                    header::X_FRAME_OPTIONS,
                    HeaderValue::from_static("sameorigin"),
                )),
        )
        // Workaround for https://github.com/storybookjs/storybook/issues/32428
        .route(
            "/vite-inject-mocker-entry.js",
            axum::routing::get(|| async {
                axum::response::Redirect::temporary("/storybook/vite-inject-mocker-entry.js")
            }),
        )
}

/// Add headers for security hardening
/// Best practices according to the OWASP Secure Headers Project, https://owasp.org/www-project-secure-headers/
fn add_security_headers(router: Router<AppState>) -> Router<AppState> {
    let security_headers_service = tower::ServiceBuilder::new()
        .layer(SetResponseHeaderLayer::if_not_present(
            header::X_FRAME_OPTIONS,
            HeaderValue::from_static("deny"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            header::X_CONTENT_TYPE_OPTIONS,
            HeaderValue::from_static("nosniff"),
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
    router.layer(security_headers_service)
}

/// Complete Axum router for the application
pub fn create_router(
    pool: SqlitePool,
    airgap_detection: AirgapDetection,
) -> Result<Router, AppError> {
    let router = axum_router_from_openapi(openapi_router());
    let state = AppState {
        pool,
        airgap_detection,
    };
    let router = add_middleware(router, &state);
    #[cfg(feature = "memory-serve")]
    let router = add_frontend_memory_serve(router);
    #[cfg(feature = "storybook")]
    let router = add_storybook_memory_serve(router);
    let router = add_security_headers(router);
    let router = router.with_state(state);
    Ok(router)
}
