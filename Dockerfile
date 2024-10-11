FROM rust:latest AS builder

# Set the working directory in the container
WORKDIR /abacus

# Add the non-root 'abacus' user
RUN useradd -c Application -m -U abacus
ENV ROOT_SWITCH_USER=abacus

ENV ASSET_DIR=/frontend/dist

# Copy necessary files into the container
COPY --chown=abacus:abacus ./backend/Cargo.lock /abacus/Cargo.lock
COPY --chown=abacus:abacus ./backend/Cargo.toml /abacus/Cargo.toml
COPY --chown=abacus:abacus ./backend/src /abacus/src
COPY --chown=abacus:abacus ./backend/templates /abacus/templates
COPY --chown=abacus:abacus ./backend/migrations /abacus/migrations
COPY --chown=abacus:abacus ./backend/fixtures /abacus/fixtures
COPY --chown=abacus:abacus ./frontend/dist /frontend/dist
COPY --chown=abacus:abacus ./backend/.sqlx /abacus/.sqlx

# Build the application
RUN cargo build --release --features memory-serve


FROM debian:stable

WORKDIR /abacus

# Install 
RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install --no-install-recommends -y \
    && rm -rf /var/lib/apt/lists/*

# Add the non-root 'abacus' user
RUN useradd -c Application -m -U abacus
ENV ROOT_SWITCH_USER=abacus

# Copy the binary
COPY --chown=abacus:abacus --from=builder /abacus/target/release/backend /abacus/backend
COPY --chown=abacus:abacus --from=builder /abacus/migrations /abacus/migrations

# Run
CMD ["/abacus/backend"]

EXPOSE 8080
