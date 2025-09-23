#![cfg(test)]
#![cfg(feature = "openapi")]

use hyper::{Method, StatusCode};
use sqlx::SqlitePool;
use test_log::test;

use crate::utils::serve_api;

pub mod utils;

fn expected_response_code(path: &str) -> StatusCode {
    match path {
        "/api/login" | "/api/initialise/first-admin" => StatusCode::UNSUPPORTED_MEDIA_TYPE,
        "/api/logout" | "/api/initialised" => StatusCode::OK,
        "/api/initialise/admin-exists" => StatusCode::FORBIDDEN,
        _ => StatusCode::UNAUTHORIZED,
    }
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_route_authorization(pool: SqlitePool) {
    let openapi = abacus::openapi_router().into_openapi();
    let addr = serve_api(pool).await;

    // loop through all the paths in the openapi spec
    for (path, item) in openapi.paths.paths.iter() {
        let operations = [
            (Method::GET, &item.get),
            (Method::POST, &item.post),
            (Method::PUT, &item.put),
            (Method::PATCH, &item.patch),
            (Method::DELETE, &item.delete),
        ];

        // loop through all the operations for each path
        for (method, operation) in operations.into_iter() {
            if let Some(operation) = operation {
                let mut path = path.to_string();

                // replace path parameters with (dummy) values
                if let Some(parameters) = operation.parameters.as_ref() {
                    for param in parameters.iter() {
                        path = path.replace(&format!("{{{}}}", &param.name), "1");
                    }
                }

                // make a request, given the path and a method
                let url = format!("http://{addr}{path}");
                let response = reqwest::Client::new()
                    .request(method.clone(), url)
                    .send()
                    .await
                    .unwrap();

                let expected = expected_response_code(&path);
                assert_eq!(
                    expected,
                    response.status(),
                    "expected response code {expected} for {method} {path} when not logged in",
                );
            }
        }
    }
}
