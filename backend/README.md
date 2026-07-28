# Backend

This directory contains the backend API server for Abacus, implemented in Rust.
The backend is responsible for responding to API requests from the frontend,
managing the database and completing requested user actions, including
generating PDF and EML output files, computing summaries and apportionments, and
much more. 

During development the frontend assets are typically served by the frontend dev 
server. During production we serve the frontend assets directly from the Abacus 
binary. This results in production builds of Abacus that are completely 
self-contained.

## Usage

### Prerequisites

You will need to install the following prerequisites before you can build and run
the backend:

- [Rust (stable) and Cargo](https://www.rust-lang.org/tools/install)
- [SQLx CLI](https://docs.rs/crate/sqlx-cli/latest): `cargo install sqlx-cli`

### Quickstart

After having installed these prerequisites and having cloned the repository, you
can quickly get started by running the following commands:

```shell
cd backend
sqlx database setup
cargo run -- --seed-data
```

This will create the database, run the migrations, and seed the database with 
test data. The API server will now be available at http://localhost:8080. For
more detailed instructions please read the rest of this README.

### Building

First run `sqlx database setup` to create the SQLite database. Then use 
`cargo build` to build the project.

To make a release build, use `cargo build --release`.
The built binary will be located in `target/release/`.

### Running

Use `cargo run` to run the API on port 8080 (http://localhost:8080).

To let the API server serve the frontend, first compile the frontend using
`pnpm build` in the `frontend` directory. Then run the API server with the
`memory-serve` feature enabled:

```shell
cd frontend
pnpm install
pnpm build
cd ../backend
sqlx database setup
cargo run --features memory-serve
```

By default (for compilation efficiency) Abacus will use Typst from a Rust dylib.
Rust dylibs are not stable, so should not be used in production. If you want to
switch to the statically linked Typst (as is done with production builds of
Abacus) you can simply enable the `embed-typst` feature. This can be combined 
with the memory-serve feature as well, e.g.:

```shell
cargo build --features memory-serve,embed-typst
```

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

### TLS (HTTPS)

In production, Abacus must be built with TLS enabled, which makes Abacus serve
HTTPS only. To do this, enable the `tls` feature:

```shell
cargo build --release --features tls
```

On startup Abacus loads (or, on first run, generates) a local certificate
authority under the directory given by `--tls-dir` (defaults to `tls`). A fresh
server (leaf) certificate is created in memory on every start, signed by the CA
and covering `localhost`, `abacus.internal`, and all routable LAN addresses.

To trust the server, import the CA into the client trust store: `ca.pem` on
Linux/macOS/Firefox, `ca.cer` (DER) on Windows. The CA can be downloaded from the
running server at `/ca.pem` and `/ca.cer`.

Verify that you have the right certificate by comparing its fingerprint. Abacus
logs both the SHA-256 and SHA-1 fingerprint of the CA on startup. Compare
against whatever your client shows: browsers and the OpenSSL CLI (`openssl x509
-in ca.pem -noout -fingerprint -sha256`) show SHA-256, while the Windows
certificate manager displays the SHA-1 digest as the certificate "thumbprint".

With the `tls` feature enabled, the default port is 8443 in debug builds and 443
in release builds. Binding to 443 requires elevated privileges (e.g. the
`CAP_NET_BIND_SERVICE` capability on Linux).

Alongside the HTTPS port, Abacus runs a plain HTTP server that provides the CA
certificate at `/ca.pem` and `/ca.cer` over plain HTTP (so clients can fetch it
before trusting the server) and redirects every other request to HTTPS. Its port
is set by `--http-port` / `ABACUS_HTTP_PORT`, defaulting to 80 in release builds
and 8080 in debug builds. The CA is served over HTTPS as well. Failing to bind the
HTTP port (for example without the required privileges) is logged but not fatal.

#### Building with TLS enabled on Windows

On Windows, AWS Libcrypto has some [build requirements](https://aws.github.io/aws-lc-rs/requirements/windows.html):
- C/C++ Compiler: these build tools have likely been installed during installation of Rust
- NASM, two options:
  - Use the installer
  - Or, use prebuilt NASM objects: `set AWS_LC_SYS_PREBUILT_NASM=1`

### Building for various platforms

You can use [`cross`](https://github.com/cross-rs/cross) to compile for different architectures.

For example:

```shell
# build the frontend
cd frontend
pnpm install
pnpm build
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
- `async_zip`: creating a zip of the EML_NL and PDF PV.
- `axum-extra`: handling for attachments and cookies in `axum`.
- `axum`: web application framework that focuses on ergonomics and modularity.
- `chrono`: date and time library.
- `clap`: library for command-line argument parsing.
- `cookie`: dependency of axum_extra, for encoding and parsing cookies.
- `hyper`: fast and correct HTTP implementation.
- `icu_collator`: locale-aware string comparison
- `icu_locale_core`: locale definitions for `icu_collator`
- `memory-serve`: serves frontend assets from memory, but ad-hoc from disk during development.
- `password_hash`: password hashing interfaces.
- `rand`: create a random session key.
- `serde_json`: JSON support for Serde.
- `serde`: framework for serializing and deserializing data structures.
- `sha2`: generating a hash of the EML_NL XML files for inclusion in the PDF.
- `socket2`: Utilities for creating and using network sockets.
- `sqlx`: async SQL library featuring compile-time checked queries.
- `strum`: Converting enums from their string representation and back
- `tokio-util`: used for download streaming.
- `tokio`: runtime for writing asynchronous applications.
- `tower-http`: Tower middleware and utilities for HTTP clients and servers.
- `tower`: a library of modular and reusable components for building robust networking clients and servers.
- `tracing-subscriber`: utilities for implementing and composing `tracing` subscribers.
- `tracing`: a framework for instrumenting Rust programs to collect structured, event-based diagnostic information.
- `ttf-parser`: for parsing TrueType fonts.
- `typst-pdf`: a PDF exporter for Typst.
- `typst`: a new markup-based typesetting system that is powerful and easy to learn.
- `utoipa-swagger-ui`: Swagger UI for the OpenAPI specification.
- `utoipa`: library for documenting REST APIs using OpenAPI.

For TLS (HTTPS) support, when the `tls` feature is enabled, the following dependencies are used:
- `rcgen`: X.509 certificate/DER generation (`aws-lc-rs` backend)
- `rustls-pki-types`: shared certificate and private-key types, and PEM decoding.
- `if-addrs`: enumerating LAN IP addresses for the TLS certificate subject.
- `rustls`: TLS implementation, on the audited `aws-lc-rs` provider.
- `axum-server`: HTTPS serving for `axum`, with graceful shutdown.

Additionally, the following development dependencies are used:

- `test-log`: show tracing messages while running tests
- `reqwest`: HTTP client for testing the API.
- `http-body-util`: trait used to extract a response body in some tests.
- `tempfile`: to create temporary directories in tests.

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

### Test data generation

You can fill the database with test data and (optionally) export the election definition files with `gen-test-gsb-election.rs`.

Run `cargo run --bin gen-test-gsb-election -- --help` to see all command-line options.

### Binary usage

The abacus binary supports a few arguments, which can be passed on the command line, or as environment variables:

```
Options:
  -p, --port <PORT>            Server port, optional [env: ABACUS_PORT=] [default: 8443]
  -d, --database <DATABASE>    Location of the database file, will be created if it doesn't exist [env: ABACUS_DATABASE=] [default: db.sqlite]
      --tls-dir <TLS_DIR>      Location of the TLS directory (CA certificate and key), will be created if it doesn't exist [env: ABACUS_TLS_DIR=] [default: tls]
      --http-port <HTTP_PORT>  Port for the plain HTTP server that serves the CA certificate and redirects to HTTPS [env: ABACUS_HTTP_PORT=] [default: 8080]
  -a, --airgap-detection       Enable airgap detection [env: ABACUS_AIRGAP_DETECTION=]
  -V, --version                Show version
  -h, --help                   Print help
```

Note that airgap-detection is forced in our (pre-)releases.
For release builds the default port number is 80, or 443 when TLS is enabled.

A development build also supports the following arguments:

```
  -s, --seed-data            Seed the database with initial data using the fixtures [env: ABACUS_SEED_DATA=]
  -r, --reset-database       Reset the database [env: ABACUS_RESET_DATABASE=]
```
