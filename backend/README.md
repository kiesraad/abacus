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
`memory-serve` feature enabled. Also make sure to point the `ASSET_DIR` environment
variable to the directory where `vite` outputs the assets, e.g. `frontend/dist`.
In this version of `memory-serve`, the path must be absolute, since `build.rs`
has no knowledge of the project it is currently built in. Example:

```shell
ASSET_DIR=$PWD/frontend/dist cargo run --features memory-serve
```

### Linting

Use `cargo clippy --all-targets --all-features -- -D warnings` to lint the project. Warnings are treated as errors in the GitHub Actions workflow.

### Testing

Use `cargo test` to run the tests. The tests are also run in a GitHub Actions workflow.

## Structure

### Dependencies

The following dependencies (crates) are used:

- `argon2`: password hashing implementation (Argon2id).
- `axum`: web application framework that focuses on ergonomics and modularity.
- `axum-extra`: handling for attachments and cookies in `axum`.
- `chrono`: date and time library.
- `clap`: library for command-line argument parsing.
- `cookie`: dependency of axum_extra, for encoding and parsing cookies.
- `hyper`: fast and correct HTTP implementation.
- `memory-serve`: serves frontend assets from memory, but ad-hoc from disk during development.
- `password_hash`: password hashing interfaces.
- `quick-xml`: reading and writing EML_NL XML files.
- `rand`: create a random session key.
- `serde`: framework for serializing and deserializing data structures.
- `serde_json`: JSON support for Serde.
- `sha2`: generating a hash of the EML_NL XML files for inclusion in the PDF.
- `sqlx`: async SQL library featuring compile-time checked queries.
- `tokio`: runtime for writing asynchronous applications.
- `tower`: a library of modular and reusable components for building robust networking clients and servers.
- `tower-http`: Tower middleware and utilities for HTTP clients and servers.
- `tracing`: a framework for instrumenting Rust programs to collect structured, event-based diagnostic information.
- `tracing-subscriber`: utilities for implementing and composing `tracing` subscribers.
- `typst`: a new markup-based typesetting system that is powerful and easy to learn.
- `typst-pdf`: a PDF exporter for Typst.
- `utoipa`: library for documenting REST APIs using OpenAPI.
- `utoipa-swagger-ui`: Swagger UI for the OpenAPI specification.
- `zip`: creating a zip of the EML_NL and PDF PV.

Additionally, the following development dependencies are used:

- `reqwest`: HTTP client for testing the API.
- `http-body-util`: trait used to extract a response body in some tests.

### Database

SQLite is used as the database through the [SQLx](https://github.com/launchbadge/sqlx) Rust crate.

An empty database is created as `db.sqlite` when the application is started.
The database schema is created and updated using migrations managed by SQLx.

When migrations are out of sync (e.g. `VersionMismatch` occurs when starting the API server),
the database can be reset using `sqlx database reset` or by running the API server with the
`--reset-database` flag.

Example database fixtures can be loaded during startup by adding the `--seed-data` command line
flag. This can be combined with the `--reset-database` flag to always start from a clean database,
e.g.:

```shell
cargo run -- --reset-database --seed-data
```

#### SQLx offline mode

You can use SQLx in offline mode so that you don't need an active database connection for compile-time query checks.
To compile in offline mode, set the `SQLX_OFFLINE` environment variable to `true`, e.g. `env SQLX_OFFLINE=true cargo build`.

The SQLx offline mode uses query metadata in the `.sqlx` directory.
Lefthook is configured to update the query metadata on commit, but you can also run `cargo sqlx prepare -- --all-targets --all-features` manually.

### OpenAPI

The [utoipa](https://github.com/juhaku/utoipa) crate is used to generate OpenAPI documentation for the REST API.
The OpenAPI JSON specification is available in the repository at `openapi.json` and can be found at [/api-docs/openapi.json](http://localhost:8080/api-docs/openapi.json) when running the API server.
The Swagger UI is available at [/api-docs](http://localhost:8080/api-docs).

To update `openapi.json` in the repository, run the command `cargo run --bin gen-openapi`.
