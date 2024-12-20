use crate::apportionment::fraction::Fraction;
use crate::summary::ElectionSummary;

mod fraction;

/// Apportionment - work in progress!!
pub fn apportionment_wip(totals: &ElectionSummary) {
    println!("Totals {:#?}", totals);

    // calculate quota (kiesdeler) as a proper fraction
    let total_votes = Fraction::from_count(totals.votes_counts.votes_candidates_count);
    let seats = 23u64;
    let seats_fraction = Fraction::from_u64(seats);

    let quota = total_votes.divide(&seats_fraction);

    println!("Seats: {}", seats);
    println!("Quota: {}", quota);

    // TODO: check for lijstuitputting (allocated seats cannot be more than total candidates)

    // calculate number of whole seats for each party
    let mut whole_seats = vec![];
    for pg in &totals.political_group_votes {
        let pg_votes = Fraction::from_count(pg.total);
        let pg_seats = pg_votes.divide_whole(&quota);
        whole_seats.push(pg_seats);
    }

    let whole_seats_count = whole_seats.iter().sum::<u64>();
    println!(
        "Whole seats: {:?} (total: {})",
        whole_seats, whole_seats_count
    );
    let mut remaining_seats = seats - whole_seats_count;
    let mut rest_seats = vec![0; totals.political_group_votes.len()];
    let mut idx_last_remaining_seat;

    // allocate remaining seats (restzetels)
    // using greatest average ("stelsel grootste gemiddelden")
    while remaining_seats > 0 {
        println!("===========================");
        println!("Remaining seats: {}", remaining_seats);
        let mut avgs = vec![];
        for (idx, pg) in totals.political_group_votes.iter().enumerate() {
            let pg_votes = Fraction::from_count(pg.total);
            let pg_seats_new = whole_seats[idx] + rest_seats[idx] + 1;
            let pg_avg_votes = pg_votes.divide(&Fraction::from_u64(pg_seats_new));
            avgs.push(pg_avg_votes);
        }
        println!("Avgs: {:?}", avgs);

        let (idx, max) = avgs
            .iter()
            .enumerate()
            .max_by(|(_, a), (_, b)| a.cmp(b))
            .expect("Maximum average should be found");
        println!("Max: {} (idx {})", max, idx);

        // if maximum occurs more than once, exit with error if less remaining seats are available than max count
        let max_count = avgs.iter().filter(|&a| a == max).count() as u64;
        if max_count > remaining_seats {
            // TODO: if multiple parties have the same max and not enough remaining seats are available, use drawing of lots
            panic!("Drawing of lots is needed!");
        }

        rest_seats[idx] += 1;
        remaining_seats -= 1;
        idx_last_remaining_seat = idx;
    }

    // TODO: Add check for absolute majority of votes vs seats and adjust last remaining seat accordingly
    if (idx_last_remaining_seat) {
        println!("Last remaining seat: idx {}", idx_last_remaining_seat);
        let absolute_majority_votes_count: u32 =
            if let 0 = totals.votes_counts.votes_candidates_count % 2 {
                // with an even number of valid votes on candidates: 50% + 1
                ((totals.votes_counts.votes_candidates_count / 2) as f64 + 1.0) as u32
            } else {
                // with an uneven number of valid votes on candidates: 50% + ½
                ((totals.votes_counts.votes_candidates_count / 2) as f64 + 0.5) as u32
            };
    }

    println!("===========================");
    println!("Whole seats: {:?}", whole_seats);
    println!("Remaining seats: {:?}", rest_seats);
    println!(
        "Total seats: {:?}",
        whole_seats
            .iter()
            .zip(rest_seats.iter())
            .map(|(a, b)| a + b)
            .collect::<Vec<_>>()
    );
}

#[cfg(test)]
mod tests {
    use crate::apportionment::apportionment_wip;
    use crate::data_entry::{PoliticalGroupVotes, VotersCounts, VotesCounts};
    use crate::summary::{ElectionSummary, SummaryDifferencesCounts};

    #[test]
    fn test() {
        let totals = ElectionSummary {
            voters_counts: VotersCounts {
                poll_card_count: 1200,
                proxy_certificate_count: 0,
                voter_card_count: 0,
                total_admitted_voters_count: 1200,
            },
            votes_counts: VotesCounts {
                votes_candidates_count: 1200,
                blank_votes_count: 0,
                invalid_votes_count: 0,
                total_votes_cast_count: 1200,
            },
            differences_counts: SummaryDifferencesCounts::zero(),
            recounted_polling_stations: vec![],
            political_group_votes: vec![
                PoliticalGroupVotes::from_test_data_auto(1, 600, &[]),
                PoliticalGroupVotes::from_test_data_auto(2, 302, &[]),
                PoliticalGroupVotes::from_test_data_auto(3, 98, &[]),
                PoliticalGroupVotes::from_test_data_auto(4, 99, &[]),
                PoliticalGroupVotes::from_test_data_auto(5, 101, &[]),
            ],
        };

        apportionment_wip(&totals);
    }
}
