use std::fs;

use abacus::infra::router::openapi_router;

/// Write OpenAPI JSON documentation to `openapi.json`.
fn main() {
    let doc = get_openapi_json();
    fs::write("./openapi.json", doc).expect("Could not write openapi.json");
    println!("Updated openapi.json");
}

fn get_openapi_json() -> String {
    openapi_router()
        .into_openapi()
        .to_pretty_json()
        .expect("Could not generate OpenAPI JSON")
}

#[cfg(test)]
mod tests {
    use test_log::test;

    use super::*;

    #[test]
    fn generated_openapi_json_is_up_to_date() {
        let newest = get_openapi_json();
        let current = fs::read_to_string("./openapi.json").expect("Could not read openapi.json");
        assert_eq!(newest, current, "openapi.json is not up to date");
    }
}
