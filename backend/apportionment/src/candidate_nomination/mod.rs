mod structs;

pub use structs::{
    Candidate, CandidateNominationDetails, CandidateRanking, ListCandidateNomination,
    PreferenceThreshold,
};
use tracing::{debug, info};

use crate::{
    ApportionmentError, CandidateDrawn, CandidateVotes, ListVotes,
    fraction::Fraction,
    structs::{
        CandidateDrawingLotsVariant, CandidateNominationInput, CandidateNumber, DeceasedCandidates,
        LARGE_COUNCIL_THRESHOLD, ListNumber,
    },
};

#[derive(Debug, PartialEq)]
pub enum CandidateNomination<'a, LV: ListVotes> {
    Completed(CandidateNominationDetails<'a, LV>),
    DrawingLotsRequired(CandidateDrawingLotsVariant<ListNumber<LV>, CandidateNumber<LV>>),
}

/// Candidate nomination
#[expect(clippy::cognitive_complexity)]
pub(crate) fn candidate_nomination<'a, L: ListVotes>(
    input: &CandidateNominationInput<'a, L>,
    candidates_drawn: impl Iterator<
        Item = &'a (impl CandidateDrawn<ListNumber<L>, CandidateNumber<L>> + 'a),
    >,
) -> Result<CandidateNomination<'a, L>, ApportionmentError> {
    info!("Candidate nomination");

    // [Artikel P 15 Kieswet](https://wetten.overheid.nl/BWBR0004627/2026-01-01/#AfdelingII_HoofdstukP_Paragraaf3_ArtikelP15)
    // Calculate preference threshold as a proper fraction
    let preference_threshold_percentage = if input.number_of_seats >= LARGE_COUNCIL_THRESHOLD {
        25
    } else {
        50
    };
    let preference_threshold = input.quota * Fraction::new(preference_threshold_percentage, 100);
    info!(
        "Preference threshold percentage: {}%",
        preference_threshold_percentage
    );
    info!("Preference threshold: {}", preference_threshold);

    let list_candidate_nomination =
        match candidate_nomination_per_list(input, preference_threshold, candidates_drawn)? {
            ListCandidateNominations::Completed(list) => list,
            ListCandidateNominations::DrawingLotsRequired(variant) => {
                return Ok(CandidateNomination::DrawingLotsRequired(variant));
            }
        };
    debug!(
        "List candidate nomination: {:#?}",
        list_candidate_nomination
    );

    // Create chosen candidates list
    let chosen_candidates = all_chosen_candidates(input.list_votes, &list_candidate_nomination);
    debug!("Chosen candidates: {:#?}", chosen_candidates);

    Ok(CandidateNomination::Completed(CandidateNominationDetails {
        preference_threshold: PreferenceThreshold {
            percentage: preference_threshold_percentage,
            number_of_votes: preference_threshold,
        },
        chosen_candidates,
        list_candidate_nomination,
    }))
}

/// Collect all chosen candidates via nomination with preferential votes and
/// the other nominated candidates into one list.
/// Returns candidates in order of occurrence in the list votes, not nominations
fn all_chosen_candidates<T: ListVotes>(
    list_votes: &[T],
    list_candidate_nomination: &[ListCandidateNomination<T>],
) -> Vec<Candidate<T>> {
    list_votes
        .iter()
        .flat_map(|list| {
            let nomination = &list_candidate_nomination
                .iter()
                .find(|nomination| nomination.list_number == list.number())
                .expect("List candidate nomination should exist");

            let is_nominated = |candidate: &&T::Cv| {
                nomination
                    .preferential_candidate_nomination
                    .iter()
                    .chain(&nomination.other_candidate_nomination)
                    .any(|cv| cv.number() == candidate.number())
            };

            list.candidate_votes()
                .iter()
                .filter(is_nominated)
                .map(|candidate| Candidate {
                    list_number: list.number(),
                    candidate_number: candidate.number(),
                })
        })
        .collect()
}

fn filter_out_deceased_candidates<'a, T: ListVotes>(
    list: &'a T,
    deceased_candidates: &'a DeceasedCandidates<T>,
) -> Vec<&'a T::Cv> {
    list.candidate_votes()
        .iter()
        .filter(|cv| {
            !deceased_candidates
                .get(&list.number())
                .is_some_and(|candidates| candidates.contains(&cv.number()))
        })
        .collect()
}

enum ListCandidateNominations<'a, LV: ListVotes> {
    Completed(Vec<ListCandidateNomination<'a, LV>>),
    DrawingLotsRequired(CandidateDrawingLotsVariant<ListNumber<LV>, CandidateNumber<LV>>),
}

/// This function nominates candidates for the seats each list has been assigned.
/// The candidate nomination is first done based on preferential votes and then the other
/// candidates are nominated.
#[expect(clippy::too_many_lines)]
fn candidate_nomination_per_list<'a, LV: ListVotes>(
    input: &CandidateNominationInput<'a, LV>,
    preference_threshold: Fraction,
    mut candidates_drawn: impl Iterator<
        Item = &'a (impl CandidateDrawn<ListNumber<LV>, CandidateNumber<LV>> + 'a),
    >,
) -> Result<ListCandidateNominations<'a, LV>, ApportionmentError> {
    let mut list_candidate_nomination: Vec<ListCandidateNomination<LV>> = vec![];
    for list in input.list_votes {
        let total_seats = input
            .total_seats_per_list
            .get(&list.number())
            .expect("Total seats exists")
            .to_owned();

        info!(
            "Deceased candidates: {:?} will be filtered out for list {:?}",
            input.deceased_candidates.get(&list.number()),
            list.number()
        );

        let candidate_votes = &filter_out_deceased_candidates(list, input.deceased_candidates);

        let candidate_votes_meeting_preference_threshold =
            candidate_votes_meeting_preference_threshold(preference_threshold, candidate_votes);
        let preferential_candidate_nomination = match preferential_candidate_nomination::<LV>(
            list.number(),
            &candidate_votes_meeting_preference_threshold,
            total_seats,
            &mut candidates_drawn,
        )? {
            PreferentialCandidateNomination::Completed(nomination) => nomination,
            PreferentialCandidateNomination::DrawingLotsRequired(variant) => {
                return Ok(ListCandidateNominations::DrawingLotsRequired(variant));
            }
        };
        let non_assigned_seats = total_seats as usize - preferential_candidate_nomination.len();

        // [Artikel P 17 Kieswet](https://wetten.overheid.nl/BWBR0004627/2026-01-01/#AfdelingII_HoofdstukP_Paragraaf3_ArtikelP17)
        let other_candidate_nomination = other_candidate_nomination(
            &preferential_candidate_nomination,
            candidate_votes,
            non_assigned_seats,
        );

        // Determine original ranking of candidates, used to determine if the ranking was changed
        let original_ranking = list
            .candidate_votes()
            .iter()
            .map(|cv| cv.number())
            .collect::<Vec<_>>();

        // [Artikel P 19 Kieswet](https://wetten.overheid.nl/BWBR0004627/2026-01-01/#AfdelingII_HoofdstukP_Paragraaf3_ArtikelP19)
        let candidate_ranking = if input.deceased_candidates.get(&list.number()).is_none()
            && (candidate_votes_meeting_preference_threshold.is_empty()
                || (input.number_of_seats >= LARGE_COUNCIL_THRESHOLD && total_seats == 0))
        {
            CandidateRanking::Original(original_ranking)
        } else {
            let updated_ranking = update_candidate_ranking(
                &preferential_candidate_nomination,
                &candidate_votes_meeting_preference_threshold,
                candidate_votes,
            );

            // If the updated candidate ranking is the same as the original candidate list,
            // return an empty list, otherwise return the updated list
            // Note: we base this on the original list, so if there are deceased candidates, the ranking is always updated
            if updated_ranking == original_ranking {
                CandidateRanking::Original(original_ranking)
            } else {
                CandidateRanking::Updated(updated_ranking)
            }
        };

        list_candidate_nomination.push(ListCandidateNomination {
            list_number: list.number(),
            list_seats: total_seats,
            preferential_candidate_nomination,
            other_candidate_nomination,
            candidate_ranking,
        });
    }
    Ok(ListCandidateNominations::Completed(
        list_candidate_nomination,
    ))
}

/// List and sort the candidate votes whose votes meet the preference threshold
/// Only candidates which are above (>) the threshold are included
fn candidate_votes_meeting_preference_threshold<'a, T: CandidateVotes>(
    preference_threshold: Fraction,
    candidate_votes: &[&'a T],
) -> Vec<&'a T> {
    let mut candidates_meeting_preference_threshold: Vec<&'a T> = candidate_votes
        .iter()
        .filter(|candidate_votes| Fraction::from(candidate_votes.votes()) > preference_threshold)
        .copied()
        .collect();
    candidates_meeting_preference_threshold.sort_by_key(|b| std::cmp::Reverse(b.votes()));
    candidates_meeting_preference_threshold
}

/// Create a vector containing just the candidate numbers from an iterator of candidate votes
pub fn candidate_votes_numbers<T: CandidateVotes>(
    candidate_votes: &[&T],
) -> Vec<T::CandidateNumber> {
    candidate_votes
        .iter()
        .map(|candidate| candidate.number())
        .collect()
}

/// List the other candidates nominated
fn other_candidate_nomination<'a, T: CandidateVotes>(
    preferential_candidate_nomination: &[&T],
    candidate_votes: &[&'a T],
    non_assigned_seats: usize,
) -> Vec<&'a T> {
    if non_assigned_seats == 0 {
        return vec![];
    }

    candidate_votes
        .iter()
        .filter(|candidate_votes| !preferential_candidate_nomination.contains(candidate_votes))
        .copied()
        .take(non_assigned_seats)
        .collect()
}

#[derive(Debug)]
enum PreferentialCandidateNomination<'a, LV: ListVotes> {
    Completed(Vec<&'a LV::Cv>),
    DrawingLotsRequired(CandidateDrawingLotsVariant<ListNumber<LV>, CandidateNumber<LV>>),
}

