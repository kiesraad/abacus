pub mod corrigendum;
pub mod document;
pub mod results;

use utoipa_axum::{router::OpenApiRouter, routes};

use crate::AppState;

pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::default()
        .routes(routes!(results::election_download_zip_results))
        .routes(routes!(results::election_download_pdf_results))
        .routes(routes!(document::election_download_n_10_2))
        .routes(routes!(document::election_download_na_31_2_bijlage1))
        .routes(routes!(document::election_download_na_31_2_inlegvel))
        .routes(routes!(
            corrigendum::polling_station_investigation_download_corrigendum_pdf
        ))
}
