# Backend

## Usage

### Build dependencies

- [Rust (stable) and Cargo](https://www.rust-lang.org/tools/install)
- [sqlx-cli](https://docs.rs/crate/sqlx-cli/latest): `cargo install sqlx-cli`

### Building

First run `sqlx database setup` to create the SQLite database. Then use `cargo build` to build the project.

### Running

Use `cargo run --bin api` to run the API on port 8080 (http://localhost:8080).

### Linting

Use `cargo clippy` to lint the project. Warnings are treated as errors in the CI pipeline.

## Structure

### Dependencies

The following dependencies (crates) are used:

- `axum`: web application framework that focuses on ergonomics and modularity.
- `hyper`: fast and correct HTTP implementation.
- `tokio`: runtime for writing asynchronous applications.
- `tower`: library for building robust networking clients and servers.
- `utoipa`: library for documenting REST APIs using OpenAPI.
- `serde`: framework for serializing and deserializing data structures.
- `serde_json`: JSON support for Serde.
- `sqlx`: async SQL library featuring compile-time checked queries.

Additionally, the following development dependencies are used:

- `reqwest`: HTTP client for testing the API.

### Database

SQLite is used as the database. An empty database is created as `db.sqlite` when the application is
started. The database schema is created and updated using migrations managed by `sqlx`.

### OpenAPI

The [utoipa](https://github.com/juhaku/utoipa) crate is used to generate OpenAPI documentation for the REST API. In this
proof of concept, all web UIs are also included. The OpenAPI JSON can be found
at [/api-docs/openapi.json](http://localhost:8080/api-docs/openapi.json).

The OpenAPI docs are also written to the `openapi.json` file in the root of the project. To update the file, run the
command `cargo run --bin gen-openapi`.