/// List the candidates nominated with preferential votes
/// * list - List number
/// * candidates - Candidates that meet the preference_threshold,
///   sorted by votes descending then by candidate number
/// * total_seats - Total number of seats for this list
/// * candidates_drawn - Iterator with candidate drawing lots
fn preferential_candidate_nomination<'a, LV: ListVotes>(
    list: LV::ListNumber,
    candidates: &[&'a LV::Cv],
    total_seats: u32,
    candidates_drawn: &mut impl Iterator<
        Item = &'a (impl CandidateDrawn<ListNumber<LV>, CandidateNumber<LV>> + 'a),
    >,
) -> Result<PreferentialCandidateNomination<'a, LV>, ApportionmentError> {
    if candidates.len() <= total_seats as usize {
        // All candidates can be nominated
        return Ok(PreferentialCandidateNomination::Completed(
            candidates.to_vec(),
        ));
    }

    // Loop over all seats one by one, keeping track of how many seats are remaining
    let mut nomination: Vec<&LV::Cv> = vec![];
    for (index, seats_remaining) in (1..=total_seats).rev().enumerate() {
        // Get all candidates with the same number of votes, that have not been nominated yet
        let same_votes_candidates_remaining: Vec<&LV::Cv> = candidates
            .iter()
            .copied()
            .filter(|cv| !nomination.contains(cv) && cv.votes() == candidates[index].votes())
            .collect();

        // Check if we can nominate all these candidates, else we draw lots
        if same_votes_candidates_remaining.len() <= seats_remaining as usize {
            nomination.push(candidates[index]);
        } else {
            let options = candidate_votes_numbers(&same_votes_candidates_remaining);
            info!(
                "Drawing of lots is required for candidates: {options:?}, only {seats_remaining} seat(s) available",
            );

            let current_seat_number = index + 1;
            let nr_of_seats = options.len().min(seats_remaining as usize);
            let seat_numbers = (current_seat_number..current_seat_number + nr_of_seats)
                .map(|n| u32::try_from(n).expect("should fit in u32"))
                .collect();

            let variant = CandidateDrawingLotsVariant {
                list,
                total_seats,
                number_of_votes: same_votes_candidates_remaining[0].votes(),
                seat_numbers,
                options,
            };

            let Some(candidate_drawn) = candidates_drawn.next() else {
                return Ok(PreferentialCandidateNomination::DrawingLotsRequired(
                    variant,
                ));
            };

            variant.validate(candidate_drawn)?;

            let candidate = same_votes_candidates_remaining
                .iter()
                .find(|c| c.number() == *candidate_drawn.drawn())
                .ok_or(ApportionmentError::InvalidLotDrawing(
                    "Could not find candidate".to_string(),
                ))?;

            nomination.push(candidate);
        }
    }
    Ok(PreferentialCandidateNomination::Completed(nomination))
}

/// Update the candidate list, moving the candidates meeting the preference threshold
/// to the top of the list and keeping the ranking of the rest of candidates on the list the same
fn update_candidate_ranking<T: CandidateVotes>(
    preferential_candidate_nomination: &[&T],
    candidate_votes_meeting_preference_threshold: &[&T],
    candidate_votes: &[&T],
) -> Vec<T::CandidateNumber> {
    let mut updated_candidate_ranking: Vec<T::CandidateNumber> = vec![];
    // First add the nominated candidates to the top of the ranking
    for candidate_votes in preferential_candidate_nomination {
        updated_candidate_ranking.push(candidate_votes.number());
    }

    // Add the remaining candidates meeting preference threshold to the updated ranking
    for candidate_votes in candidate_votes_meeting_preference_threshold {
        if !updated_candidate_ranking.contains(&candidate_votes.number()) {
            updated_candidate_ranking.push(candidate_votes.number());
        }
    }

    // Add the remaining candidates in the order of the original candidate list
    for candidate_votes in candidate_votes {
        if !updated_candidate_ranking.contains(&candidate_votes.number()) {
            updated_candidate_ranking.push(candidate_votes.number());
        }
    }

    updated_candidate_ranking
}

#[cfg(test)]
#[allow(clippy::too_many_lines)]
mod tests {
    use std::{
        collections::{HashMap, HashSet},
        iter,
    };

    use test_log::test;

    use super::*;
    use crate::test_helpers::*;

    mod all_chosen_candidates {
        use crate::{
            Candidate, CandidateRanking, ListCandidateNomination,
            candidate_nomination::all_chosen_candidates, test_helpers::ListVotesMock,
        };

        #[test]
        fn test_combines_preferential_and_other_nominations() {
            let lists = [
                ListVotesMock::from_test_data_auto(1, vec![100, 50, 25]),
                ListVotesMock::from_test_data_auto(2, vec![80, 40]),
            ];
            let nominations = vec![
                ListCandidateNomination {
                    list_number: 1,
                    list_seats: 2,
                    preferential_candidate_nomination: vec![&lists[0].candidate_votes[0]],
                    other_candidate_nomination: vec![&lists[0].candidate_votes[2]],
                    candidate_ranking: CandidateRanking::Original(vec![1, 2, 3]),
                },
                ListCandidateNomination {
                    list_number: 2,
                    list_seats: 1,
                    preferential_candidate_nomination: vec![&lists[1].candidate_votes[1]],
                    other_candidate_nomination: vec![],
                    candidate_ranking: CandidateRanking::Original(vec![1, 2]),
                },
            ];

            assert_eq!(
                all_chosen_candidates(&lists, &nominations),
                vec![
                    Candidate {
                        list_number: 1,
                        candidate_number: 1,
                    },
                    Candidate {
                        list_number: 1,
                        candidate_number: 3,
                    },
                    Candidate {
                        list_number: 2,
                        candidate_number: 2,
                    },
                ]
            );
        }

        #[test]
        fn test_returns_candidates_in_list_order() {
            let lists = [ListVotesMock::from_test_data_auto(1, vec![100, 50, 25])];
            let nominations = vec![ListCandidateNomination {
                list_number: 1,
                list_seats: 2,
                preferential_candidate_nomination: vec![
                    &lists[0].candidate_votes[2],
                    &lists[0].candidate_votes[0],
                ],
                other_candidate_nomination: vec![&lists[0].candidate_votes[1]],
                candidate_ranking: CandidateRanking::Updated(vec![3, 1, 2]),
            }];

            assert_eq!(
                all_chosen_candidates(&lists, &nominations),
                vec![
                    Candidate {
                        list_number: 1,
                        candidate_number: 1,
                    },
                    Candidate {
                        list_number: 1,
                        candidate_number: 2,
                    },
                    Candidate {
                        list_number: 1,
                        candidate_number: 3,
                    },
                ]
            );
        }

        #[test]
        fn test_returns_empty_when_no_nominations() {
            let lists = [ListVotesMock::from_test_data_auto(1, vec![100, 50])];
            let nominations = vec![ListCandidateNomination {
                list_number: 1,
                list_seats: 0,
                preferential_candidate_nomination: vec![],
                other_candidate_nomination: vec![],
                candidate_ranking: CandidateRanking::Original(vec![1, 2]),
            }];

            assert_eq!(all_chosen_candidates(&lists, &nominations), vec![]);
        }

        #[test]
        #[should_panic(expected = "List candidate nomination should exist")]
        fn test_panics_when_nomination_is_missing_for_a_list() {
            let lists = [ListVotesMock::from_test_data_auto(1, vec![100])];

            all_chosen_candidates::<ListVotesMock>(&lists, &[]);
        }
    }

    #[test]
    fn test_filter_out_deceased_candidates() {
        let deceased_candidates: DeceasedCandidates<ListVotesMock> =
            HashMap::from([(1, HashSet::from([1, 3])), (2, HashSet::from([2]))]);
        let list = ListVotesMock::from_test_data_auto(1, vec![100, 80, 60, 40, 20]);
        let filtered_candidate_votes = filter_out_deceased_candidates(&list, &deceased_candidates);
        assert_eq!(
            filtered_candidate_votes,
            vec![
                &list.candidate_votes()[1],
                &list.candidate_votes()[3],
                &list.candidate_votes()[4]
            ]
        );
    }

    mod candidate_votes_meeting_preference_threshold {
        use crate::{
            Fraction,
            candidate_nomination::{
                candidate_votes_meeting_preference_threshold, candidate_votes_numbers,
            },
            test_helpers::CandidateVotesMock,
        };

        #[test]
        fn test_excludes_candidates_with_votes_at_or_below_the_threshold() {
            let candidate_votes: Vec<_> = [
                CandidateVotesMock(1, 51),
                CandidateVotesMock(2, 50),
                CandidateVotesMock(3, 49),
            ]
            .iter()
            .collect();

            let meeting = candidate_votes_meeting_preference_threshold(
                Fraction::new(50, 1),
                &candidate_votes,
            );
            assert_eq!(candidate_votes_numbers(&meeting), vec![1]);
        }

        #[test]
        fn test_sorts_candidates_by_votes_descending() {
            let candidate_votes: Vec<_> = [
                CandidateVotesMock(1, 60),
                CandidateVotesMock(2, 100),
                CandidateVotesMock(3, 80),
            ]
            .iter()
            .collect();

            let meeting = candidate_votes_meeting_preference_threshold(
                Fraction::new(50, 1),
                &candidate_votes,
            );
            assert_eq!(candidate_votes_numbers(&meeting), vec![2, 3, 1]);
        }

        #[test]
        fn test_keeps_candidate_order_for_equal_votes() {
            let candidate_votes: Vec<_> = [
                CandidateVotesMock(1, 80),
                CandidateVotesMock(2, 100),
                CandidateVotesMock(3, 80),
            ]
            .iter()
            .collect();

            // Candidates 1 and 3 have equal votes, so they keep their relative order
            let meeting = candidate_votes_meeting_preference_threshold(
                Fraction::new(50, 1),
                &candidate_votes,
            );
            assert_eq!(candidate_votes_numbers(&meeting), vec![2, 1, 3]);
        }

