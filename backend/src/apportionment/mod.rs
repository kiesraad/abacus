use crate::apportionment::fraction::Fraction;
use crate::data_entry::PoliticalGroupVotes;
use crate::summary::ElectionSummary;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use tracing::{debug, info};

mod fraction;

fn get_pg_number_with_largest_average(
    pg_votes: &[PoliticalGroupVotes],
    whole_seats: &BTreeMap<u8, u64>,
    rest_seats: &BTreeMap<u8, u64>,
    remaining_seats: u64,
) -> Result<u8, ApportionmentError> {
    let mut averages = BTreeMap::<u8, Fraction>::new();
    for pg in pg_votes.iter() {
        let pg_total = Fraction::from_count(pg.total);
        let pg_seats_new = whole_seats
            .get(&pg.number)
            .expect("Political group should have number of whole seats")
            + rest_seats.get(&pg.number).unwrap_or(&0)
            + 1;
        let pg_avg_votes = pg_total / Fraction::from_u64(pg_seats_new);
        averages.insert(pg.number, pg_avg_votes);
    }
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

fn get_pg_number_with_largest_surplus(
    surpluses: &BTreeMap<u8, Fraction>,
    remaining_seats: u64,
) -> Result<u8, ApportionmentError> {
    debug!("Surpluses: {:?}", surpluses);

    let (&pg_number, &max) = surpluses
        .iter()
        .max_by(|(_, a), (_, b)| a.cmp(b))
        .expect("Maximum average should be found");
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

/// Apportionment - work in progress!!
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

    // calculate number of whole seats for each party
    let mut whole_seats = BTreeMap::<u8, u64>::new();
    for pg in &totals.political_group_votes {
        let pg_votes = Fraction::from_count(pg.total);
        let pg_seats = pg_votes.divide_and_return_whole_number(&quota);
        whole_seats.insert(pg.number, pg_seats);
    }

    let whole_seats_count = whole_seats.values().sum::<u64>();
    info!(
        "Whole seats: {:?} (total: {})",
        whole_seats, whole_seats_count
    );
    let mut remaining_seats = seats - whole_seats_count;
    let mut rest_seats = BTreeMap::<u8, u64>::new();
    // let mut pg_number_last_remaining_seat: Option<u8> = None;

    info!("======================================================");

    // allocate remaining seats (restzetels)
    if remaining_seats > 0 {
        if seats >= 19 {
            info!("Remaining seats calculation for 19 or more seats.");
            // using greatest average system ("stelsel grootste gemiddelden")
            while remaining_seats > 0 {
                info!("======================================================");
                debug!("Remaining seats: {}", remaining_seats);
                let pg_number = get_pg_number_with_largest_average(
                    &totals.political_group_votes,
                    &whole_seats,
                    &rest_seats,
                    remaining_seats,
                )?;

                *rest_seats.entry(pg_number).or_insert(0) += 1;
                remaining_seats -= 1;
                // pg_number_last_remaining_seat = Some(pg_number);
                info!("Remaining seat assigned to pg_number: {}", pg_number);
            }
        } else {
            info!("Remaining seats calculation for less than 19 seats.");
            // using greatest surplus system ("stelsel grootste overschotten")
            // get parties that have at least 3/4 (0.75) of the quota in total votes,
            // and for each party calculate the amount of surplus votes,
            // i.e. the number of total votes minus the quota times the number of whole seats
            let threshold = Fraction::new(3, 4) * quota;
            debug!("Threshold: {}", threshold);
            let mut surpluses = BTreeMap::<u8, Fraction>::new();
            for pg in totals.political_group_votes.iter() {
                let pg_total_votes = Fraction::from_count(pg.total);
                if pg_total_votes > threshold {
                    let pg_whole_seats = Fraction::from_u64(
                        *whole_seats
                            .get(&pg.number)
                            .expect("Political group should have number of whole seats"),
                    );
                    let surplus = pg_total_votes - (quota * pg_whole_seats);
                    surpluses.insert(pg.number, surplus);
                }
            }
            while remaining_seats > 0 {
                info!("======================================================");
                debug!("Remaining seats: {}", remaining_seats);
                if !surpluses.is_empty() {
                    let pg_number =
                        get_pg_number_with_largest_surplus(&surpluses, remaining_seats)?;

                    *rest_seats.entry(pg_number).or_insert(0) += 1;
                    surpluses.remove(&pg_number);
                    remaining_seats -= 1;
                    // pg_number_last_remaining_seat = Some(pg_number);
                    info!("Remaining seat assigned to pg_number: {}", pg_number);
                } else {
                    // TODO: Start using get_pg_number_with_largest_average for remaining seats
                }
            }
        }
    }

    // TODO: #785 Add check for absolute majority of votes vs seats and adjust last remaining seat assigned accordingly

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
    use crate::apportionment::{seat_allocation, ApportionmentError};
    use crate::data_entry::{PoliticalGroupVotes, VotersCounts, VotesCounts};
    use crate::summary::{ElectionSummary, SummaryDifferencesCounts};
    use tracing_test::traced_test;

    #[test]
    #[traced_test]
    fn test_seat_allocation_less_than_19_seats_with_remaining_seats_assigned_with_surplus_system() {
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
                PoliticalGroupVotes::from_test_data_auto(3, 99, &[]),
                PoliticalGroupVotes::from_test_data_auto(4, 51, &[]),
                PoliticalGroupVotes::from_test_data_auto(5, 148, &[]),
            ],
        };

        let result = seat_allocation(17, &totals);
        assert_eq!(result, Ok(vec![9, 4, 2, 0, 2]));
    }

    #[test]
    #[traced_test]
    fn test_seat_allocation_19_or_more_seats_with_remaining_seats() {
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

        let result = seat_allocation(23, &totals);
        assert_eq!(result, Ok(vec![12, 6, 1, 2, 2]));
    }

    #[test]
    #[traced_test]
    fn test_seat_allocation_with_drawing_of_lots_error() {
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
                PoliticalGroupVotes::from_test_data_auto(1, 500, &[]),
                PoliticalGroupVotes::from_test_data_auto(2, 140, &[]),
                PoliticalGroupVotes::from_test_data_auto(3, 140, &[]),
                PoliticalGroupVotes::from_test_data_auto(4, 140, &[]),
                PoliticalGroupVotes::from_test_data_auto(5, 140, &[]),
                PoliticalGroupVotes::from_test_data_auto(6, 140, &[]),
            ],
        };

        let result = seat_allocation(23, &totals);
        assert_eq!(result, Err(ApportionmentError::DrawingOfLotsNotImplemented));
        assert!(logs_contain(
            "Drawing of lots is needed but not yet implemented!"
        ));
    }
}
