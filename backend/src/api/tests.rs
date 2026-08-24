use axum::{http::StatusCode, response::Response};
use http_body_util::BodyExt;

use crate::{ErrorResponse, domain::election::VoteCountingMethod, error::ErrorReference};

pub async fn assert_committee_category_authorization_err(results: Vec<(&'static str, Response)>) {
    for (handler, response) in results {
        let status = response.status();
        assert_eq!(status, StatusCode::FORBIDDEN, "handler '{handler}'");

        let body = response.into_body().collect().await.unwrap().to_bytes();
        let error: ErrorResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(
            error.reference,
            ErrorReference::Forbidden,
            "handler '{handler}'"
        );
        assert_eq!(error.error, "Invalid role", "handler '{handler}'");
    }
}

pub fn assert_committee_category_authorization_ok(results: Vec<(&'static str, Response)>) {
    for (handler, response) in results {
        assert_ne!(
            response.status(),
            StatusCode::FORBIDDEN,
            "handler '{handler}'"
        );
    }
}

pub async fn assert_counting_method_authorization_err(
    results: Vec<(&'static str, Response)>,
    counting_method: VoteCountingMethod,
) {
    for (handler, response) in results {
        let status = response.status();
        assert_eq!(status, StatusCode::NOT_FOUND, "handler '{handler}'");

        let body = response.into_body().collect().await.unwrap().to_bytes();
        let error: ErrorResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(
            error.reference,
            ErrorReference::EntryNotFound,
            "handler '{handler}'"
        );
        let counting_method = format!("{counting_method}").to_uppercase();
        let expected_error = format!("is only available for GSB {counting_method} elections");
        assert!(error.error.contains(&expected_error), "handler '{handler}'");
    }
}

pub fn assert_counting_method_authorization_ok(results: Vec<(&'static str, Response)>) {
    for (handler, response) in results {
        assert_eq!(response.status(), StatusCode::OK, "handler '{handler}'");
    }
}