        #[test]
        fn test_returns_empty_when_no_candidate_meets_the_threshold() {
            let candidate_votes: Vec<_> = [CandidateVotesMock(1, 10), CandidateVotesMock(2, 0)]
                .iter()
                .collect();

            let meeting = candidate_votes_meeting_preference_threshold(
                Fraction::new(50, 1),
                &candidate_votes,
            );
            assert!(meeting.is_empty());
        }
    }

    #[test]
    fn test_candidate_votes_numbers() {
        let candidate_votes: Vec<_> = [
            CandidateVotesMock(3, 100),
            CandidateVotesMock(1, 80),
            CandidateVotesMock(7, 60),
        ]
        .iter()
        .collect();

        assert_eq!(candidate_votes_numbers(&candidate_votes), vec![3, 1, 7]);
    }

    mod other_candidate_nomination {
        use crate::{
            candidate_nomination::{candidate_votes_numbers, other_candidate_nomination},
            test_helpers::CandidateVotesMock,
        };

        #[test]
        fn test_nominates_remaining_candidates() {
            let candidate_votes: Vec<_> = [
                CandidateVotesMock(1, 100),
                CandidateVotesMock(2, 20),
                CandidateVotesMock(3, 80),
                CandidateVotesMock(4, 10),
            ]
            .iter()
            .collect();
            let preferential_nomination = vec![candidate_votes[0], candidate_votes[2]];

            let other = other_candidate_nomination(&preferential_nomination, &candidate_votes, 2);
            assert_eq!(candidate_votes_numbers(&other), vec![2, 4]);
        }

        #[test]
        fn test_returns_empty_when_all_candidates_are_preferentially_nominated() {
            let candidate_votes: Vec<_> = [CandidateVotesMock(1, 100), CandidateVotesMock(2, 20)]
                .iter()
                .collect();
            let preferential_nomination = vec![candidate_votes[0], candidate_votes[1]];

            let other = other_candidate_nomination(&preferential_nomination, &candidate_votes, 2);
            assert_eq!(candidate_votes_numbers(&other), vec![]);
        }

        #[test]
        fn test_takes_no_more_candidates_than_non_assigned_seats() {
            let candidate_votes: Vec<_> = [
                CandidateVotesMock(1, 50),
                CandidateVotesMock(2, 40),
                CandidateVotesMock(3, 30),
            ]
            .iter()
            .collect();

            let other = other_candidate_nomination::<CandidateVotesMock>(&[], &candidate_votes, 2);
            assert_eq!(candidate_votes_numbers(&other), vec![1, 2]);
        }

        #[test]
        fn test_returns_empty_when_no_non_assigned_seats() {
            let candidate_votes: Vec<_> = [CandidateVotesMock(1, 50), CandidateVotesMock(2, 40)]
                .iter()
                .collect();
            let preferential_nomination = vec![candidate_votes[0]];

            let other = other_candidate_nomination(&preferential_nomination, &candidate_votes, 0);
            assert!(other.is_empty());
        }

        #[test]
        fn test_returns_all_remaining_candidates_when_seats_exceed_candidates() {
            let candidate_votes: Vec<_> = [
                CandidateVotesMock(1, 50),
                CandidateVotesMock(2, 40),
                CandidateVotesMock(3, 30),
            ]
            .iter()
            .collect();
            let preferential_nomination = vec![candidate_votes[0]];

            let other = other_candidate_nomination(&preferential_nomination, &candidate_votes, 5);
            assert_eq!(candidate_votes_numbers(&other), vec![2, 3]);
        }
    }

    mod lt_19_seats {
        use std::{collections::HashSet, iter};

        use crate::{
            CandidateNomination, Fraction,
            candidate_nomination::candidate_nomination,
            test_helpers::{
                CandidateDrawnMock,
                candidate_nomination_fixture_with_given_list_numbers_and_number_of_seats,
                candidate_nomination_fixture_with_given_number_of_seats, check_chosen_candidates,
                check_list_candidate_nomination,
                seat_assignment_fixture_with_given_candidate_votes,
                seat_assignment_fixture_with_given_list_numbers_candidate_numbers_and_votes,
            },
        };

        /// Candidate nomination with non-consecutive list and candidate numbers
        ///
        /// List seats: [(1, 8), (2, 3), (4, 2), (5, 1), (7, 1)]
        /// - List 1: Preferential candidate nominations of candidates 1, 4, 3, 5 and 12 and other candidate nominations of candidates 7, 8 and 9
        /// - List 2: Preferential candidate nomination of candidate 2 and 6 and other candidate nomination of candidates 3
        /// - List 3: Preferential candidate nomination of candidate 1 and 4 and no other candidate nominations
        /// - List 4: Preferential candidate nomination of candidate 1 and no other candidate nominations
        /// - List 5: Preferential candidate nomination of candidate 3 and no other candidate nominations
        #[test]
        fn test_with_lt_19_seats_and_non_consecutive_list_and_candidate_numbers() {
            let quota = Fraction::new(5104, 15);
            let seat_assignment_input =
                seat_assignment_fixture_with_given_list_numbers_candidate_numbers_and_votes(
                    15,
                    vec![
                        (
                            1,
                            vec![
                                (1, 1069),
                                (3, 303),
                                (4, 321),
                                (5, 210),
                                (7, 36),
                                (8, 101),
                                (9, 79),
                                (10, 121),
                                (11, 150),
                                (12, 181),
                            ],
                        ),
                        (2, vec![(2, 452), (3, 39), (4, 81), (6, 274), (7, 131)]),
                        (4, vec![(1, 229), (2, 147), (4, 191)]),
                        (5, vec![(1, 347), (3, 189)]),
                        (7, vec![(3, 266), (2, 187)]),
                    ],
                );
            let input = candidate_nomination_fixture_with_given_list_numbers_and_number_of_seats(
                quota,
                &seat_assignment_input,
                [(1, 8), (2, 3), (4, 2), (5, 1), (7, 1)].into(),
            );

            let Ok(CandidateNomination::Completed(result)) =
                candidate_nomination(&input, &mut iter::empty::<&CandidateDrawnMock>())
            else {
                panic!("should be completed");
            };

            assert_eq!(result.preference_threshold.percentage, 50);
            assert_eq!(
                result.preference_threshold.number_of_votes,
                quota * Fraction::new(result.preference_threshold.percentage, 100)
            );
            check_list_candidate_nomination(
                &result.list_candidate_nomination[0],
                &[1, 4, 3, 5, 12],
                &[7, 8, 9],
                &[1, 4, 3, 5, 12, 7, 8, 9, 10, 11],
            );
            check_list_candidate_nomination(
                &result.list_candidate_nomination[1],
                &[2, 6],
                &[3],
                &[2, 6, 3, 4, 7],
            );
            check_list_candidate_nomination(
                &result.list_candidate_nomination[2],
                &[1, 4],
                &[],
                &[1, 4, 2],
            );
            check_list_candidate_nomination(&result.list_candidate_nomination[3], &[1], &[], &[]);
            check_list_candidate_nomination(&result.list_candidate_nomination[4], &[3], &[], &[]);

            check_chosen_candidates(
                &result.chosen_candidates,
                input.list_votes[0].number,
                &[
                    &input.list_votes[0].candidate_votes[..7],
                    &input.list_votes[0].candidate_votes[10..],
                ]
                .concat(),
                &input.list_votes[0].candidate_votes[8..9],
            );
            check_chosen_candidates(
                &result.chosen_candidates,
                input.list_votes[1].number,
                &[
                    &input.list_votes[1].candidate_votes[..2],
                    &input.list_votes[1].candidate_votes[3..4],
                ]
                .concat(),
                &[
                    &input.list_votes[1].candidate_votes[2..3],
                    &input.list_votes[1].candidate_votes[4..],
                ]
                .concat(),
            );
            check_chosen_candidates(
                &result.chosen_candidates,
                input.list_votes[2].number,
                &[
                    &input.list_votes[2].candidate_votes[..1],
                    &input.list_votes[2].candidate_votes[2..],
                ]
                .concat(),
                &input.list_votes[2].candidate_votes[1..2],
            );
            check_chosen_candidates(
                &result.chosen_candidates,
                input.list_votes[3].number,
                &input.list_votes[3].candidate_votes[..1],
                &input.list_votes[3].candidate_votes[2..],
            );
            check_chosen_candidates(
                &result.chosen_candidates,
                input.list_votes[4].number,
                &input.list_votes[4].candidate_votes[..1],
                &input.list_votes[4].candidate_votes[2..],
            );
        }

