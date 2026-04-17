#![no_main]

use apportionment::{CandidateVotes, process};
use apportionment_fuzz::{FuzzedApportionmentInput, SimpleCandidateVotes, SimpleListVotes, init_tracing, run_with_log};
use libfuzzer_sys::fuzz_target;

fuzz_target!(
    init: {
        init_tracing();
    },
    |data: (FuzzedApportionmentInput, u16)| {
    let (data, added_votes) = data;
    let (alloc, log1) = run_with_log(|| process(&data));

    // Add some votes to the first candidate of the first party
    let mut new_data = FuzzedApportionmentInput {
        seats: data.seats,
        list_votes: data
            .list_votes
            .iter()
            .map(|list| {
                SimpleListVotes::new(
                    list.number,
                    list.candidate_votes
                        .iter()
                        .map(|cv| cv.votes())
                        .collect(),
                )
            })
            .collect(),
    };

    if let Some(first_list) = new_data.list_votes.first_mut()
        && let Some(first_candidate) = first_list.candidate_votes.first_mut() {
            *first_candidate =
                SimpleCandidateVotes::new(first_candidate.number(), first_candidate.votes() + u32::from(added_votes));
        }

    let (new_alloc, log2) = run_with_log(|| process(&new_data));

    if let (Ok(alloc), Ok(new_alloc)) = (alloc, new_alloc) {
        let seats_per_party: Vec<u32> = alloc
            .seat_assignment
            .final_standing
            .iter()
            .map(|p| p.total_seats)
            .collect();
        let new_seats_per_party: Vec<u32> = new_alloc
            .seat_assignment
            .final_standing
            .iter()
            .map(|p| p.total_seats)
            .collect();

        // The party with the extra votes should have at least as many seats as before
        let my_party_seats = seats_per_party[0];
        let new_my_party_seats = new_seats_per_party[0];
        assert!(
            new_my_party_seats >= my_party_seats,
            "{new_my_party_seats} is not greater or equal than {my_party_seats}\n{seats_per_party:?} -> {new_seats_per_party:?}\n[before]\n{log1}\n[after +{added_votes} votes]\n{log2}",
        );
    }
});
