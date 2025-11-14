# Abacus fuzz tests

We use [cargo-fuzz](https://rust-fuzz.github.io/book/cargo-fuzz.html) for fuzzing, below we describe the fuzz tests contained within this crate.

## Data entry status fuzz test

The `data_entry_status` fuzz test tests that the data entry system matches the state machine described in the [docs](https://github.com/kiesraad/abacus/blob/main/documentatie/flowcharts/data-entry-state.md). The fuzzer checks that all possible transitions change the state as expected, or give the expected error.

This fuzz test covers all possible states and all possible `DataEntryTransitionError` errors, except for the `FirstEntryAlreadyClaimed`, `ValidatorError` and `ValidationError` errors. The `FirstEntryAlreadyClaimed` error is not triggered by the fuzzer for simplicity, but this error is explicitly tested by the `first_entry_in_progress_claim_first_entry_other_user_error` unit test. The `ValidatorError` and `ValidationError` errors are not triggered by the fuzzer because the fuzzer does not test the API directly. Instead, the fuzzer only tests the internal functions to focus on verifying the data entry state machine. This fuzz test can be seen as a more complete extension of the unit tests that test individual transitions, which shows that no unexpected errors or transition can happen.

Run it with the following command (for fuzzing you need the nightly compiler):

```
cargo +nightly fuzz run data_entry_status
```

The output of the fuzzer should look something like:

```
#16384  pulse  cov: 1036 ft: 5295 corp: 482/128Kb lim: 3439 exec/s: 3276 rss: 468Mb
#16856  REDUCE cov: 1036 ft: 5295 corp: 482/128Kb lim: 3439 exec/s: 3371 rss: 482Mb L: 176/3406 MS: 1 EraseBytes-
#22839  NEW    cov: 1036 ft: 5305 corp: 483/128Kb lim: 3472 exec/s: 3262 rss: 571Mb L: 620/3406 MS: 4 CrossOver-CrossOver-ChangeASCIIInt-CrossOver-
```

Here, `NEW` indicates that a new code path has been triggered, and `REDUCE` indicates a previously covered code path has been triggered with a shorter input. The `pulse` is a periodic status update.

If the fuzzer has found a problem, it will exit and print the error. The error message will contain which unexpected transition took place. If after a few minutes the fuzzer has not found any problems we can be fairly certain the data entry system matches the state machine described in the fuzz test.

### Checking the fuzz test coverage

To check the coverage of the fuzzer, we can use the `fuzz coverage` command.
For this you need the `llvm-tools-preview` tools, which can be installed using:

```
rustup component add --toolchain nightly llvm-tools-preview
```

Then, generate the coverage data of the current corpus using:

```
cargo +nightly fuzz coverage data_entry_status
```

We can use `llvm-cov` to visualize the coverage data. For this, we will need `rustfilt`, which can be installed with:

```
cargo +nightly install rustfilt
```

Then we can run the following command to output the coverage data to `/tmp/coverage` (thanks [Folkert](https://tweedegolf.nl/en/blog/154/what-is-my-fuzzer-doing#generating-a-coverage-report)!):

```
$(rustc +nightly --print sysroot)/lib/rustlib/$(rustc +nightly --print host-tuple)/bin/llvm-cov show \
 target/$(rustc +nightly --print host-tuple)/coverage/$(rustc +nightly --print host-tuple)/release/data_entry_status \
 -instr-profile=fuzz/coverage/data_entry_status/coverage.profdata \
 -Xdemangler=rustfilt \
 --format=html \
 -output-dir=/tmp/coverage \
 -ignore-filename-regex="\.cargo|\.rustup|fuzz_target|\/rustc"
```

Now you can open the generated `/tmp/coverage/index.html` in your browser to view which parts of Abacus were covered by the fuzzer. The coverage of the `src/data_entry/status.rs` is mainly relevant for this fuzz test, there you can see which error cases have and which have not been covered.