        /// Candidate nomination with ranking change due to preferential candidate nomination
        ///
        /// Actual case from GR2022
        /// List seats: [8, 3, 2, 1, 1]
        /// - List 1: Preferential candidate nominations of candidates 1, 3, 2 and 4 and other candidate nominations of candidates 5, 6, 7 and 8
        /// - List 2: Preferential candidate nomination of candidate 1 and other candidate nomination of candidates 2 and 3
        /// - List 3: Preferential candidate nomination of candidate 1 and other candidate nomination of candidate 2
        /// - List 4: Preferential candidate nomination of candidate 1 and no other candidate nominations
        /// - List 5: Preferential candidate nomination of candidate 1 and no other candidate nominations
        #[test]
        fn test_with_lt_19_seats_and_preferential_candidate_nomination_and_updated_candidate_ranking()
         {
            let quota = Fraction::new(5104, 15);
            let seat_assignment_input = seat_assignment_fixture_with_given_candidate_votes(
                15,
                vec![
                    vec![1069, 303, 321, 210, 36, 101, 79, 121, 150, 149, 15, 17],
                    vec![
                        452, 39, 81, 76, 35, 109, 29, 25, 17, 6, 18, 9, 25, 30, 5, 18, 3,
                    ],
                    vec![229, 63, 65, 9, 10, 58, 29, 50, 6, 11, 37],
                    vec![347, 33, 14, 82, 30, 30],
                    vec![266, 36, 39, 36, 38, 38],
                ],
            );
            let input = candidate_nomination_fixture_with_given_number_of_seats(
                quota,
                &seat_assignment_input,
                vec![8, 3, 2, 1, 1],
            );
            let Ok(CandidateNomination::Completed(result)) =
                candidate_nomination(&input, &mut iter::empty::<&CandidateDrawnMock>())
            else {
                panic!("should be completed");
            };

            assert_eq!(result.preference_threshold.percentage, 50);
            assert_eq!(
                result.preference_threshold.number_of_votes,
                quota * Fraction::new(result.preference_threshold.percentage, 100)
            );
            check_list_candidate_nomination(
                &result.list_candidate_nomination[0],
                &[1, 3, 2, 4],
                &[5, 6, 7, 8],
                &[1, 3, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12],
            );
            check_list_candidate_nomination(
                &result.list_candidate_nomination[1],
                &[1],
                &[2, 3],
                &[],
            );
            check_list_candidate_nomination(&result.list_candidate_nomination[2], &[1], &[2], &[]);
            check_list_candidate_nomination(&result.list_candidate_nomination[3], &[1], &[], &[]);
            check_list_candidate_nomination(&result.list_candidate_nomination[4], &[1], &[], &[]);

            check_chosen_candidates(
                &result.chosen_candidates,
                input.list_votes[0].number,
                &input.list_votes[0].candidate_votes[..8],
                &input.list_votes[0].candidate_votes[9..],
            );
            check_chosen_candidates(
                &result.chosen_candidates,
                input.list_votes[1].number,
                &input.list_votes[1].candidate_votes[..3],
                &input.list_votes[1].candidate_votes[4..],
            );
            check_chosen_candidates(
                &result.chosen_candidates,
                input.list_votes[2].number,
                &input.list_votes[2].candidate_votes[..2],
                &input.list_votes[2].candidate_votes[3..],
            );
            check_chosen_candidates(
                &result.chosen_candidates,
                input.list_votes[3].number,
                &input.list_votes[3].candidate_votes[..1],
                &input.list_votes[3].candidate_votes[2..],
            );
            check_chosen_candidates(
                &result.chosen_candidates,
                input.list_votes[4].number,
                &input.list_votes[4].candidate_votes[..1],
                &input.list_votes[4].candidate_votes[2..],
            );
        }

        /// Candidate nomination with ranking change due to preferential candidate nomination and deceased candidates
        ///
        /// Actual case from GR2022 (excluding the deceased candidates)
        /// List seats: [8, 3, 2, 1, 1]
        /// - List 1: Preferential candidate nominations of candidates 1, 3, 2 and 4 and other candidate nominations of candidates 5, 6, 7 and 8
        /// - List 2: Preferential candidate nomination of candidate 1 and other candidate nomination of candidates 2 and 3
        /// - List 3: Preferential candidate nomination of candidate 1 and other candidate nomination of candidate 2
        /// - List 4: Preferential candidate nomination of candidate 1 and no other candidate nominations
        /// - List 5: Preferential candidate nomination of candidate 1 and no other candidate nominations
        #[test]
        fn test_with_lt_19_seats_and_preferential_candidate_nomination_and_deceased_candidates() {
            let quota = Fraction::new(5104, 15);
            let mut seat_assignment_input = seat_assignment_fixture_with_given_candidate_votes(
                15,
                vec![
                    vec![1069, 303, 321, 210, 36, 101, 79, 121, 150, 149, 15, 17],
                    vec![
                        452, 39, 81, 76, 35, 109, 29, 25, 17, 6, 18, 9, 25, 30, 5, 18, 3,
                    ],
                    vec![229, 63, 65, 9, 10, 58, 29, 50, 6, 11, 37],
                    vec![347, 33, 14, 82, 30, 30],
                    vec![266, 36, 39, 36, 38, 38],
                ],
            );
            seat_assignment_input
                .deceased_candidates
                .insert(2, HashSet::from([3]));
            let input = candidate_nomination_fixture_with_given_number_of_seats(
                quota,
                &seat_assignment_input,
                vec![8, 3, 2, 1, 1],
            );
            let Ok(CandidateNomination::Completed(result)) =
                candidate_nomination(&input, &mut iter::empty::<&CandidateDrawnMock>())
            else {
                panic!("should be completed");
            };

            assert_eq!(result.preference_threshold.percentage, 50);
            assert_eq!(
                result.preference_threshold.number_of_votes,
                quota * Fraction::new(result.preference_threshold.percentage, 100)
            );
            check_list_candidate_nomination(
                &result.list_candidate_nomination[0],
                &[1, 3, 2, 4],
                &[5, 6, 7, 8],
                &[1, 3, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12],
            );
            check_list_candidate_nomination(
                &result.list_candidate_nomination[1],
                &[1],
                &[2, 4], // Instead of [2, 3]
                &[1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
            );
            check_list_candidate_nomination(&result.list_candidate_nomination[2], &[1], &[2], &[]);
            check_list_candidate_nomination(&result.list_candidate_nomination[3], &[1], &[], &[]);
            check_list_candidate_nomination(&result.list_candidate_nomination[4], &[1], &[], &[]);

            check_chosen_candidates(
                &result.chosen_candidates,
                input.list_votes[0].number,
                &input.list_votes[0].candidate_votes[..8],
                &input.list_votes[0].candidate_votes[9..],
            );
            check_chosen_candidates(
                &result.chosen_candidates,
                input.list_votes[1].number,
                &[
                    &input.list_votes[1].candidate_votes[..2],
                    &input.list_votes[1].candidate_votes[3..4],
                ]
                .concat(),
                &[
                    &input.list_votes[1].candidate_votes[2..3],
                    &input.list_votes[1].candidate_votes[4..],
                ]
                .concat(),
            );
            check_chosen_candidates(
                &result.chosen_candidates,
                input.list_votes[2].number,
                &input.list_votes[2].candidate_votes[..2],
                &input.list_votes[2].candidate_votes[3..],
            );
            check_chosen_candidates(
                &result.chosen_candidates,
                input.list_votes[3].number,
                &input.list_votes[3].candidate_votes[..1],
                &input.list_votes[3].candidate_votes[2..],
            );
            check_chosen_candidates(
                &result.chosen_candidates,
                input.list_votes[4].number,
                &input.list_votes[4].candidate_votes[..1],
                &input.list_votes[4].candidate_votes[2..],
            );
        }

        /// Candidate nomination with no preferential candidate nomination
        ///
        /// List seats: [1, 1, 1, 1, 1]
        /// - List 1: No preferential candidate nominations and other candidate nomination of candidate 1
        /// - List 2: No preferential candidate nominations and other candidate nomination of candidate 1
        /// - List 3: No preferential candidate nominations and other candidate nomination of candidate 1
        /// - List 4: No preferential candidate nominations and other candidate nomination of candidate 1
        /// - List 5: No preferential candidate nominations and other candidate nomination of candidate 1
        #[test]
        fn test_with_lt_19_seats_and_no_preferential_candidate_nomination() {
            let quota = Fraction::new(105, 5);
            let seat_assignment_input = seat_assignment_fixture_with_given_candidate_votes(
                5,
                vec![
                    vec![5, 4, 4, 4, 4],
                    vec![4, 5, 4, 4, 4],
                    vec![4, 4, 5, 4, 4],
                    vec![4, 4, 4, 5, 4],
                    vec![4, 4, 4, 4, 5],
                ],
            );
            let input = candidate_nomination_fixture_with_given_number_of_seats(
                quota,
                &seat_assignment_input,
                vec![1, 1, 1, 1, 1],
            );
            let Ok(CandidateNomination::Completed(result)) =
                candidate_nomination(&input, &mut iter::empty::<&CandidateDrawnMock>())
            else {
                panic!("should be completed");
            };

            assert_eq!(result.preference_threshold.percentage, 50);
            assert_eq!(
                result.preference_threshold.number_of_votes,
                quota * Fraction::new(result.preference_threshold.percentage, 100)
            );
            check_list_candidate_nomination(&result.list_candidate_nomination[0], &[], &[1], &[]);
            check_list_candidate_nomination(&result.list_candidate_nomination[1], &[], &[1], &[]);
            check_list_candidate_nomination(&result.list_candidate_nomination[2], &[], &[1], &[]);
            check_list_candidate_nomination(&result.list_candidate_nomination[3], &[], &[1], &[]);
            check_list_candidate_nomination(&result.list_candidate_nomination[4], &[], &[1], &[]);

            check_chosen_candidates(
                &result.chosen_candidates,
                input.list_votes[0].number,
                &input.list_votes[0].candidate_votes[..1],
                &input.list_votes[0].candidate_votes[2..],
            );
            check_chosen_candidates(
                &result.chosen_candidates,
                input.list_votes[1].number,
                &input.list_votes[1].candidate_votes[..1],
                &input.list_votes[1].candidate_votes[2..],
            );
            check_chosen_candidates(
                &result.chosen_candidates,
                input.list_votes[2].number,
                &input.list_votes[2].candidate_votes[..1],
                &input.list_votes[2].candidate_votes[2..],
            );
            check_chosen_candidates(
                &result.chosen_candidates,
                input.list_votes[3].number,
                &input.list_votes[3].candidate_votes[..1],
                &input.list_votes[3].candidate_votes[2..],
            );
            check_chosen_candidates(
                &result.chosen_candidates,
                input.list_votes[4].number,
                &input.list_votes[4].candidate_votes[..1],
                &input.list_votes[4].candidate_votes[2..],
            );
        }

        /// Candidate nomination with no preferential candidate nomination and deceased candidates
        ///
        /// List seats: [1, 1, 1, 1, 1]
        /// - List 1: No preferential candidate nominations and other candidate nomination of candidate 1
        /// - List 2: No preferential candidate nominations and other candidate nomination of candidate 1
        /// - List 3: No preferential candidate nominations and other candidate nomination of candidate 1
        /// - List 4: No preferential candidate nominations and other candidate nomination of candidate 1
        /// - List 5: No preferential candidate nominations and other candidate nomination of candidate 1
        #[test]
        fn test_with_lt_19_seats_and_no_preferential_candidate_nomination_and_deceased_candidates()
        {
            let quota = Fraction::new(105, 5);
            let mut seat_assignment_input = seat_assignment_fixture_with_given_candidate_votes(
                5,
                vec![
                    vec![5, 4, 4, 4, 4],
                    vec![4, 5, 4, 4, 4],
                    vec![4, 4, 5, 4, 4],
                    vec![4, 4, 4, 5, 4],
                    vec![4, 4, 4, 4, 5],
                ],
            );
            seat_assignment_input
                .deceased_candidates
                .insert(1, HashSet::from([1]));

            let input = candidate_nomination_fixture_with_given_number_of_seats(
                quota,
                &seat_assignment_input,
                vec![1, 1, 1, 1, 1],
            );
            let Ok(CandidateNomination::Completed(result)) =
                candidate_nomination(&input, &mut iter::empty::<&CandidateDrawnMock>())
            else {
                panic!("should be completed");
            };

            assert_eq!(result.preference_threshold.percentage, 50);
            assert_eq!(
                result.preference_threshold.number_of_votes,
                quota * Fraction::new(result.preference_threshold.percentage, 100)
            );
            check_list_candidate_nomination(
                &result.list_candidate_nomination[0],
                &[],
                &[2],
                &[2, 3, 4, 5],
            );
            check_list_candidate_nomination(&result.list_candidate_nomination[1], &[], &[1], &[]);
            check_list_candidate_nomination(&result.list_candidate_nomination[2], &[], &[1], &[]);
            check_list_candidate_nomination(&result.list_candidate_nomination[3], &[], &[1], &[]);
            check_list_candidate_nomination(&result.list_candidate_nomination[4], &[], &[1], &[]);

            check_chosen_candidates(
                &result.chosen_candidates,
                input.list_votes[0].number,
                &input.list_votes[0].candidate_votes[1..2],
                &[
                    &input.list_votes[0].candidate_votes[0..1],
                    &input.list_votes[0].candidate_votes[2..],
                ]
                .concat(),
            );
            check_chosen_candidates(
                &result.chosen_candidates,
                input.list_votes[1].number,
                &input.list_votes[1].candidate_votes[..1],
                &input.list_votes[1].candidate_votes[2..],
            );
            check_chosen_candidates(
                &result.chosen_candidates,
                input.list_votes[2].number,
                &input.list_votes[2].candidate_votes[..1],
                &input.list_votes[2].candidate_votes[2..],
            );
            check_chosen_candidates(
                &result.chosen_candidates,
                input.list_votes[3].number,
                &input.list_votes[3].candidate_votes[..1],
                &input.list_votes[3].candidate_votes[2..],
            );
            check_chosen_candidates(
                &result.chosen_candidates,
                input.list_votes[4].number,
                &input.list_votes[4].candidate_votes[..1],
                &input.list_votes[4].candidate_votes[2..],
            );
        }

        /// Candidate nomination with candidate votes meeting preference threshold but no seat
        ///
        /// List seats: [11, 7, 0]
        /// - List 1: Preferential candidate nominations of candidates 1, 2, 3, 4, 5, 6 and 7 and other candidate nominations of candidates 8, 9, 10 and 11
        /// - List 2: Preferential candidate nominations of candidates 1, 2, 3 and 4 and other candidate nominations of candidates 5, 6 and 7
        /// - List 3: No preferential candidate nominations and no other candidate nomination
        #[test]
        fn test_with_lt_19_seats_and_candidate_votes_meeting_preference_threshold_but_no_seat() {
            let quota = Fraction::new(570, 18);
            let seat_assignment_input = seat_assignment_fixture_with_given_candidate_votes(
                18,
                vec![
                    vec![80, 70, 60, 50, 40, 30, 20, 0, 0, 0, 0, 0],
                    vec![80, 60, 40, 20, 4, 0, 0],
                    vec![0, 0, 0, 0, 16],
                ],
            );
            let input = candidate_nomination_fixture_with_given_number_of_seats(
                quota,
                &seat_assignment_input,
                vec![11, 7, 0],
            );
            let Ok(CandidateNomination::Completed(result)) =
                candidate_nomination(&input, &mut iter::empty::<&CandidateDrawnMock>())
            else {
                panic!("should be completed");
            };

            assert_eq!(result.preference_threshold.percentage, 50);
            assert_eq!(
                result.preference_threshold.number_of_votes,
                quota * Fraction::new(result.preference_threshold.percentage, 100)
            );
            check_list_candidate_nomination(
                &result.list_candidate_nomination[0],
                &[1, 2, 3, 4, 5, 6, 7],
                &[8, 9, 10, 11],
                &[],
            );
            check_list_candidate_nomination(
                &result.list_candidate_nomination[1],
                &[1, 2, 3, 4],
                &[5, 6, 7],
                &[],
            );
            check_list_candidate_nomination(
                &result.list_candidate_nomination[2],
                &[],
                &[],
                &[5, 1, 2, 3, 4],
            );

            check_chosen_candidates(
                &result.chosen_candidates,
                input.list_votes[0].number,
                &input.list_votes[0].candidate_votes[..11],
                &input.list_votes[0].candidate_votes[11..],
            );
            check_chosen_candidates(
                &result.chosen_candidates,
                input.list_votes[1].number,
                &input.list_votes[1].candidate_votes[..7],
                &[],
            );
            check_chosen_candidates(
                &result.chosen_candidates,
                input.list_votes[2].number,
                &[],
                &[],
            );
        }

        /// Candidate nomination where a candidate has votes exactly equal to the preference threshold.
        ///
        /// A candidate must have strictly more votes than the threshold to qualify for preferential nomination.
        ///
        /// - 2 total seats, 200 total votes, quota is 100 votes, preference threshold is 50% so 50 votes
        /// - List seats: [2]
        /// - List 1: Preferential candidate nomination of candidate 1 (60 votes > threshold) only,
        ///   candidate 2 (50 votes == threshold) is nominated via the 'other' route
        #[test]
        fn test_lt_19_seats_candidate_votes_equals_threshold() {
            let quota = Fraction::new(100, 1);
            let seat_assignment_input = seat_assignment_fixture_with_given_candidate_votes(
                5,
                vec![vec![60, 50, 40, 30, 20]],
            );
            let input = candidate_nomination_fixture_with_given_number_of_seats(
                quota,
                &seat_assignment_input,
                vec![2],
            );
            let Ok(CandidateNomination::Completed(result)) =
                candidate_nomination(&input, &mut iter::empty::<&CandidateDrawnMock>())
            else {
                panic!("should be completed");
            };

            assert_eq!(result.preference_threshold.percentage, 50);
            assert_eq!(
                result.preference_threshold.number_of_votes,
                quota * Fraction::new(result.preference_threshold.percentage, 100)
            );
            check_list_candidate_nomination(&result.list_candidate_nomination[0], &[1], &[2], &[]);
        }
    }

