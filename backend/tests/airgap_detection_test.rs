#![cfg(test)]
#![cfg(all(feature = "openapi", feature = "force-airgap-detection"))]

use hyper::Method;
use sqlx::SqlitePool;
use test_log::test;

pub mod utils;

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_airgap_detection(pool: SqlitePool) {
    let openapi = abacus::openapi_router().into_openapi();
    let addr = utils::serve_api_with_airgap_detection(pool).await;

    // loop through all the paths in the openapi spec
    for (path, item) in openapi.paths.paths.iter() {
        let operations = [
            (Method::GET, &item.get),
            (Method::POST, &item.post),
            (Method::PUT, &item.put),
            (Method::PATCH, &item.patch),
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

                assert_eq!(
                    response.status(),
                    503,
                    "expected response code 503 for {method} {path} when airgap violation is detected",
                );
            }
        }
    }
}
