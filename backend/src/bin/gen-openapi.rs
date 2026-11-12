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
    use utoipa::openapi::{RefOr, Schema};

    use super::*;

    #[test]
    fn check_openapi_json_for_null_type() {
        let mut openapi = openapi_router().into_openapi();

        let components = openapi
            .components
            .as_mut()
            .expect("no components in OpenAPI spec");

        // Loop over all schemas and remove properties that are intentionally
        // nullable and required, like an Option marked with
        // #[schema(required = true)].
        for schema in components.schemas.values_mut() {
            if let RefOr::T(Schema::Object(object)) = schema {
                let required = object.required.clone();
                // Filter out properties which are nullable and required
                object.properties.retain(|name, property| {
                    let nullable = serde_json::to_string(property)
                        .expect("Could not serialize property schema")
                        .contains("\"null\"");
                    !(nullable && required.contains(name))
                });
            }
        }

        // Check if there are still properties with null
        let result = openapi
            .to_pretty_json()
            .expect("Could not generate OpenAPI JSON");
        assert!(
            !result.contains("null"),
            "Add #[serde(skip_serializing_if = \"Option::is_none\")] where Option is used, or mark the field with #[schema(required = true)] if null is intentional."
        );
    }

    #[test]
    fn generated_openapi_json_is_up_to_date() {
        let newest = get_openapi_json();
        let current = fs::read_to_string("./openapi.json").expect("Could not read openapi.json");
        assert_eq!(newest, current, "openapi.json is not up to date");
    }
}