    mod gte_19_seats {
        use std::iter;

        use crate::{
            CandidateNomination, Fraction,
            candidate_nomination::candidate_nomination,
            test_helpers::{
                CandidateDrawnMock, candidate_nomination_fixture_with_given_number_of_seats,
                check_chosen_candidates, check_list_candidate_nomination,
                get_chosen_and_not_chosen_candidates_for_a_list,
                seat_assignment_fixture_with_given_candidate_votes,
            },
        };

        /// Candidate nomination with candidate votes meeting preference threshold but no seat
        ///
        /// List seats: [6, 6, 5, 2, 0]
        /// - List 1: Preferential candidate nominations of candidates 1, 2, 3, 4 and 5 and other candidate nominations of candidate 6
        /// - List 2: Preferential candidate nominations of candidates 1, 2, 3 and 4 and other candidate nominations of candidates 5 and 6
        /// - List 3: Preferential candidate nominations of candidates 1, 2, 3 and 4 and other candidate nominations of candidate 5
        /// - List 4: Preferential candidate nominations of candidates 1 and 2 and no other candidate nominations
        /// - List 5: No preferential candidate nominations and no other candidate nomination
        #[test]
        fn test_with_gte_19_seats_and_candidate_votes_meeting_preference_threshold_but_no_seat() {
            let quota = Fraction::new(960, 19);
            let seat_assignment_input = seat_assignment_fixture_with_given_candidate_votes(
                19,
                vec![
                    vec![80, 70, 60, 50, 40, 0],
                    vec![80, 70, 60, 50, 5, 0],
                    vec![80, 70, 60, 50, 0, 0],
                    vec![80, 40, 0, 0, 0],
                    vec![0, 0, 0, 0, 15],
                ],
            );
            let input = candidate_nomination_fixture_with_given_number_of_seats(
                quota,
                &seat_assignment_input,
                vec![6, 6, 5, 2, 0],
            );
            let Ok(CandidateNomination::Completed(result)) =
                candidate_nomination(&input, &mut iter::empty::<&CandidateDrawnMock>())
            else {
                panic!("should be completed");
            };

            assert_eq!(result.preference_threshold.percentage, 25);
            assert_eq!(
                result.preference_threshold.number_of_votes,
                quota * Fraction::new(result.preference_threshold.percentage, 100)
            );
            check_list_candidate_nomination(
                &result.list_candidate_nomination[0],
                &[1, 2, 3, 4, 5],
                &[6],
                &[],
            );
            check_list_candidate_nomination(
                &result.list_candidate_nomination[1],
                &[1, 2, 3, 4],
                &[5, 6],
                &[],
            );
            check_list_candidate_nomination(
                &result.list_candidate_nomination[2],
                &[1, 2, 3, 4],
                &[5],
                &[],
            );
            check_list_candidate_nomination(
                &result.list_candidate_nomination[3],
                &[1, 2],
                &[],
                &[],
            );
            check_list_candidate_nomination(&result.list_candidate_nomination[4], &[], &[], &[]);

            check_chosen_candidates(
                &result.chosen_candidates,
                input.list_votes[0].number,
                &input.list_votes[0].candidate_votes,
                &[],
            );
            check_chosen_candidates(
                &result.chosen_candidates,
                input.list_votes[1].number,
                &input.list_votes[1].candidate_votes,
                &[],
            );
            check_chosen_candidates(
                &result.chosen_candidates,
                input.list_votes[2].number,
                &input.list_votes[2].candidate_votes[..5],
                &input.list_votes[2].candidate_votes[5..],
            );
            check_chosen_candidates(
                &result.chosen_candidates,
                input.list_votes[3].number,
                &input.list_votes[3].candidate_votes[..2],
                &input.list_votes[3].candidate_votes[2..],
            );
            check_chosen_candidates(
                &result.chosen_candidates,
                input.list_votes[4].number,
                &[],
                &input.list_votes[4].candidate_votes,
            );
        }

