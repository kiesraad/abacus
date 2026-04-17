#![no_main]

use apportionment::{CandidateVotes, process};
use apportionment_fuzz::{FuzzedApportionmentInput, SimpleListVotes, init_tracing, run_with_log};
use libfuzzer_sys::fuzz_target;

fuzz_target!(
    init: {
        init_tracing();
    },
    |data: (FuzzedApportionmentInput, Vec::<usize>)| {
    let (data, mut random_order) = data;
    let (alloc, log1) = run_with_log(|| process(&data));

    if random_order.is_empty() {
        random_order.push(42);
    }

    // Randomly shuffle the party list based on random_order
    let mut reorder: Vec<(usize, &SimpleListVotes)> =
        data.list_votes.iter().enumerate().collect();
    reorder.sort_by_key(|(i, _)| random_order[*i % random_order.len()]);

    // Build a new input with reordered lists, renumbered sequentially
    let reordered_input = FuzzedApportionmentInput {
        seats: data.seats,
        list_votes: reorder
            .iter()
            .enumerate()
            .map(|(new_idx, (_, list))| {
                SimpleListVotes::new(
                    (new_idx + 1) as u32,
                    list.candidate_votes.iter().map(|cv| cv.votes()).collect(),
                )
            })
            .collect(),
    };

    let (new_alloc, log2) = run_with_log(|| process(&reordered_input));

    if let (Ok(alloc), Ok(new_alloc)) = (alloc, new_alloc) {
        let seats_per_party: Vec<u32> = alloc
            .seat_assignment
            .final_standing
            .iter()
            .map(|p| p.total_seats)
            .collect();

        // Reorder seat allocation to match the reordered parties
        let reordered: Vec<u32> = reorder
            .iter()
            .map(|(i, _)| seats_per_party[*i])
            .collect();

        let new_seats_per_party: Vec<u32> = new_alloc
            .seat_assignment
            .final_standing
            .iter()
            .map(|p| p.total_seats)
            .collect();

        // The allocation should be the same, but in the new order
        assert!(
            reordered.iter().eq(new_seats_per_party.iter()),
            "{reordered:?} (was {seats_per_party:?}) is not equal to {new_seats_per_party:?}\n{reorder:?}\n[original]\n{log1}\n[reordered]\n{log2}",
        );
    }
});
