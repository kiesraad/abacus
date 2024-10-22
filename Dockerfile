FROM debian:bookworm-slim

WORKDIR /abacus

RUN groupadd -r abacus --gid=999 
RUN useradd --no-log-init -r -g abacus --uid=999 abacus

# Creates the /abacus folder owned by the abacus user
RUN install -o abacus -g abacus -d  /abacus

# Copy the binary
COPY ./backend/target/release/api /usr/local/bin/abacus

USER 999

# Run
ENTRYPOINT ["/usr/local/bin/abacus"]

EXPOSE 8080