        /// Candidate nomination with more candidates eligible for preferential nomination than seats
        ///
        /// List seats: [6, 5, 4, 2, 2]
        /// - List 1: Preferential candidate nominations of candidates 1, 3, 4, 5, 6 and 7 no other candidate nominations
        /// - List 2: Preferential candidate nomination of candidates 1, 2, 4, 5 and 6 and no other candidate nominations
        ///   - Candidate 7 also meets the preferential threshold but does not get a seat
        /// - List 3: Preferential candidate nomination of candidate 1, 2, 3 and 5 and no other candidate nominations
        ///   - Candidates 6 and 7 also meet the preferential threshold but do not get seats
        /// - List 4: Preferential candidate nomination of candidate 1 and 2 and no other candidate nominations
        ///   - Candidates 3, 4, 6 and 7 also meet the preferential threshold but do not get seats
        /// - List 5: Preferential candidate nomination of candidate 1 and 2 and no other candidate nominations
        ///   - Candidates 4, 5 and 7 also meet the preferential threshold but do not get seats
        #[test]
        fn test_with_gte_19_seats_and_more_candidates_eligible_for_preferential_nomination_than_seats()
         {
            let quota = Fraction::new(9500, 19);
            let seat_assignment_input = seat_assignment_fixture_with_given_candidate_votes(
                19,
                vec![
                    vec![500, 0, 500, 500, 500, 500, 500],
                    vec![400, 400, 0, 400, 400, 400, 399],
                    vec![300, 300, 300, 0, 300, 299, 298],
                    vec![200, 200, 199, 198, 0, 197, 196],
                    vec![200, 200, 199, 198, 198, 0, 119],
                ],
            );
            let input = candidate_nomination_fixture_with_given_number_of_seats(
                quota,
                &seat_assignment_input,
                vec![6, 5, 4, 2, 2],
            );
            let Ok(CandidateNomination::Completed(result)) =
                candidate_nomination(&input, &mut iter::empty::<&CandidateDrawnMock>())
            else {
                panic!("should be completed");
            };

            assert_eq!(result.preference_threshold.percentage, 25);
            assert_eq!(
                result.preference_threshold.number_of_votes,
                quota * Fraction::new(result.preference_threshold.percentage, 100)
            );
            let list_0_preferential_nominated_candidate_numbers = &[1, 3, 4, 5, 6, 7];
            let list_0_other_nominated_candidate_numbers = &[];
            check_list_candidate_nomination(
                &result.list_candidate_nomination[0],
                list_0_preferential_nominated_candidate_numbers,
                list_0_other_nominated_candidate_numbers,
                &[1, 3, 4, 5, 6, 7, 2],
            );

            let list_1_preferential_nominated_candidate_numbers = &[1, 2, 4, 5, 6];
            let list_1_other_nominated_candidate_numbers = &[];
            check_list_candidate_nomination(
                &result.list_candidate_nomination[1],
                list_1_preferential_nominated_candidate_numbers,
                list_1_other_nominated_candidate_numbers,
                &[1, 2, 4, 5, 6, 7, 3],
            );

            let list_2_preferential_nominated_candidate_numbers = &[1, 2, 3, 5];
            let list_2_other_nominated_candidate_numbers = &[];
            check_list_candidate_nomination(
                &result.list_candidate_nomination[2],
                list_2_preferential_nominated_candidate_numbers,
                list_2_other_nominated_candidate_numbers,
                &[1, 2, 3, 5, 6, 7, 4],
            );

            let list_3_preferential_nominated_candidate_numbers = &[1, 2];
            let list_3_other_nominated_candidate_numbers = &[];
            check_list_candidate_nomination(
                &result.list_candidate_nomination[3],
                list_3_preferential_nominated_candidate_numbers,
                list_3_other_nominated_candidate_numbers,
                &[1, 2, 3, 4, 6, 7, 5],
            );

            let list_4_preferential_nominated_candidate_numbers = &[1, 2];
            let list_4_other_nominated_candidate_numbers = &[];
            check_list_candidate_nomination(
                &result.list_candidate_nomination[4],
                list_4_preferential_nominated_candidate_numbers,
                list_4_other_nominated_candidate_numbers,
                &[],
            );

            let (list_0_chosen_candidates, list_0_not_chosen_candidates) =
                get_chosen_and_not_chosen_candidates_for_a_list(
                    &input.list_votes[0].candidate_votes,
                    list_0_preferential_nominated_candidate_numbers,
                    list_0_other_nominated_candidate_numbers,
                );
            check_chosen_candidates(
                &result.chosen_candidates,
                input.list_votes[0].number,
                &list_0_chosen_candidates,
                &list_0_not_chosen_candidates,
            );

            let (list_1_chosen_candidates, list_1_not_chosen_candidates) =
                get_chosen_and_not_chosen_candidates_for_a_list(
                    &input.list_votes[1].candidate_votes,
                    list_1_preferential_nominated_candidate_numbers,
                    list_1_other_nominated_candidate_numbers,
                );
            check_chosen_candidates(
                &result.chosen_candidates,
                input.list_votes[1].number,
                &list_1_chosen_candidates,
                &list_1_not_chosen_candidates,
            );

            let (list_2_chosen_candidates, list_2_not_chosen_candidates) =
                get_chosen_and_not_chosen_candidates_for_a_list(
                    &input.list_votes[2].candidate_votes,
                    list_2_preferential_nominated_candidate_numbers,
                    list_2_other_nominated_candidate_numbers,
                );
            check_chosen_candidates(
                &result.chosen_candidates,
                input.list_votes[2].number,
                &list_2_chosen_candidates,
                &list_2_not_chosen_candidates,
            );

            let (list_3_chosen_candidates, list_3_not_chosen_candidates) =
                get_chosen_and_not_chosen_candidates_for_a_list(
                    &input.list_votes[3].candidate_votes,
                    list_3_preferential_nominated_candidate_numbers,
                    list_3_other_nominated_candidate_numbers,
                );
            check_chosen_candidates(
                &result.chosen_candidates,
                input.list_votes[3].number,
                &list_3_chosen_candidates,
                &list_3_not_chosen_candidates,
            );

            let (list_4_chosen_candidates, list_4_not_chosen_candidates) =
                get_chosen_and_not_chosen_candidates_for_a_list(
                    &input.list_votes[4].candidate_votes,
                    list_4_preferential_nominated_candidate_numbers,
                    list_4_other_nominated_candidate_numbers,
                );
            check_chosen_candidates(
                &result.chosen_candidates,
                input.list_votes[4].number,
                &list_4_chosen_candidates,
                &list_4_not_chosen_candidates,
            );
        }

