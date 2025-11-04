#![cfg(test)]
#![cfg(feature = "openapi")]

use abacus::{authentication::Role, get_scopes_from_operation};
use hyper::{Method, StatusCode};
use sqlx::SqlitePool;
use std::panic;
use test_log::test;

use crate::utils::serve_api;

pub mod shared;
pub mod utils;

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_route_authorization(pool: SqlitePool) {
    let openapi = abacus::openapi_router().into_openapi();
    let addr = serve_api(pool).await;

    // Possible auth-related error statuses
    let auth_errors = [StatusCode::UNAUTHORIZED, StatusCode::FORBIDDEN];
    // Get cookies for all roles
    let auth_states = [
        (None, None),
        (
            Some(Role::Administrator),
            Some(shared::admin_login(&addr).await),
        ),
        (
            Some(Role::Coordinator),
            Some(shared::coordinator_login(&addr).await),
        ),
        (Some(Role::Typist), Some(shared::typist_login(&addr).await)),
    ];

    let client = reqwest::Client::new();
    let mut failures = Vec::new();

    // Ensure logout is tested last
    let mut paths: Vec<_> = openapi.paths.paths.iter().collect();
    paths.sort_by_key(|(path, _)| path.contains("logout"));

    // Loop through all the paths in the openapi spec
    for (path, item) in paths {
        let operations = [
            (Method::GET, &item.get),
            (Method::POST, &item.post),
            (Method::PUT, &item.put),
            (Method::PATCH, &item.patch),
            (Method::DELETE, &item.delete),
        ];

        // Loop through all the operations for each path
        for (method, operation) in operations.into_iter() {
            // Skip if no operation defined
            let Some(operation) = operation else { continue };

            // Replace path parameters with (dummy) values
            let mut path = path.to_string();
            if let Some(parameters) = operation.parameters.as_ref() {
                for param in parameters.iter() {
                    path = path.replace(&format!("{{{}}}", &param.name), "123");
                }
            }

            // Check if scopes are valid
            let scopes = get_scopes_from_operation(operation);
            if let Some(scopes) = &scopes {
                for scope in scopes {
                    if panic::catch_unwind(|| Role::from(scope.clone())).is_err() {
                        failures.push(format!(
                            "- {method} {path} contains invalid scope '{scope}'"
                        ));
                    }
                }
            }

            // Make requests with and without authentication, for all roles and check the response codes
            for auth_state in auth_states.iter() {
                let (role, cookie_opt) = auth_state;

                let url = format!("http://{addr}{path}");
                let mut request = client.request(method.clone(), url);

                if let Some(cookie) = cookie_opt {
                    request = request.header("Cookie", cookie.to_str().unwrap());
                }

                let response = request.send().await.unwrap();
                let status = response.status();

                // Determine if we expect an auth-related error
                let mut expected_error_status = match (&scopes, role) {
                    // Security defined but no role (unauthenticated)
                    (Some(_), None) => Some(StatusCode::UNAUTHORIZED),

                    // Security defined and role given, but not in scopes
                    (Some(scopes), Some(role))
                        if !scopes.iter().any(|s| s.eq(&role.to_string())) =>
                    {
                        Some(StatusCode::FORBIDDEN)
                    }

                    // Else, OK
                    _ => None,
                };

                // Exception, this route always forbids access after initialiation
                if path == "/api/initialise/admin-exists" {
                    expected_error_status = Some(StatusCode::FORBIDDEN);
                }

                match expected_error_status {
                    // If we expect no error, but got an auth error, record failure
                    None if auth_errors.contains(&status) => failures.push(format!(
                        "- {method} {path} as {:?}, got {status}, expected no auth error",
                        role
                    )),

                    // If we expect an error, but got something else than expected, record failure
                    Some(expected) if status != expected => failures.push(format!(
                        "- {method} {path} as {:?}, got {status}, expected {expected:?}",
                        role
                    )),
                    _ => {}
                }
            }
        }
    }

    if !failures.is_empty() {
        eprintln!("\n=== Authorization test failures ===");
        for f in &failures {
            eprintln!("{f}");
        }
        panic!("-> {} authorization checks failed", failures.len());
    }
}
