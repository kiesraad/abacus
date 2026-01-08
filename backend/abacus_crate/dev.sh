#!/bin/bash

sqlx database reset -y
cargo run -- --reset-database --seed-data
