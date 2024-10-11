# Backend

## Usage

### Build dependencies

- [Rust (stable) and Cargo](https://www.rust-lang.org/tools/install)
- [sqlx-cli](https://docs.rs/crate/sqlx-cli/latest): `cargo install sqlx-cli`

### Building

First run `sqlx database setup` to create the SQLite database.
Then use `cargo build` to build the project.

To make a release build, use `cargo build --release`.
The built binary will be located in `target/release/`.

### Running

Use `cargo run` to run the API on port 8080 (http://localhost:8080).

To let the API server serve the frontend, first compile the frontend using
`npm run build` in the `frontend` directory. The run the API server with the
`memory-serve` feature enabled:

```shell
cargo run --features memory-serve
```

### Linting

Use `cargo clippy --all-targets --all-features -- -D warnings` to lint the project. Warnings are treated as errors in the GitHub Actions workflow.

### Testing

Use `cargo test` to run the tests. The tests are also run in a GitHub Actions workflow.

## Structure

### Dependencies

The following dependencies (crates) are used:

- `axum`: web application framework that focuses on ergonomics and modularity.
- `hyper`: fast and correct HTTP implementation.
- `tokio`: runtime for writing asynchronous applications.
- `memory-serve`: serves frontend assets from memory, but ad-hoc from disk during development.
- `utoipa`: library for documenting REST APIs using OpenAPI.
- `utoipa-swagger-ui`: Swagger UI for the OpenAPI specification.
- `serde`: framework for serializing and deserializing data structures.
- `serde_json`: JSON support for Serde.
- `sqlx`: async SQL library featuring compile-time checked queries.
- `chrono`: date and time library.
- `clap`: library for command-line argument parsing.

Additionally, the following development dependencies are used:

- `reqwest`: HTTP client for testing the API.

### Database

SQLite is used as the database. An empty database is created as `db.sqlite` when the application is
started. The database schema is created and updated using migrations managed by `sqlx`.

When migrations are out of sync (e.g. `VersionMismatch` occurs when starting the API server),
the database can be reset using `sqlx database reset` or by running the API server with the
`--reset-database` flag.

Example database fixtures can be loaded during startup by adding the `--seed-data` command line
flag. This can be combined with the `--reset-database` flag to always start from a clean database,
e.g.:

```shell
cargo run -- --reset-database --seed-data
```

### OpenAPI

The [utoipa](https://github.com/juhaku/utoipa) crate is used to generate OpenAPI documentation for the REST API.
The OpenAPI JSON specification is available in the repository at `openapi.json` and can be found at [/api-docs/openapi.json](http://localhost:8080/api-docs/openapi.json) when running the API server.
The Swagger UI is available at [/api-docs](http://localhost:8080/api-docs).

To update `openapi.json` in the repository, run the command `cargo run --bin gen-openapi`.
