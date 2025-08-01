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
`npm run build` in the `frontend` directory. Then run the API server with the
`memory-serve` feature enabled:

```shell
cd frontend
npm install
npm run build
cd ../backend
sqlx database setup
cargo run --features memory-serve
```

By default Abacus will use an external typst binary which should be available on
your `$PATH` in order to generate PDF output. You can download typst for your
platform on the [typst releases page] or by running `cargo install typst-cli`.
You can also build Abacus to include typst in the binary itself. To do this, you
can simply enable the `embed-typst` feature. This can be combined with the
memory-serve feature as well, e.g.:

```shell
cargo build --features memory-serve,embed-typst
```

[typst releases page]: https://github.com/typst/typst/releases

### Linting

Use `cargo clippy --all-targets --all-features -- -D warnings` to lint the project. Warnings are treated as errors in the GitHub Actions workflow.

### Testing

Use `cargo test` to run the tests. The tests are also run in a GitHub Actions workflow.

### Air gap detection

In production, Abacus must be built with air gap detection enabled. To enforce air gap detection during build, enable the feature `airgap-detection`:

```shell
cargo build --release --features airgap-detection
```

To enable air gap detection for a build without this feature, pass the CLI flag `--airgap-detection`. In development:

```shell
cargo run -- --airgap-detection
```

Using a binary:

```shell
abacus --airgap-detection
```

### Building for various platforms

You can use [`cross`](https://github.com/cross-rs/cross) to compile for different architectures.

For example:

```shell
# build the frontend
cd frontend
npm install
npm run build
cd ..

# build for ARMv6 32-bit Linux (like the Raspberry Pi 1/2/Zero)
cross build --release --features memory-serve,embed-typst,airgap-detection --manifest-path backend/Cargo.toml --target arm-unknown-linux-gnueabihf

# build for ARMv7-A 32-bit Linux (like the Raspberry Pi 3/4/5)
cross build --release --features memory-serve,embed-typst,airgap-detection --manifest-path backend/Cargo.toml --target armv7-unknown-linux-gnueabihf

# build for AArch64 64-bit Linux (Apple silicon)
cross build --release --features memory-serve,embed-typst,airgap-detection  --manifest-path backend/Cargo.toml --target aarch64-unknown-linux-gnu
```

To use `cross` on Apple silicon, set the `CROSS_CONTAINER_OPTS` environment variable to `--platform linux/amd64` when running the command.

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
- `tokio-stream`: used to wrap an channel to an async stream.
- `tower`: a library of modular and reusable components for building robust networking clients and servers.
- `tower-http`: Tower middleware and utilities for HTTP clients and servers.
- `tracing`: a framework for instrumenting Rust programs to collect structured, event-based diagnostic information.
- `tracing-subscriber`: utilities for implementing and composing `tracing` subscribers.
- `typst`: a new markup-based typesetting system that is powerful and easy to learn.
- `typst-pdf`: a PDF exporter for Typst.
- `utoipa`: library for documenting REST APIs using OpenAPI.
- `utoipa-swagger-ui`: Swagger UI for the OpenAPI specification.
- `async_zip`: creating a zip of the EML_NL and PDF PV.
- `strum`: Converting enums from their string representation and back

Additionally, the following development dependencies are used:

- `test-log`: show tracing messages while running tests
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
