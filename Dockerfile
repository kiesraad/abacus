FROM node:22 as frontend-builder
WORKDIR /build
COPY . .
WORKDIR /build/frontend
RUN npm ci --omit=dev
RUN npm run build

FROM rust:bookworm as backend-builder
WORKDIR /build
COPY ./backend ./backend
COPY --from=frontend-builder /build/frontend/dist ./frontend/dist
WORKDIR /build/backend
RUN cargo build --release --features memory-serve

FROM debian:bookworm-slim
WORKDIR /abacus
RUN groupadd -r abacus --gid=999
RUN useradd --no-log-init -r -g abacus --uid=999 abacus
RUN install -o abacus -g abacus -d /abacus
COPY --from=backend-builder /build/backend/target/release/abacus /usr/local/bin/abacus
USER 999
ENTRYPOINT ["/usr/local/bin/abacus"]
CMD ["--seed-data"]
EXPOSE 8080
