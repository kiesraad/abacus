FROM debian:bookworm-slim

WORKDIR /abacus


RUN groupadd -r abacus --gid=999 
RUN useradd --no-log-init -r -g abacus --uid=999 abacus

# Creates the /abacus folder owned by the abacus user
RUN install -o abacus -g abacus -d  /abacus

USER 999

# Copy the binary
COPY --chown=abacus:abacus ./backend/target/release/api /abacus/backend

# Run
ENTRYPOINT ["/abacus/backend"]

EXPOSE 8080
