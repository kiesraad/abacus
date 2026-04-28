#![no_main]

use apportionment::{ApportionmentError, CandidateVotes, process};
use apportionment_fuzz::{
    FuzzedApportionmentInput, SimpleCandidateVotes, SimpleListVotes, init_tracing, run_with_log,
};
use libfuzzer_sys::fuzz_target;

fuzz_target!(
    init: {
        init_tracing();
    },
    |data: FuzzedApportionmentInput| {
    // Calculate total votes for validation
    let total_votes: u32 = data
        .list_votes
        .iter()
        .map(|list: &SimpleListVotes| {
            list.candidate_votes
                .iter()
                .map(|cv: &SimpleCandidateVotes| cv.votes())
                .sum::<u32>()
        })
        .sum();

    let votes_per_party: Vec<u32> = data
        .list_votes
        .iter()
        .map(|list: &SimpleListVotes| {
            list.candidate_votes
                .iter()
                .map(|cv: &SimpleCandidateVotes| cv.votes())
                .sum::<u32>()
        })
        .collect();

    let (result, log) = run_with_log(|| process(&data));

    match result {
        Ok(result) => {
            let total_seats = data.seats;

            // Validate total votes calculation
            assert_eq!(total_votes, votes_per_party.iter().sum::<u32>());

            // Validate total seats assigned
            let seats_per_party: Vec<u32> = result
                .seat_assignment
                .final_standing
                .iter()
                .map(|standing| standing.total_seats)
                .collect();

            assert_eq!(
                total_seats,
                seats_per_party.iter().sum::<u32>(),
                "Total seats mismatch: expected {}, got {}\n{log}",
                total_seats,
                seats_per_party.iter().sum::<u32>()
            );

            // Lower bound: every party deserves at least the percentage of seats relative to votes (rounded down)
            if total_votes > 0 {
                let seats_lower_bound: Vec<u32> = votes_per_party
                    .iter()
                    .map(|v: &u32| u64::from(total_seats) * u64::from(*v) / u64::from(total_votes))
                    .map(|x: u64| x.try_into().unwrap())
                    .collect();

                assert!(
                    seats_per_party
                        .iter()
                        .zip(seats_lower_bound.iter())
                        .all(|(s, lb)| s >= lb),
                    "{:?} is not element-wise greater or equal than {:?}\n{log}",
                    seats_per_party,
                    seats_lower_bound,
                );
            }

            // Upper bound: proportional share rounded up, plus at most all residual seats
            if total_votes > 0 {
                let extra = u64::from(result.seat_assignment.residual_seats);
                let seats_upper_bound: Vec<u32> = votes_per_party
                    .iter()
                    .map(|v: &u32| {
                        ((u64::from(total_seats) * u64::from(*v)) as f64 / (total_votes as f64))
                            .ceil() as u64
                            + extra
                    })
                    .map(|x: u64| x.try_into().unwrap())
                    .collect();

                assert!(
                    seats_per_party
                        .iter()
                        .zip(seats_upper_bound.iter())
                        .all(|(s, ub)| s <= ub),
                    "{:?} is not element-wise less or equal than {:?}\nextra (residual seats): {}\n{log}",
                    seats_per_party,
                    seats_upper_bound,
                    extra,
                );
            }

            // Concordance: parties with more votes should have at least as many seats
            for (i, (votes, seats)) in votes_per_party
                .iter()
                .zip(seats_per_party.iter())
                .enumerate()
            {
                for (j, (other_votes, other_seats)) in votes_per_party
                    .iter()
                    .zip(seats_per_party.iter())
                    .enumerate()
                {
                    if i != j && votes > other_votes {
                        assert!(
                            seats >= other_seats,
                            "Party {} with more votes ({}) should have at least as many seats as party {} ({} votes), but got {} vs {} seats\n{votes_per_party:?}\n{seats_per_party:?}\n{log}",
                            i,
                            votes,
                            j,
                            other_votes,
                            seats,
                            other_seats
                        );
                    }
                }
            }
        }
        Err(
            ApportionmentError::DrawingOfLotsNotImplemented | ApportionmentError::AllListsExhausted,
        ) => {
            // These are expected errors that we ignore
        }
        Err(ApportionmentError::ZeroVotesCast) => {
            // This is expected when no votes are cast
            assert_eq!(
                total_votes, 0,
                "ZeroVotesCast error but total_votes was {}\n{log}",
                total_votes
            );
        }
    }
});
