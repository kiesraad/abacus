use crate::{
    apportionment::fraction::Fraction, data_entry::PoliticalGroupVotes, summary::ElectionSummary,
};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use tracing::{debug, info};

mod fraction;

fn get_number_of_whole_seats_per_pg(
    pg_votes: &[PoliticalGroupVotes],
    quota: &Fraction,
) -> BTreeMap<u8, u64> {
    // calculate number of whole seats for each party
    pg_votes
        .iter()
        .fold(BTreeMap::new(), |mut whole_seats, pg| {
            let pg_total = Fraction::from_count(pg.total);
            let pg_seats = pg_total.divide_and_return_whole_number(quota);
            whole_seats.insert(pg.number, pg_seats);
            whole_seats
        })
}

fn get_pg_number_with_largest_average(
    pg_votes: &[PoliticalGroupVotes],
    whole_seats: &BTreeMap<u8, u64>,
    rest_seats: &BTreeMap<u8, u64>,
    remaining_seats: u64,
    unique_pgs: Option<&Vec<u8>>,
) -> Result<u8, ApportionmentError> {
    let averages = pg_votes.iter().fold(BTreeMap::new(), |mut averages, pg| {
        let pg_total = Fraction::from_count(pg.total);
        let pg_seats_new = whole_seats
            .get(&pg.number)
            .expect("Political group should have number of whole seats")
            + rest_seats.get(&pg.number).unwrap_or(&0)
            + 1;
        let pg_avg_votes = pg_total / Fraction::from_u64(pg_seats_new);
        if unique_pgs.is_none() || unique_pgs.unwrap_or(&vec![]).contains(&pg.number) {
            averages.insert(pg.number, pg_avg_votes);
        }
        averages
    });

    debug!("Averages: {:?}", averages);

    let (&pg_number, &max) = averages
        .iter()
        .max_by(|(_, a), (_, b)| a.cmp(b))
        .expect("Maximum average should be found");
    debug!("Max: {} (pg_number {})", max, pg_number);

    // if maximum occurs more than once, exit with error if less remaining seats are available than max count
    let max_count = averages.iter().filter(|(_, &n)| n == max).count() as u64;
    if max_count > remaining_seats {
        // TODO: #788 if multiple parties have the same max and not enough remaining seats are available, use drawing of lots
        debug!(
            "Max count: {} is higher than remaining seats: {}",
            max_count, remaining_seats
        );
        info!("Drawing of lots is needed but not yet implemented!");
        return Err(ApportionmentError::DrawingOfLotsNotImplemented);
    }
    Ok(pg_number)
}

fn get_surplus_per_pg_where_total_votes_meets_the_threshold(
    pg_votes: &[PoliticalGroupVotes],
    whole_seats: &BTreeMap<u8, u64>,
    quota: &Fraction,
) -> BTreeMap<u8, Fraction> {
    // get parties that have at least 3/4 (0.75) of the quota in total votes,
    // and for each party calculate the amount of surplus votes,
    // i.e. the number of total votes minus the quota times the number of whole seats
    let threshold = Fraction::new(3, 4) * *quota;
    debug!("Threshold: {}", threshold);

    pg_votes.iter().fold(BTreeMap::new(), |mut surpluses, pg| {
        let pg_total = Fraction::from_count(pg.total);
        if pg_total >= threshold {
            let pg_whole_seats = Fraction::from_u64(
                *whole_seats
                    .get(&pg.number)
                    .expect("Political group should have number of whole seats"),
            );
            let surplus = pg_total - (*quota * pg_whole_seats);
            if surplus > Fraction::new(0, 1) {
                surpluses.insert(pg.number, surplus);
            }
        }
        surpluses
    })
}

fn get_pg_number_with_largest_surplus(
    surpluses: &BTreeMap<u8, Fraction>,
    remaining_seats: u64,
) -> Result<u8, ApportionmentError> {
    debug!("Surpluses: {:?}", surpluses);

    let (&pg_number, &max) = surpluses
        .iter()
        .max_by(|(_, a), (_, b)| a.cmp(b))
        .expect("Maximum surplus should be found");
    debug!("Max: {} (pg_number {})", max, pg_number);

    // if maximum occurs more than once, exit with error if less remaining seats are available than max count
    let max_count = surpluses.iter().filter(|(_, &n)| n == max).count() as u64;
    if max_count > remaining_seats {
        // TODO: #788 if multiple parties have the same max and not enough remaining seats are available, use drawing of lots
        debug!(
            "Max count: {} is higher than remaining seats: {}",
            max_count, remaining_seats
        );
        info!("Drawing of lots is needed but not yet implemented!");
        return Err(ApportionmentError::DrawingOfLotsNotImplemented);
    }
    Ok(pg_number)
}

