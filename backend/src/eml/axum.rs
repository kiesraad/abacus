use axum::{http::HeaderValue, response::IntoResponse};
use hyper::{header, StatusCode};

use crate::eml::EMLDocument;

pub struct Eml<T>(pub T);

impl<T> IntoResponse for Eml<T>
where
    T: EMLDocument,
{
    fn into_response(self) -> axum::response::Response {
        match self.0.to_xml_string() {
            Ok(data) => (
                [(header::CONTENT_TYPE, HeaderValue::from_static("text/xml"))],
                data,
            )
                .into_response(),
            Err(err) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                [(
                    header::CONTENT_TYPE,
                    HeaderValue::from_static("text/plain; charset=utf-8"),
                )],
                err.to_string(),
            )
                .into_response(),
        }
    }
}