        /// Candidate nomination with ranking change due to preferential candidate nomination
        ///
        /// Actual case from GR2026  
        /// List seats: [13, 7, 2, 4, 1, 3, 2, 0, 1]
        /// - List 1: Preferential candidate nomination of candidates 1, 26, 3, 2, 8, 5, 4, 11, 9, 12 and 25 and other candidate nomination of candidates 6 and 7
        /// - List 2: Preferential candidate nomination of candidates 1, 2, 3 and 5 and other candidate nomination of candidates 4, 6 and 7
        /// - List 3: Preferential candidate nomination of candidates 1 and 8 and no other candidate nomination
        /// - List 4: Preferential candidate nomination of candidate 1, 2 and 3 and other candidate nomination of candidate 4
        /// - List 5: Preferential candidate nomination of candidate 1 and no other candidate nomination
        /// - List 6: Preferential candidate nomination of candidates 1, 3 and 2 and no other candidate nomination
        /// - List 7: Preferential candidate nomination of candidate 1 and other candidate nomination of candidate 2
        /// - List 8: No preferential candidate nomination and no other candidate nomination
        /// - List 9: Preferential candidate nomination of candidate 1 and no other candidate nomination
        #[test]
        fn test_with_gte_19_seats_and_preferential_candidate_nomination_and_updated_candidate_ranking()
         {
            let quota = Fraction::new(23050, 33);
            let seat_assignment_input = seat_assignment_fixture_with_given_candidate_votes(
                33,
                vec![
                    vec![
                        1596, 870, 1023, 298, 477, 86, 118, 714, 283, 133, 286, 256, 104, 45, 17,
                        41, 126, 18, 144, 89, 11, 64, 30, 22, 188, 1229,
                    ],
                    vec![
                        3104, 310, 280, 110, 280, 137, 166, 68, 20, 124, 34, 12, 11, 22, 33, 6, 6,
                        6, 14, 12, 14, 16, 1, 1, 4, 6, 8, 3, 3, 5, 4, 2, 6, 5, 2, 1, 7, 1, 1, 3, 6,
                        3, 9, 9, 17,
                    ],
                    vec![
                        547, 123, 165, 224, 93, 14, 8, 228, 17, 23, 109, 2, 27, 40, 3, 8, 44, 13,
                        25, 10, 8, 10, 13, 14, 7, 34, 42,
                    ],
                    vec![
                        730, 288, 218, 84, 159, 144, 37, 62, 109, 27, 41, 52, 16, 39, 34, 43, 33,
                        18, 38, 14, 31, 14, 17, 22, 50, 17, 34, 7, 51, 157,
                    ],
                    vec![
                        631, 58, 99, 19, 31, 25, 11, 13, 14, 23, 8, 1, 23, 3, 14, 15, 86,
                    ],
                    vec![
                        628, 181, 212, 75, 69, 86, 65, 68, 13, 30, 80, 67, 5, 16, 14, 19, 11, 22,
                        33, 14, 5, 34, 19, 24, 4, 11, 47,
                    ],
                    vec![882, 91, 106, 21, 80, 43, 19, 8, 5, 36, 9, 1, 13, 23],
                    vec![
                        264, 134, 27, 29, 5, 19, 25, 6, 8, 16, 5, 2, 2, 0, 5, 5, 6, 3, 3, 9,
                    ],
                    vec![
                        242, 21, 140, 44, 5, 15, 5, 30, 60, 7, 10, 20, 3, 6, 0, 2, 0, 7,
                    ],
                ],
            );
            let input = candidate_nomination_fixture_with_given_number_of_seats(
                quota,
                &seat_assignment_input,
                vec![13, 7, 2, 4, 1, 3, 2, 0, 1],
            );
            let Ok(CandidateNomination::Completed(result)) =
                candidate_nomination(&input, &mut iter::empty::<&CandidateDrawnMock>())
            else {
                panic!("should be completed");
            };

            assert_eq!(result.preference_threshold.percentage, 25);
            assert_eq!(
                result.preference_threshold.number_of_votes,
                quota * Fraction::new(result.preference_threshold.percentage, 100)
            );
            let list_0_preferential_nominated_candidate_numbers =
                &[1, 26, 3, 2, 8, 5, 4, 11, 9, 12, 25];
            let list_0_other_nominated_candidate_numbers = &[6, 7];
            check_list_candidate_nomination(
                &result.list_candidate_nomination[0],
                list_0_preferential_nominated_candidate_numbers,
                list_0_other_nominated_candidate_numbers,
                &[
                    1, 26, 3, 2, 8, 5, 4, 11, 9, 12, 25, 6, 7, 10, 13, 14, 15, 16, 17, 18, 19, 20,
                    21, 22, 23, 24,
                ],
            );

            let list_1_preferential_nominated_candidate_numbers = &[1, 2, 3, 5];
            let list_1_other_nominated_candidate_numbers = &[4, 6, 7];
            check_list_candidate_nomination(
                &result.list_candidate_nomination[1],
                list_1_preferential_nominated_candidate_numbers,
                list_1_other_nominated_candidate_numbers,
                &[
                    1, 2, 3, 5, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
                    23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42,
                    43, 44, 45,
                ],
            );

            let list_2_preferential_nominated_candidate_numbers = &[1, 8];
            let list_2_other_nominated_candidate_numbers = &[];
            check_list_candidate_nomination(
                &result.list_candidate_nomination[2],
                list_2_preferential_nominated_candidate_numbers,
                list_2_other_nominated_candidate_numbers,
                &[
                    1, 8, 4, 2, 3, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
                    23, 24, 25, 26, 27,
                ],
            );

            let list_3_preferential_nominated_candidate_numbers = &[1, 2, 3];
            let list_3_other_nominated_candidate_numbers = &[4];
            check_list_candidate_nomination(
                &result.list_candidate_nomination[3],
                list_3_preferential_nominated_candidate_numbers,
                list_3_other_nominated_candidate_numbers,
                &[],
            );

            let list_4_preferential_nominated_candidate_numbers = &[1];
            let list_4_other_nominated_candidate_numbers = &[];
            check_list_candidate_nomination(
                &result.list_candidate_nomination[4],
                list_4_preferential_nominated_candidate_numbers,
                list_4_other_nominated_candidate_numbers,
                &[],
            );

            let list_5_preferential_nominated_candidate_numbers = &[1, 3, 2];
            let list_5_other_nominated_candidate_numbers = &[];
            check_list_candidate_nomination(
                &result.list_candidate_nomination[5],
                list_5_preferential_nominated_candidate_numbers,
                list_5_other_nominated_candidate_numbers,
                &[
                    1, 3, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
                    23, 24, 25, 26, 27,
                ],
            );

            let list_6_preferential_nominated_candidate_numbers = &[1];
            let list_6_other_nominated_candidate_numbers = &[2];
            check_list_candidate_nomination(
                &result.list_candidate_nomination[6],
                list_6_preferential_nominated_candidate_numbers,
                list_6_other_nominated_candidate_numbers,
                &[],
            );

            let list_7_preferential_nominated_candidate_numbers = &[];
            let list_7_other_nominated_candidate_numbers = &[];
            check_list_candidate_nomination(
                &result.list_candidate_nomination[7],
                list_7_preferential_nominated_candidate_numbers,
                list_7_other_nominated_candidate_numbers,
                &[],
            );

            let list_8_preferential_nominated_candidate_numbers = &[1];
            let list_8_other_nominated_candidate_numbers = &[];
            check_list_candidate_nomination(
                &result.list_candidate_nomination[8],
                list_8_preferential_nominated_candidate_numbers,
                list_8_other_nominated_candidate_numbers,
                &[],
            );

            let (list_0_chosen_candidates, list_0_not_chosen_candidates) =
                get_chosen_and_not_chosen_candidates_for_a_list(
                    &input.list_votes[0].candidate_votes,
                    list_0_preferential_nominated_candidate_numbers,
                    list_0_other_nominated_candidate_numbers,
                );
            check_chosen_candidates(
                &result.chosen_candidates,
                input.list_votes[0].number,
                &list_0_chosen_candidates,
                &list_0_not_chosen_candidates,
            );

            let (list_1_chosen_candidates, list_1_not_chosen_candidates) =
                get_chosen_and_not_chosen_candidates_for_a_list(
                    &input.list_votes[1].candidate_votes,
                    list_1_preferential_nominated_candidate_numbers,
                    list_1_other_nominated_candidate_numbers,
                );
            check_chosen_candidates(
                &result.chosen_candidates,
                input.list_votes[1].number,
                &list_1_chosen_candidates,
                &list_1_not_chosen_candidates,
            );

            let (list_2_chosen_candidates, list_2_not_chosen_candidates) =
                get_chosen_and_not_chosen_candidates_for_a_list(
                    &input.list_votes[2].candidate_votes,
                    list_2_preferential_nominated_candidate_numbers,
                    list_2_other_nominated_candidate_numbers,
                );
            check_chosen_candidates(
                &result.chosen_candidates,
                input.list_votes[2].number,
                &list_2_chosen_candidates,
                &list_2_not_chosen_candidates,
            );

            let (list_3_chosen_candidates, list_3_not_chosen_candidates) =
                get_chosen_and_not_chosen_candidates_for_a_list(
                    &input.list_votes[3].candidate_votes,
                    list_3_preferential_nominated_candidate_numbers,
                    list_3_other_nominated_candidate_numbers,
                );
            check_chosen_candidates(
                &result.chosen_candidates,
                input.list_votes[3].number,
                &list_3_chosen_candidates,
                &list_3_not_chosen_candidates,
            );

            let (list_4_chosen_candidates, list_4_not_chosen_candidates) =
                get_chosen_and_not_chosen_candidates_for_a_list(
                    &input.list_votes[4].candidate_votes,
                    list_4_preferential_nominated_candidate_numbers,
                    list_4_other_nominated_candidate_numbers,
                );
            check_chosen_candidates(
                &result.chosen_candidates,
                input.list_votes[4].number,
                &list_4_chosen_candidates,
                &list_4_not_chosen_candidates,
            );

            let (list_5_chosen_candidates, list_5_not_chosen_candidates) =
                get_chosen_and_not_chosen_candidates_for_a_list(
                    &input.list_votes[5].candidate_votes,
                    list_5_preferential_nominated_candidate_numbers,
                    list_5_other_nominated_candidate_numbers,
                );
            check_chosen_candidates(
                &result.chosen_candidates,
                input.list_votes[5].number,
                &list_5_chosen_candidates,
                &list_5_not_chosen_candidates,
            );

            let (list_6_chosen_candidates, list_6_not_chosen_candidates) =
                get_chosen_and_not_chosen_candidates_for_a_list(
                    &input.list_votes[6].candidate_votes,
                    list_6_preferential_nominated_candidate_numbers,
                    list_6_other_nominated_candidate_numbers,
                );
            check_chosen_candidates(
                &result.chosen_candidates,
                input.list_votes[6].number,
                &list_6_chosen_candidates,
                &list_6_not_chosen_candidates,
            );

            let (list_7_chosen_candidates, list_7_not_chosen_candidates) =
                get_chosen_and_not_chosen_candidates_for_a_list(
                    &input.list_votes[7].candidate_votes,
                    list_7_preferential_nominated_candidate_numbers,
                    list_7_other_nominated_candidate_numbers,
                );
            check_chosen_candidates(
                &result.chosen_candidates,
                input.list_votes[7].number,
                &list_7_chosen_candidates,
                &list_7_not_chosen_candidates,
            );

            let (list_8_chosen_candidates, list_8_not_chosen_candidates) =
                get_chosen_and_not_chosen_candidates_for_a_list(
                    &input.list_votes[8].candidate_votes,
                    list_8_preferential_nominated_candidate_numbers,
                    list_8_other_nominated_candidate_numbers,
                );
            check_chosen_candidates(
                &result.chosen_candidates,
                input.list_votes[8].number,
                &list_8_chosen_candidates,
                &list_8_not_chosen_candidates,
            );
        }
    }