fn allocate_remaining_seats(
    pg_votes: &[PoliticalGroupVotes],
    whole_seats: &BTreeMap<u8, u64>,
    quota: &Fraction,
    seats: u64,
    mut remaining_seats: u64,
) -> Result<BTreeMap<u8, u64>, ApportionmentError> {
    let mut rest_seats = BTreeMap::<u8, u64>::new();

    if seats >= 19 {
        info!("Remaining seats calculation for 19 or more seats.");
        // using largest averages system ("stelsel grootste gemiddelden")
        while remaining_seats > 0 {
            info!("======================================================");
            debug!("Remaining seats: {}", remaining_seats);
            // assign remaining seat to the party with the largest average
            let pg_number = get_pg_number_with_largest_average(
                pg_votes,
                whole_seats,
                &rest_seats,
                remaining_seats,
                None,
            )?;
            *rest_seats.entry(pg_number).or_insert(0) += 1;
            remaining_seats -= 1;
            info!(
                "Remaining seat assigned using largest averages system to pg_number: {}",
                pg_number
            );
        }
    } else {
        info!("Remaining seats calculation for less than 19 seats.");
        // using largest surpluses system ("stelsel grootste overschotten")
        let mut surpluses =
            get_surplus_per_pg_where_total_votes_meets_the_threshold(pg_votes, whole_seats, quota);
        let mut unique_pgs = pg_votes.iter().fold(Vec::new(), |mut unique_pgs, pg| {
            unique_pgs.push(pg.number);
            unique_pgs
        });
        while remaining_seats > 0 {
            info!("======================================================");
            debug!("Remaining seats: {}", remaining_seats);
            if !surpluses.is_empty() {
                // assign remaining seat to the party with the largest surplus and
                // remove that party and surplus from the list
                let pg_number = get_pg_number_with_largest_surplus(&surpluses, remaining_seats)?;
                *rest_seats.entry(pg_number).or_insert(0) += 1;
                surpluses.remove(&pg_number);
                remaining_seats -= 1;
                info!(
                    "Remaining seat assigned using largest surpluses system to pg_number: {}",
                    pg_number
                );
            } else {
                // once there are no parties with surpluses left and more remaining seats exist,
                // assign remaining seat to the unique political group with the largest average
                // using unique largest averages system ("stelsel grootste gemiddelden")
                // if there are still remaining seats after assigning each political group one,
                // assign remaining seat to the political group with the largest average
                // using largest averages system ("stelsel grootste gemiddelden")
                let pg_number = get_pg_number_with_largest_average(
                    pg_votes,
                    whole_seats,
                    &rest_seats,
                    remaining_seats,
                    if !unique_pgs.is_empty() {
                        Some(&unique_pgs)
                    } else {
                        None
                    },
                )?;
                *rest_seats.entry(pg_number).or_insert(0) += 1;
                remaining_seats -= 1;
                if !unique_pgs.is_empty() {
                    unique_pgs.retain(|&pg_num| pg_num != pg_number);
                }
                info!(
                    "Remaining seat assigned using greatest averages system to pg_number: {}",
                    pg_number
                );
            }
        }
    }
    Ok(rest_seats)
}

/// Apportionment
pub fn seat_allocation(
    seats: u64,
    totals: &ElectionSummary,
) -> Result<Vec<u64>, ApportionmentError> {
    info!("Seat allocation");
    debug!("Totals {:#?}", totals);
    info!("Seats: {}", seats);

    // calculate quota (kiesdeler) as a proper fraction
    let total_votes = Fraction::from_count(totals.votes_counts.votes_candidates_count);
    let seats_fraction = Fraction::from_u64(seats);
    let quota = total_votes / seats_fraction;

    info!("Quota: {}", quota);

    // TODO: #787 check for lijstuitputting (allocated seats cannot be more than total candidates)

    let whole_seats = get_number_of_whole_seats_per_pg(&totals.political_group_votes, &quota);
    let whole_seats_count = whole_seats.values().sum::<u64>();
    info!(
        "Whole seats: {:?} (total: {})",
        whole_seats, whole_seats_count
    );
    let remaining_seats = seats - whole_seats_count;
    let mut rest_seats = BTreeMap::<u8, u64>::new();

    info!("======================================================");

    // allocate remaining seats (restzetels)
    if remaining_seats > 0 {
        rest_seats = allocate_remaining_seats(
            &totals.political_group_votes,
            &whole_seats,
            &quota,
            seats,
            remaining_seats,
        )?;
    }

    // TODO: #785 Add check for absolute majority of votes vs seats and adjust last remaining seat allocated accordingly

    info!("======================================================");
    info!("Whole seats: {:?}", whole_seats);
    info!("Remaining seats: {:?}", rest_seats);
    let total_seats = whole_seats
        .iter()
        .map(|(pg_number, seats)| seats + rest_seats.get(pg_number).unwrap_or(&0))
        .collect::<Vec<_>>();
    info!("Total seats: {:?}", total_seats);
    Ok(total_seats)
}

