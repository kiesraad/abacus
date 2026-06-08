#!/usr/bin/env bash
set -euxo pipefail
cargo fuzz coverage differential_osv2020
HOST_TUPLE=$(rustc --print host-tuple)
cargo cov -- show \
  --format=html \
  -instr-profile=coverage/differential_osv2020/coverage.profdata \
  -Xdemangler=$HOME/.cargo/bin/rustfilt \
  -ignore-filename-regex="\.cargo|\.rustup|fuzz_target" \
  target/${HOST_TUPLE}/coverage/${HOST_TUPLE}/release/differential_osv2020 \
  > coverage/differential_osv2020/cov.html
xdg-open coverage/differential_osv2020/cov.html