    /// Candidate nomination with more candidates eligible for preferential nomination than seats
    ///
    /// List seats: [6, 3]
    /// - List 1: Preferential candidate nominations of candidates 1, 2, 3, 4, 5 and 6 no other candidate nominations
    /// - List 2: Preferential candidate nomination of candidate 1 and no other candidate nominations
    ///   - Drawing of lots is required for candidates: [2, 3, 4, 5, 6], only 2 seats available
    ///   - Candidate 5 is drawn
    ///   - Drawing of lots is required for candidates: [2, 3, 4, 6], only 1 seat available
    ///   - Candidate 3 is drawn
    #[test]
    fn test_with_drawing_of_lots_multiple_lots_drawn() {
        let quota = Fraction::new(9600, 19);
        let seat_assignment_input = seat_assignment_fixture_with_given_candidate_votes(
            19,
            vec![
                vec![500, 500, 500, 500, 500, 500],
                vec![500, 400, 400, 400, 400, 400],
            ],
        );
        let input = candidate_nomination_fixture_with_given_number_of_seats(
            quota,
            &seat_assignment_input,
            vec![6, 3],
        );

        let Ok(CandidateNomination::DrawingLotsRequired(variant_one)) =
            candidate_nomination(&input, &mut iter::empty::<&CandidateDrawnMock>())
        else {
            panic!("should be DrawingLotsRequired");
        };

        assert_eq!(
            variant_one,
            CandidateDrawingLotsVariant {
                list: 2,
                total_seats: 3,
                number_of_votes: 400,
                seat_numbers: vec![2, 3],
                options: vec![2, 3, 4, 5, 6]
            }
        );

        // Candidate drawn is 5
        let candidates_drawn = [CandidateDrawnMock {
            variant: variant_one.clone(),
            drawn: 5,
        }];

        let result = candidate_nomination(&input, &mut candidates_drawn.iter());
        let Ok(CandidateNomination::DrawingLotsRequired(variant_two)) = result else {
            panic!("should be DrawingLotsRequired, but was {:?}", result);
        };

        assert_eq!(
            variant_two,
            CandidateDrawingLotsVariant {
                list: 2,
                total_seats: 3,
                number_of_votes: 400,
                seat_numbers: vec![3],
                options: vec![2, 3, 4, 6]
            }
        );

        // Next candidate drawn is 3
        let candidates_drawn = [
            CandidateDrawnMock {
                variant: variant_one,
                drawn: 5,
            },
            CandidateDrawnMock {
                variant: variant_two,
                drawn: 3,
            },
        ];

        let result = candidate_nomination(&input, &mut candidates_drawn.iter());
        let Ok(CandidateNomination::Completed(details)) = result else {
            panic!("should be Completed, but was {:?}", result);
        };

        assert_eq!(
            details.list_candidate_nomination,
            vec![
                ListCandidateNomination {
                    list_number: 1,
                    list_seats: 6,
                    preferential_candidate_nomination: vec![
                        &CandidateVotesMock(1, 500),
                        &CandidateVotesMock(2, 500),
                        &CandidateVotesMock(3, 500),
                        &CandidateVotesMock(4, 500),
                        &CandidateVotesMock(5, 500),
                        &CandidateVotesMock(6, 500),
                    ],
                    other_candidate_nomination: Vec::new(),
                    candidate_ranking: CandidateRanking::Original(vec![1, 2, 3, 4, 5, 6]),
                },
                ListCandidateNomination {
                    list_number: 2,
                    list_seats: 3,
                    preferential_candidate_nomination: vec![
                        &CandidateVotesMock(1, 500),
                        &CandidateVotesMock(5, 400),
                        &CandidateVotesMock(3, 400),
                    ],
                    other_candidate_nomination: Vec::new(),
                    candidate_ranking: CandidateRanking::Updated(vec![1, 5, 3, 2, 4, 6]),
                }
            ]
        );
    }

    #[test]
    fn test_preferential_candidate_nomination_scenarios() {
        struct Case {
            name: &'static str,
            candidates: Vec<(u32, u32)>,
            total_seats: u32,
            candidates_drawn: Vec<CandidateDrawnMock>,
            expected_nominations: Vec<u32>,
        }

        let cases = vec![
            Case {
                name: "all candidates nominated",
                candidates: vec![(1, 1000), (3, 900), (4, 800)],
                total_seats: 5,
                candidates_drawn: vec![],
                expected_nominations: vec![1, 3, 4],
            },
            Case {
                name: "first two candidates nominated because of total seats",
                candidates: vec![(1, 1000), (3, 900), (4, 800)],
                total_seats: 2,
                candidates_drawn: vec![],
                expected_nominations: vec![1, 3],
            },
            Case {
                name: "drawing of lots for candidates with same votes (not enough seats)",
                candidates: vec![(1, 1000), (3, 900), (4, 900)],
                total_seats: 2,
                candidates_drawn: vec![CandidateDrawnMock {
                    variant: CandidateDrawingLotsVariant {
                        list: 1,
                        total_seats: 2,
                        number_of_votes: 900,
                        seat_numbers: vec![2],
                        options: vec![3, 4],
                    },
                    drawn: 4,
                }],
                expected_nominations: vec![1, 4],
            },
            Case {
                name: "no drawing of lots for candidates with same votes (enough seats)",
                candidates: vec![(1, 1000), (3, 1000), (4, 900)],
                total_seats: 2,
                candidates_drawn: vec![],
                expected_nominations: vec![1, 3],
            },
            Case {
                name: "first three candidates nominated with drawing lots twice",
                candidates: vec![(1, 1000), (3, 900), (4, 900), (5, 900)],
                total_seats: 3,
                candidates_drawn: vec![
                    CandidateDrawnMock {
                        variant: CandidateDrawingLotsVariant {
                            list: 1,
                            total_seats: 3,
                            number_of_votes: 900,
                            seat_numbers: vec![2, 3],
                            options: vec![3, 4, 5],
                        },
                        drawn: 4,
                    },
                    CandidateDrawnMock {
                        variant: CandidateDrawingLotsVariant {
                            list: 1,
                            total_seats: 3,
                            number_of_votes: 900,
                            seat_numbers: vec![3],
                            options: vec![3, 5],
                        },
                        drawn: 3,
                    },
                ],
                expected_nominations: vec![1, 4, 3],
            },
            Case {
                name: "no need for drawing of lots if all candidates can be nominated",
                candidates: vec![(1, 1000), (3, 900), (4, 900), (5, 900)],
                total_seats: 4,
                candidates_drawn: vec![],
                expected_nominations: vec![1, 3, 4, 5],
            },
        ];

        for case in cases {
            let candidates: Vec<CandidateVotesMock> = case
                .candidates
                .iter()
                .map(|(number, votes)| CandidateVotesMock(*number, *votes))
                .collect();

            // preferential_candidate_nomination() takes a &[&CandidateVotesMock]
            let candidate_refs: Vec<&CandidateVotesMock> = candidates.iter().collect();

            let mut candidates_drawn = case.candidates_drawn.iter();

            let result: Result<
                PreferentialCandidateNomination<'_, ListVotesMock>,
                ApportionmentError,
            > = preferential_candidate_nomination(
                1,
                &candidate_refs,
                case.total_seats,
                &mut candidates_drawn,
            );

            // Assert result Ok(Completed())
            let Ok(PreferentialCandidateNomination::Completed(nomination)) = result else {
                panic!(
                    "should be completed successfully for case '{}', but was {:?}",
                    case.name, result
                );
            };

            // Assert nomination candidate numbers
            assert_eq!(
                nomination
                    .into_iter()
                    .map(CandidateVotesMock::number)
                    .collect::<Vec<_>>(),
                case.expected_nominations,
                "nominations should match: {}",
                case.name
            );

            // Assert all candidates_drawn from iterator used
            let next_candidate_drawn = candidates_drawn.next();
            assert!(
                next_candidate_drawn.is_none(),
                "candidates drawn iterator should be empty for '{}', but there still was {:?}",
                case.name,
                next_candidate_drawn
            )
        }
    }

    #[test]
    fn test_update_candidate_ranking_scenarios() {
        struct Case {
            name: &'static str,
            candidates: Vec<(u32, u32)>,
            preferential_candidate_nomination: Vec<u32>,
            candidates_meeting_threshold: Vec<u32>,
            expected_ranking: Vec<u32>,
        }

        let cases = vec![
            Case {
                name: "no preferential candidates and no candidates meeting threshold keeps original order",
                candidates: vec![(1, 50), (2, 40), (3, 30)],
                preferential_candidate_nomination: vec![],
                candidates_meeting_threshold: vec![],
                expected_ranking: vec![1, 2, 3],
            },
            Case {
                name: "preferential nominated candidates move to the top in vote order",
                candidates: vec![(1, 100), (2, 20), (3, 500), (4, 30)],
                preferential_candidate_nomination: vec![3, 1],
                candidates_meeting_threshold: vec![3, 1],
                expected_ranking: vec![3, 1, 2, 4],
            },
            Case {
                name: "candidates meeting threshold are moved to top after preferential nominations",
                candidates: vec![(2, 80), (5, 90), (9, 100), (11, 5)],
                preferential_candidate_nomination: vec![9],
                candidates_meeting_threshold: vec![9, 5, 2],
                expected_ranking: vec![9, 5, 2, 11],
            },
            Case {
                name: "first preferential nominated candidates, then candidates meeting threshold, then remaining candidates",
                candidates: vec![(1, 500), (2, 400), (3, 400), (4, 400), (5, 400), (6, 300)],
                preferential_candidate_nomination: vec![1, 5, 3],
                candidates_meeting_threshold: vec![1, 2, 3, 4, 5],
                expected_ranking: vec![1, 5, 3, 2, 4, 6],
            },
        ];

        fn get_candidates<'a>(
            candidates: &'a [CandidateVotesMock],
            numbers: &[u32],
        ) -> Vec<&'a CandidateVotesMock> {
            numbers
                .iter()
                .flat_map(|number| candidates.iter().filter(|c| c.number() == *number))
                .collect()
        }

        for case in cases {
            let candidates: Vec<CandidateVotesMock> = case
                .candidates
                .iter()
                .map(|(number, votes)| CandidateVotesMock(*number, *votes))
                .collect();

            assert_eq!(
                update_candidate_ranking(
                    &get_candidates(&candidates, &case.preferential_candidate_nomination),
                    &get_candidates(&candidates, &case.candidates_meeting_threshold),
                    &candidates.iter().collect::<Vec<_>>(),
                ),
                case.expected_ranking,
                "updated ranking should match: {}",
                case.name
            );
        }
    }
}
