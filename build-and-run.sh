#!/bin/bash

pushd "frontend"
npm run build
popd

pushd "backend"
ASSET_DIR="$PWD/../frontend/dist" cargo run --release --features memory-serve
popd
