# Apportionment fuzzing

The Abacus apportionment crate has several fuzz targets that check our implementation of the algorithm. These can be divided into several categories:

- **Basic fuzzing**: the `simple_apportionment` target tests whether the apportionment algorithm panics (crashes) with certain inputs.
- **Differential fuzzing**: the `differential_osv2002` target tests differences with the OSV2020 implementation (requires OSV2020 apportionment wrapper).
- **Invariant fuzzing**: the `anonymity`, `apportionment`, `fractions`, `house_monotonicity`, and `population_monotonicity` targets test several invariants of the apportionment algorithm.

## Running

[cargo fuzz](https://rust-fuzz.github.io/book/cargo-fuzz/tutorial.html) is used as a fuzzing tool. A nightly version of the Rust toolchain is required; when using `rustup` this should get taken care of automatically because of the `rust-toolchain` file in this directory.

Basic commands:
- Installation: `cargo install cargo-fuzz`
- Listing fuzz targets: `cargo fuzz list`
- Running a fuzz target: `cargo fuzz run <target name>`

More documentation can be found in the [Rust Fuzz Book](https://rust-fuzz.github.io/book/cargo-fuzz.html).
