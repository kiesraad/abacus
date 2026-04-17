#![no_main]

use apportionment::process;
use apportionment_fuzz::FuzzedApportionmentInput;
use libfuzzer_sys::fuzz_target;

fuzz_target!(|data: FuzzedApportionmentInput| {
    // Call the apportionment process and ensure it doesn't panic
    let _ = process(&data);
});
