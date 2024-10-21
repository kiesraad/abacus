FROM debian:bookworm-slim

WORKDIR /abacus

RUN groupadd -r abacus --gid=999 
RUN useradd --no-log-init -r -g abacus --uid=999 abacus
USER 999

# Copy the binary, database and migrations
COPY --chown=abacus:abacus ./backend/target/release/api /abacus/backend
COPY --chown=abacus:abacus ./backend/db.sqlite /abacus/db.sqlite
COPY --chown=abacus:abacus ./backend/migrations /abacus/migrations

# Run
CMD ["/abacus/backend"]

EXPOSE 8080
