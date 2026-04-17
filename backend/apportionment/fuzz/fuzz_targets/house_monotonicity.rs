#![no_main]

use apportionment::process;
use apportionment_fuzz::{FuzzedApportionmentInput, get_total_seats, init_tracing, run_with_log};
use libfuzzer_sys::fuzz_target;

fuzz_target!(
    init: {
        init_tracing();
    },
    |data: (FuzzedApportionmentInput, u16)| {
    let (mut data, added_seats) = data;
    let seats = data.seats.max(19); // apportionment for < 19 seats is not monotonic
    let new_seats = seats + u32::from(added_seats);

    data.seats = seats;
    let (alloc, log1) = run_with_log(|| process(&data));
    let alloc = alloc.map(|r| get_total_seats(&r.seat_assignment));

    data.seats = new_seats;
    let (new_alloc, log2) = run_with_log(|| process(&data));
    let new_alloc = new_alloc.map(|r| get_total_seats(&r.seat_assignment));

    if let (Ok(seats_per_party), Ok(new_seats_per_party)) = (alloc, new_alloc) {
        // House monotonicity:
        // The number of seats given to any party will not decrease if the number of seats increases (when votes stay the same)
        assert!(
            new_seats_per_party.iter().ge(seats_per_party.iter()),
            "{new_seats_per_party:?} ({new_seats} seats) is not greater or equal than {seats_per_party:?} ({seats} seats)\n[{seats} seats]\n{log1}\n[{new_seats} seats]\n{log2}",
        );
    }
});
