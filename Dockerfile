FROM node:24-slim AS frontend-builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /build
COPY . .
WORKDIR /build/frontend
RUN pnpm install --prod --frozen-lockfile
RUN pnpm build

FROM rust:bookworm AS backend-builder
WORKDIR /build
COPY ./backend ./backend
COPY --from=frontend-builder /build/frontend/dist ./frontend/dist
WORKDIR /build/backend
RUN cargo build --release --features memory-serve,embed-typst

FROM debian:bookworm-slim
WORKDIR /abacus
RUN groupadd -r abacus --gid=999
RUN useradd --no-log-init -r -g abacus --uid=999 abacus
RUN install -o abacus -g abacus -d /abacus
COPY --from=backend-builder /build/backend/target/release/abacus /usr/local/bin/abacus
USER 999
ENTRYPOINT ["/usr/local/bin/abacus"]
CMD ["--seed-data"]
EXPOSE 80
