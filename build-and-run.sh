#!/bin/bash

echo "Building frontend..."

pushd "frontend" > /dev/null 2>&1
npm run build
popd > /dev/null 2>&1

echo "Building and running backend..."

pushd "backend" > /dev/null 2>&1
ASSET_DIR="$PWD/../frontend/dist" cargo run --release --features memory-serve
popd > /dev/null 2>&1