/// Errors that can occur during apportionment
// TODO: integrate this with the application-wide error.rs once the apportionment functionality is finished
#[derive(Serialize, Deserialize, PartialEq, Debug)]
pub enum ApportionmentError {
    DrawingOfLotsNotImplemented,
}

#[cfg(test)]
mod tests {
    use crate::{
        apportionment::{seat_allocation, ApportionmentError},
        data_entry::{Count, PoliticalGroupVotes, VotersCounts, VotesCounts},
        summary::{ElectionSummary, SummaryDifferencesCounts},
    };
    use test_log::test;

    fn get_election_summary(pg_votes: Vec<Count>) -> ElectionSummary {
        let total_votes = pg_votes.iter().sum();
        let mut political_group_votes: Vec<PoliticalGroupVotes> = vec![];
        for (index, votes) in pg_votes.iter().enumerate() {
            political_group_votes.push(PoliticalGroupVotes::from_test_data_auto(
                (index + 1) as u8,
                *votes,
                &[],
            ))
        }
        ElectionSummary {
            voters_counts: VotersCounts {
                poll_card_count: total_votes,
                proxy_certificate_count: 0,
                voter_card_count: 0,
                total_admitted_voters_count: total_votes,
            },
            votes_counts: VotesCounts {
                votes_candidates_count: total_votes,
                blank_votes_count: 0,
                invalid_votes_count: 0,
                total_votes_cast_count: total_votes,
            },
            differences_counts: SummaryDifferencesCounts::zero(),
            recounted_polling_stations: vec![],
            political_group_votes,
        }
    }

    #[test]
    fn test_seat_allocation_less_than_19_seats_with_remaining_seats_assigned_with_surplus_system() {
        let totals = get_election_summary(vec![540, 160, 160, 80, 80, 80, 60, 40]);
        let result = seat_allocation(15, &totals);
        assert_eq!(result, Ok(vec![7, 2, 2, 1, 1, 1, 1, 0]));
    }

    #[test]
    fn test_seat_allocation_less_than_19_seats_with_remaining_seats_assigned_with_surplus_and_averages_system(
    ) {
        let totals = get_election_summary(vec![540, 160, 160, 80, 80, 80, 55, 45]);
        let result = seat_allocation(15, &totals);
        assert_eq!(result, Ok(vec![8, 2, 2, 1, 1, 1, 0, 0]));
    }

    #[test]
    fn test_seat_allocation_less_than_19_seats_with_remaining_seats_assigned_with_surplus_and_averages_system_no_surpluses(
    ) {
        let totals = get_election_summary(vec![560, 160, 160, 80, 80, 80, 40, 40]);
        let result = seat_allocation(15, &totals);
        assert_eq!(result, Ok(vec![8, 2, 2, 1, 1, 1, 0, 0]));
    }

    #[test]
    fn test_seat_allocation_less_than_19_seats_with_drawing_of_lots_error() {
        let totals = get_election_summary(vec![500, 140, 140, 140, 140, 140]);
        let result = seat_allocation(15, &totals);
        assert_eq!(result, Err(ApportionmentError::DrawingOfLotsNotImplemented));
    }

    #[test]
    fn test_seat_allocation_19_or_more_seats_with_remaining_seats() {
        let totals = get_election_summary(vec![600, 302, 98, 99, 101]);
        let result = seat_allocation(23, &totals);
        assert_eq!(result, Ok(vec![12, 6, 1, 2, 2]));
    }

    #[test]
    fn test_seat_allocation_19_or_more_seats_with_drawing_of_lots_error() {
        let totals = get_election_summary(vec![500, 140, 140, 140, 140, 140]);
        let result = seat_allocation(23, &totals);
        assert_eq!(result, Err(ApportionmentError::DrawingOfLotsNotImplemented));
    }
}
