use utoipa_axum::{router::OpenApiRouter, routes};

use crate::infra::app::AppState;

pub mod account;
mod initialise;
pub mod login;
pub mod users;

pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::default()
        .routes(routes!(login::login))
        .routes(routes!(login::logout))
        .routes(routes!(account::account))
        .routes(routes!(account::account_update))
        .routes(routes!(initialise::initialised))
        .routes(routes!(initialise::create_first_admin))
        .routes(routes!(initialise::admin_exists))
        .routes(routes!(users::user_list))
        .routes(routes!(users::user_create))
        .routes(routes!(users::user_get))
        .routes(routes!(users::user_update))
        .routes(routes!(users::user_delete))
}
