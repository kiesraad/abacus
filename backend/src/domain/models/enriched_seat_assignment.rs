use serde::{Deserialize, Serialize};

use crate::domain::{
    apportionment::{DisplayFraction, ListSeatAssignment, SeatAssignment, SeatChangeStep},
    election::PGNumber,
    models::error::ModelsError,
    summary::ElectionSummaryCSB,
};

struct InitialSteps<'a> {
    initial_largest_remainder_steps: Vec<&'a SeatChangeStep>,
    initial_unique_highest_average_steps: Vec<&'a SeatChangeStep>,
    initial_highest_average_steps: Vec<SeatChangeStep>,
}

/// Retrieves [SeatChangeStep]s of type LargestRemainderAssignment/UniqueHighestAverageAssignment
/// before absolute majority reassignment or list exhaustion removal takes place
fn get_initial_steps(seat_assignment: &SeatAssignment) -> InitialSteps<'_> {
    let mut initial_largest_remainder_steps = vec![];
    let mut initial_unique_highest_average_steps = vec![];
    let mut initial_highest_average_steps = vec![];
    for step in &seat_assignment.steps {
        if step.change.is_changed_by_largest_remainder_assignment() {
            initial_largest_remainder_steps.push(step);
        }
        if step
            .change
            .is_changed_by_unique_highest_average_assignment()
        {
            initial_unique_highest_average_steps.push(step);
        }
        if step.change.is_changed_by_highest_average_assignment() {
            initial_highest_average_steps.push(step.clone());
        }
        // We stop when an absolute majority reassignment or list exhaustion removal step is found,
        // since this means all initial residual seat assignment steps are found
        if step.change.is_changed_by_absolute_majority_reassignment()
            || step.change.is_changed_by_list_exhaustion_removal()
        {
            break;
        }
    }
    InitialSteps {
        initial_largest_remainder_steps,
        initial_unique_highest_average_steps,
        initial_highest_average_steps,
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EnrichedSeatAssignment {
    quota: DisplayFraction,
    list_seat_assignment: Vec<EnrichedListSeatAssignment>,
    #[serde(skip_serializing_if = "Option::is_none")]
    initial_highest_average_steps: Option<Vec<SeatChangeStep>>,
    initial_total_full_seats: u32,
    initial_total_residual_seats: u32,
}

struct ListSeatAssignments {
    initial_total_full_seats: u32,
    enriched_list_seat_assignments: Vec<EnrichedListSeatAssignment>,
    initial_highest_average_steps: Vec<SeatChangeStep>,
}

impl EnrichedSeatAssignment {
    fn get_initial_full_seats(seat_assignment: &SeatAssignment, list_number: PGNumber) -> u32 {
        if !seat_assignment.steps.is_empty() {
            // In case remaining seats have been assigned, take the full seats from the standing
            // of the first residual seat assignment, which will be equal to the initial standing
            seat_assignment.steps[0]
                .standings
                .iter()
                .find(|standing| standing.list_number == list_number)
                .expect("Standing exists for each political group")
                .full_seats
        } else {
            // Otherwise take the full seats from the final standing
            // since it will be equal to the initial standing
            seat_assignment
                .final_standing
                .iter()
                .find(|standing| standing.list_number == list_number)
                .expect("Standing exists for each political group")
                .full_seats
        }
    }

    fn get_largest_remainders(
        seat_assignment: &SeatAssignment,
        initial_largest_remainder_steps: &[&SeatChangeStep],
    ) -> Vec<(PGNumber, LargestRemainder)> {
        let final_standing_pgs_meeting_threshold: Vec<&ListSeatAssignment> = seat_assignment
            .final_standing
            .iter()
            .filter(|list_seat_assignment| list_seat_assignment.meets_remainder_threshold)
            .collect();
        let mut largest_remainders = Vec::new();
        for standing in &final_standing_pgs_meeting_threshold {
            let assigned_seat = initial_largest_remainder_steps
                .iter()
                .find(|step| step.change.list_number_assigned() == standing.list_number);
            let largest_remainder = LargestRemainder {
                remainder_votes: standing.remainder_votes.clone(),
                residual_seats: if assigned_seat.is_some() { 1 } else { 0 },
            };
            largest_remainders.push((standing.list_number, largest_remainder));
        }
        largest_remainders
    }

    fn get_unique_highest_average(
        list_number: PGNumber,
        initial_full_seats: u32,
        largest_remainder: &Option<LargestRemainder>,
        initial_unique_highest_average_steps: &[&SeatChangeStep],
    ) -> Option<UniqueHighestAverage> {
        if !initial_unique_highest_average_steps.is_empty() {
            let assigned_seat = initial_unique_highest_average_steps
                .iter()
                .find(|step| step.change.list_number_assigned() == list_number);
            let average = &initial_unique_highest_average_steps
                .first()
                .expect("There should be at least one step since is_empty is checked")
                .standings
                .iter()
                .find(|standing| standing.list_number == list_number)
                .expect("Standing exists for each list")
                .next_votes_per_seat;
            let mut already_assigned_seats = initial_full_seats;
            if let Some(largest_remainder_details) = largest_remainder.clone() {
                already_assigned_seats += largest_remainder_details.residual_seats
            };
            let unique_highest_average = UniqueHighestAverage {
                already_assigned_seats,
                next_votes_per_seat: average.clone(),
                residual_seats: u32::from(assigned_seat.is_some()),
            };
            Some(unique_highest_average)
        } else {
            None
        }
    }

    fn get_list_seat_assignments(
        summary: &ElectionSummaryCSB,
        seat_assignment: &SeatAssignment,
    ) -> Result<ListSeatAssignments, ModelsError> {
        let mut enriched_list_seat_assignments = Vec::new();
        let mut initial_total_full_seats = 0;

        let initial_steps = get_initial_steps(seat_assignment);
        let largest_remainders = if initial_steps.initial_largest_remainder_steps.is_empty() {
            vec![]
        } else {
            Self::get_largest_remainders(
                seat_assignment,
                &initial_steps.initial_largest_remainder_steps,
            )
        };

        for pg_votes in &summary.votes_counts.political_group_total_votes {
            let initial_full_seats = Self::get_initial_full_seats(seat_assignment, pg_votes.number);
            let largest_remainder = if initial_steps.initial_largest_remainder_steps.is_empty() {
                None
            } else {
                largest_remainders
                    .iter()
                    .find(|(pg_number, _)| *pg_number == pg_votes.number)
                    .map(|(_, largest_remainder)| largest_remainder.clone())
            };
            let unique_highest_average = Self::get_unique_highest_average(
                pg_votes.number,
                initial_full_seats,
                &largest_remainder,
                &initial_steps.initial_unique_highest_average_steps,
            );
            initial_total_full_seats += initial_full_seats;

            enriched_list_seat_assignments.push(EnrichedListSeatAssignment {
                number: pg_votes.number,
                name: pg_votes.name.clone(),
                total: pg_votes.total,
                initial_full_seats,
                largest_remainder,
                unique_highest_average,
            })
        }
        Ok(ListSeatAssignments {
            initial_total_full_seats,
            enriched_list_seat_assignments,
            initial_highest_average_steps: initial_steps.initial_highest_average_steps,
        })
    }

    pub fn new(
        number_of_seats: u32,
        summary: &ElectionSummaryCSB,
        seat_assignment: &SeatAssignment,
    ) -> Result<Self, ModelsError> {
        let list_seat_assignments = Self::get_list_seat_assignments(summary, seat_assignment)?;
        Ok(EnrichedSeatAssignment {
            quota: seat_assignment.quota.clone(),
            list_seat_assignment: list_seat_assignments.enriched_list_seat_assignments,
            initial_highest_average_steps: if list_seat_assignments
                .initial_highest_average_steps
                .is_empty()
            {
                None
            } else {
                Some(list_seat_assignments.initial_highest_average_steps)
            },
            initial_total_full_seats: list_seat_assignments.initial_total_full_seats,
            initial_total_residual_seats: number_of_seats
                - list_seat_assignments.initial_total_full_seats,
        })
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EnrichedListSeatAssignment {
    /// Political group number
    number: PGNumber,
    /// Political group display name
    name: String,
    /// Total votes for the political group
    total: u32,
    /// Political group initial full seats
    initial_full_seats: u32,
    /// Political group largest remainder details if threshold was met
    #[serde(skip_serializing_if = "Option::is_none")]
    largest_remainder: Option<LargestRemainder>,
    /// Political group unique highest average details
    #[serde(skip_serializing_if = "Option::is_none")]
    unique_highest_average: Option<UniqueHighestAverage>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LargestRemainder {
    /// The remainder of votes that was not used to get full seats
    remainder_votes: DisplayFraction,
    /// Political group assigned residual seats
    residual_seats: u32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct UniqueHighestAverage {
    /// Political group already assigned seats
    already_assigned_seats: u32,
    /// The number of votes per seat if a new seat would be added to the current residual seats
    next_votes_per_seat: DisplayFraction,
    /// Political group assigned residual seats
    residual_seats: u32,
}

#[cfg(test)]
mod tests {
    use test_log::test;

    use crate::{
        api::apportionment::{ApportionmentInputData, map_seat_assignment},
        domain::{
            election::{
                CommitteeCategory, ElectionWithPoliticalGroups,
                tests::election_fixture_with_given_number_of_seats,
            },
            models::enriched_seat_assignment::EnrichedSeatAssignment,
            results::{
                political_group_candidate_votes::create_political_group_candidate_votes,
                political_group_total_votes::PoliticalGroupTotalVotes, voters_counts::VotersCounts,
                votes_counts::VotesCounts,
            },
            summary::{ElectionSummary, ElectionSummaryCSB, SumCount, SummaryDifferencesCounts},
        },
    };

    fn get_election_summary(
        election: &ElectionWithPoliticalGroups,
        candidate_votes: &[Vec<u32>],
    ) -> ElectionSummary {
        let total_votes_candidates_count = candidate_votes.iter().flatten().sum::<u32>();
        let political_group_votes =
            create_political_group_candidate_votes(&election.political_groups, candidate_votes);
        let political_group_total_votes = political_group_votes
            .iter()
            .map(|pg_votes| PoliticalGroupTotalVotes {
                number: pg_votes.number,
                total: pg_votes.total,
            })
            .collect();
        ElectionSummary {
            voters_counts: VotersCounts {
                poll_card_count: total_votes_candidates_count,
                proxy_certificate_count: 0,
                total_admitted_voters_count: total_votes_candidates_count,
            },
            votes_counts: VotesCounts {
                political_group_total_votes,
                total_votes_candidates_count,
                blank_votes_count: 0,
                invalid_votes_count: 0,
                total_votes_cast_count: total_votes_candidates_count,
            },
            differences_counts: SummaryDifferencesCounts {
                more_ballots_count: SumCount::zero(),
                fewer_ballots_count: SumCount::zero(),
            },
            political_group_votes,
            polling_station_investigations: Default::default(),
            number_of_voters: Some(election.number_of_voters),
        }
    }

    #[test]
    fn test_enriched_seat_assignment_lt_19_seats() {
        let candidate_votes = vec![
            vec![0],
            vec![3],
            vec![5],
            vec![6],
            vec![7],
            vec![10, 10, 10, 10, 10, 10, 10, 9],
        ];
        let election = election_fixture_with_given_number_of_seats(
            CommitteeCategory::CSB,
            candidate_votes
                .iter()
                .map(|cv| u32::try_from(cv.len()).expect("Should fit in u32"))
                .collect::<Vec<u32>>()
                .as_slice(),
            10,
        );
        let political_groups = &election.political_groups;
        let summary = get_election_summary(&election, &candidate_votes);
        let summary_csb = ElectionSummaryCSB::new(&summary, political_groups);
        let apportionment_input = ApportionmentInputData {
            number_of_seats: election.number_of_seats,
            list_votes: summary.political_group_votes.as_slice(),
        };
        let apportionment_result =
            apportionment::process(&apportionment_input).expect("apportionment failed");
        let seat_assignment = map_seat_assignment(&apportionment_result.seat_assignment);
        let result =
            EnrichedSeatAssignment::new(election.number_of_seats, &summary_csb, &seat_assignment)
                .expect("EnrichedSeatAssignment::new should succeed");

        assert!(result.initial_highest_average_steps.is_none());
        assert_eq!(result.initial_total_full_seats, 7);
        assert_eq!(result.initial_total_residual_seats, 3);

        let lsa = result.list_seat_assignment;
        assert_eq!(lsa[0].number, election.political_groups[0].number);
        assert_eq!(lsa[0].initial_full_seats, 0);
        assert!(lsa[0].largest_remainder.is_none());
        assert!(lsa[0].unique_highest_average.is_some());
        let lsa_0_unique_highest_average = lsa[0].unique_highest_average.as_ref().unwrap();
        assert_eq!(lsa_0_unique_highest_average.already_assigned_seats, 0);
        assert_eq!(lsa_0_unique_highest_average.residual_seats, 0);
        assert_eq!(
            lsa_0_unique_highest_average.next_votes_per_seat,
            seat_assignment.steps[1].standings[0].next_votes_per_seat
        );

        assert_eq!(lsa[1].number, election.political_groups[1].number);
        assert_eq!(lsa[1].initial_full_seats, 0);
        assert!(lsa[1].largest_remainder.is_none());
        assert!(lsa[1].unique_highest_average.is_some());
        let lsa_1_unique_highest_average = lsa[1].unique_highest_average.as_ref().unwrap();
        assert_eq!(lsa_1_unique_highest_average.already_assigned_seats, 0);
        assert_eq!(lsa_1_unique_highest_average.residual_seats, 0);
        assert_eq!(
            lsa_1_unique_highest_average.next_votes_per_seat,
            seat_assignment.steps[1].standings[1].next_votes_per_seat
        );

        assert_eq!(lsa[2].number, election.political_groups[2].number);
        assert_eq!(lsa[2].initial_full_seats, 0);
        assert!(lsa[2].largest_remainder.is_none());
        assert!(lsa[2].unique_highest_average.is_some());
        let lsa_2_unique_highest_average = lsa[2].unique_highest_average.as_ref().unwrap();
        assert_eq!(lsa_2_unique_highest_average.already_assigned_seats, 0);
        assert_eq!(lsa_2_unique_highest_average.residual_seats, 0);
        assert_eq!(
            lsa_2_unique_highest_average.next_votes_per_seat,
            seat_assignment.steps[1].standings[2].next_votes_per_seat
        );

        assert_eq!(lsa[3].number, election.political_groups[3].number);
        assert_eq!(lsa[3].initial_full_seats, 0);
        assert!(lsa[3].largest_remainder.is_none());
        assert!(lsa[3].unique_highest_average.is_some());
        let lsa_3_unique_highest_average = lsa[3].unique_highest_average.as_ref().unwrap();
        assert_eq!(lsa_3_unique_highest_average.already_assigned_seats, 0);
        assert_eq!(lsa_3_unique_highest_average.residual_seats, 0);
        assert_eq!(
            lsa_3_unique_highest_average.next_votes_per_seat,
            seat_assignment.steps[1].standings[3].next_votes_per_seat
        );

        assert_eq!(lsa[4].number, election.political_groups[4].number);
        assert_eq!(lsa[4].initial_full_seats, 0);
        assert!(lsa[4].largest_remainder.is_none());
        assert!(lsa[4].unique_highest_average.is_some());
        let lsa_4_unique_highest_average = lsa[4].unique_highest_average.as_ref().unwrap();
        assert_eq!(lsa_4_unique_highest_average.already_assigned_seats, 0);
        assert_eq!(lsa_4_unique_highest_average.residual_seats, 1);
        assert_eq!(
            lsa_4_unique_highest_average.next_votes_per_seat,
            seat_assignment.steps[1].standings[4].next_votes_per_seat
        );

        assert_eq!(lsa[5].number, election.political_groups[5].number);
        assert_eq!(lsa[5].initial_full_seats, 7);
        let lsa_5_largest_remainder = lsa[5].largest_remainder.as_ref().unwrap();
        assert_eq!(lsa_5_largest_remainder.residual_seats, 1);
        assert_eq!(
            lsa_5_largest_remainder.remainder_votes,
            seat_assignment.steps[1].standings[5].remainder_votes,
        );
        assert!(lsa[5].unique_highest_average.is_some());
        let lsa_5_unique_highest_average = lsa[5].unique_highest_average.as_ref().unwrap();
        assert_eq!(lsa_5_unique_highest_average.already_assigned_seats, 8);
        assert_eq!(lsa_5_unique_highest_average.residual_seats, 1);
        assert_eq!(
            lsa_5_unique_highest_average.next_votes_per_seat,
            seat_assignment.steps[1].standings[5].next_votes_per_seat
        );
    }

    #[test]
    fn test_enriched_seat_assignment_gte_19_seats() {
        let candidate_votes = vec![
            vec![7501, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            vec![1249, 0],
            vec![1249, 0],
            vec![1249, 0],
            vec![1249, 0],
            vec![1249, 0],
            vec![1248, 0],
            vec![7],
        ];
        let election = election_fixture_with_given_number_of_seats(
            CommitteeCategory::CSB,
            candidate_votes
                .iter()
                .map(|cv| u32::try_from(cv.len()).expect("Should fit in u32"))
                .collect::<Vec<u32>>()
                .as_slice(),
            24,
        );
        let political_groups = &election.political_groups;
        let summary = get_election_summary(&election, &candidate_votes);
        let summary_csb = ElectionSummaryCSB::new(&summary, political_groups);
        let apportionment_input = ApportionmentInputData {
            number_of_seats: election.number_of_seats,
            list_votes: summary.political_group_votes.as_slice(),
        };
        let apportionment_result =
            apportionment::process(&apportionment_input).expect("apportionment failed");
        let seat_assignment = map_seat_assignment(&apportionment_result.seat_assignment);
        let result =
            EnrichedSeatAssignment::new(election.number_of_seats, &summary_csb, &seat_assignment)
                .expect("EnrichedSeatAssignment::new should succeed");
        assert!(result.initial_highest_average_steps.is_some());
        let initial_highest_average_steps = result.initial_highest_average_steps.unwrap();
        assert_eq!(initial_highest_average_steps.len(), 6);
        assert_eq!(seat_assignment.steps.len(), 9);
        assert_eq!(
            initial_highest_average_steps,
            seat_assignment.steps[0..6].to_vec()
        );
        assert_eq!(result.initial_total_full_seats, 18);
        assert_eq!(result.initial_total_residual_seats, 6);

        let lsa = result.list_seat_assignment;
        assert_eq!(lsa[0].number, election.political_groups[0].number);
        assert_eq!(lsa[0].initial_full_seats, 12);
        assert!(lsa[0].largest_remainder.is_none());
        assert!(lsa[0].unique_highest_average.is_none());

        assert_eq!(lsa[1].number, election.political_groups[1].number);
        assert_eq!(lsa[1].initial_full_seats, 1);
        assert!(lsa[1].largest_remainder.is_none());
        assert!(lsa[1].unique_highest_average.is_none());

        assert_eq!(lsa[2].number, election.political_groups[2].number);
        assert_eq!(lsa[2].initial_full_seats, 1);
        assert!(lsa[2].largest_remainder.is_none());
        assert!(lsa[2].unique_highest_average.is_none());

        assert_eq!(lsa[3].number, election.political_groups[3].number);
        assert_eq!(lsa[3].initial_full_seats, 1);
        assert!(lsa[3].largest_remainder.is_none());
        assert!(lsa[3].unique_highest_average.is_none());

        assert_eq!(lsa[4].number, election.political_groups[4].number);
        assert_eq!(lsa[4].initial_full_seats, 1);
        assert!(lsa[4].largest_remainder.is_none());
        assert!(lsa[4].unique_highest_average.is_none());

        assert_eq!(lsa[5].number, election.political_groups[5].number);
        assert_eq!(lsa[5].initial_full_seats, 1);
        assert!(lsa[5].largest_remainder.is_none());
        assert!(lsa[5].unique_highest_average.is_none());

        assert_eq!(lsa[6].number, election.political_groups[6].number);
        assert_eq!(lsa[6].initial_full_seats, 1);
        assert!(lsa[6].largest_remainder.is_none());
        assert!(lsa[6].unique_highest_average.is_none());

        assert_eq!(lsa[7].number, election.political_groups[7].number);
        assert_eq!(lsa[7].initial_full_seats, 0);
        assert!(lsa[7].largest_remainder.is_none());
        assert!(lsa[7].unique_highest_average.is_none());
    }

    #[test]
    fn test_enriched_seat_assignment_no_residual_seats() {
        let candidate_votes = vec![
            vec![200, 60, 40, 55, 45, 42, 38],
            vec![100, 40, 20],
            vec![90, 50, 20],
            vec![80, 45, 35],
            vec![70, 10],
            vec![60, 20],
            vec![50, 30],
        ];
        let election = election_fixture_with_given_number_of_seats(
            CommitteeCategory::CSB,
            candidate_votes
                .iter()
                .map(|cv| u32::try_from(cv.len()).expect("Should fit in u32"))
                .collect::<Vec<u32>>()
                .as_slice(),
            15,
        );
        let political_groups = &election.political_groups;
        let summary = get_election_summary(&election, &candidate_votes);
        let summary_csb = ElectionSummaryCSB::new(&summary, political_groups);
        let apportionment_input = ApportionmentInputData {
            number_of_seats: election.number_of_seats,
            list_votes: summary.political_group_votes.as_slice(),
        };
        let apportionment_result =
            apportionment::process(&apportionment_input).expect("apportionment failed");
        let seat_assignment = map_seat_assignment(&apportionment_result.seat_assignment);
        let result =
            EnrichedSeatAssignment::new(election.number_of_seats, &summary_csb, &seat_assignment)
                .expect("EnrichedSeatAssignment::new should succeed");
        assert!(result.initial_highest_average_steps.is_none());
        assert_eq!(result.initial_total_full_seats, 15);
        assert_eq!(result.initial_total_residual_seats, 0);

        let lsa = result.list_seat_assignment;
        assert_eq!(lsa[0].number, election.political_groups[0].number);
        assert_eq!(lsa[0].initial_full_seats, 6);
        assert!(lsa[0].largest_remainder.is_none());
        assert!(lsa[0].unique_highest_average.is_none());

        assert_eq!(lsa[1].number, election.political_groups[1].number);
        assert_eq!(lsa[1].initial_full_seats, 2);
        assert!(lsa[1].largest_remainder.is_none());
        assert!(lsa[1].unique_highest_average.is_none());

        assert_eq!(lsa[2].number, election.political_groups[2].number);
        assert_eq!(lsa[2].initial_full_seats, 2);
        assert!(lsa[2].largest_remainder.is_none());
        assert!(lsa[2].unique_highest_average.is_none());

        assert_eq!(lsa[3].number, election.political_groups[3].number);
        assert_eq!(lsa[3].initial_full_seats, 2);
        assert!(lsa[3].largest_remainder.is_none());
        assert!(lsa[3].unique_highest_average.is_none());

        assert_eq!(lsa[4].number, election.political_groups[4].number);
        assert_eq!(lsa[4].initial_full_seats, 1);
        assert!(lsa[4].largest_remainder.is_none());
        assert!(lsa[4].unique_highest_average.is_none());

        assert_eq!(lsa[5].number, election.political_groups[5].number);
        assert_eq!(lsa[5].initial_full_seats, 1);
        assert!(lsa[5].largest_remainder.is_none());
        assert!(lsa[5].unique_highest_average.is_none());

        assert_eq!(lsa[6].number, election.political_groups[6].number);
        assert_eq!(lsa[6].initial_full_seats, 1);
        assert!(lsa[6].largest_remainder.is_none());
        assert!(lsa[6].unique_highest_average.is_none());
    }
}
