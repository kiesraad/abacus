mod structs;

use tracing::{debug, info};

use self::structs::{Candidate, ListCandidateNomination, PreferenceThreshold};
pub use structs::CandidateNominationResult;

use super::{
    ApportionmentError,
    fraction::Fraction,
    structs::{
        CandidateNominationInput, CandidateNumber, CandidateVotes, LARGE_COUNCIL_THRESHOLD,
        ListVotes,
    },
};

/// Candidate nomination
pub fn candidate_nomination(
    input: CandidateNominationInput,
) -> Result<CandidateNominationResult, ApportionmentError> {
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

    let list_candidate_nomination = candidate_nomination_per_list(
        input.number_of_seats,
        &input.list_votes,
        preference_threshold,
        &input.total_seats_per_list,
    )?;
    debug!(
        "List candidate nomination: {:#?}",
        list_candidate_nomination
    );

    // Create chosen candidates list
    let chosen_candidates = all_chosen_candidates(&input.list_votes, &list_candidate_nomination);
    debug!("Chosen candidates: {:#?}", chosen_candidates);

    Ok(CandidateNominationResult {
        preference_threshold: PreferenceThreshold {
            percentage: preference_threshold_percentage,
            number_of_votes: preference_threshold,
        },
        chosen_candidates,
        list_candidate_nomination,
    })
}

/// Collect all chosen candidates via nomination with preferential votes and
/// the other nominated candidates into one list
fn all_chosen_candidates(
    list_votes: &[ListVotes],
    list_candidate_nomination: &[ListCandidateNomination],
) -> Vec<Candidate> {
    let mut chosen_candidates: Vec<Candidate> = vec![];
    for list in list_votes {
        // TODO: #2785 Don't use index
        let list_candidate_nomination = &list_candidate_nomination[*list.number as usize - 1];
        chosen_candidates.extend(
            list.candidate_votes
                .iter()
                .filter(|candidate| {
                    list_candidate_nomination
                        .preferential_candidate_nomination
                        .iter()
                        .any(|cv| cv.number == candidate.number)
                        || list_candidate_nomination
                            .other_candidate_nomination
                            .iter()
                            .any(|cv| cv.number == candidate.number)
                })
                .map(|candidate| Candidate {
                    list_number: list.number,
                    candidate_number: candidate.number,
                }),
        );
    }
    chosen_candidates
}

/// This function nominates candidates for the seats each list has been assigned.  
/// The candidate nomination is first done based on preferential votes and then the other
/// candidates are nominated.
fn candidate_nomination_per_list(
    seats: u32,
    list_votes: &[ListVotes],
    preference_threshold: Fraction,
    total_seats: &[u32],
) -> Result<Vec<ListCandidateNomination>, ApportionmentError> {
    let mut list_candidate_nomination: Vec<ListCandidateNomination> = vec![];
    for list in list_votes {
        let list_index = *list.number as usize - 1;
        let list_seats = total_seats[list_index];
        let candidate_votes = &list.candidate_votes;
        let candidate_votes_meeting_preference_threshold =
            candidate_votes_meeting_preference_threshold(preference_threshold, candidate_votes);
        let preferential_candidate_nomination = preferential_candidate_nomination(
            &candidate_votes_meeting_preference_threshold,
            list_seats,
        )?;

        // [Artikel P 17 Kieswet](https://wetten.overheid.nl/BWBR0004627/2026-01-01/#AfdelingII_HoofdstukP_Paragraaf3_ArtikelP17)
        let other_candidate_nomination = other_candidate_nomination(
            &preferential_candidate_nomination,
            candidate_votes,
            list_seats as usize - preferential_candidate_nomination.len(),
        );

        // [Artikel P 19 Kieswet](https://wetten.overheid.nl/BWBR0004627/2026-01-01/#AfdelingII_HoofdstukP_Paragraaf3_ArtikelP19)
        let updated_candidate_ranking: Vec<CandidateNumber> =
            if candidate_votes_meeting_preference_threshold.is_empty()
                || (seats >= LARGE_COUNCIL_THRESHOLD && list_seats == 0)
            {
                vec![]
            } else {
                let updated_ranking = update_candidate_ranking(
                    preference_threshold,
                    &candidate_votes_meeting_preference_threshold,
                    candidate_votes,
                );

                // If the updated candidate ranking is the same as the original candidate list,
                // return an empty list, otherwise return the updated list
                let original_ranking: Vec<CandidateNumber> =
                    candidate_votes.iter().map(|cv| cv.number).collect();
                if updated_ranking == original_ranking {
                    vec![]
                } else {
                    updated_ranking
                }
            };

        list_candidate_nomination.push(ListCandidateNomination {
            list_number: list.number,
            list_seats,
            preferential_candidate_nomination,
            other_candidate_nomination,
            updated_candidate_ranking,
        });
    }
    Ok(list_candidate_nomination)
}

/// List and sort the candidate votes whose votes meet the preference threshold
fn candidate_votes_meeting_preference_threshold(
    preference_threshold: Fraction,
    candidate_votes: &[CandidateVotes],
) -> Vec<CandidateVotes> {
    let mut candidates_meeting_preference_threshold: Vec<CandidateVotes> = candidate_votes
        .iter()
        .filter(|candidate_votes| Fraction::from(candidate_votes.votes) >= preference_threshold)
        .copied()
        .collect();
    candidates_meeting_preference_threshold.sort_by(|a, b| b.votes.cmp(&a.votes));
    candidates_meeting_preference_threshold
}

/// Create a vector containing just the candidate numbers from an iterator of candidate votes
fn candidate_votes_numbers(candidate_votes: &[CandidateVotes]) -> Vec<u32> {
    candidate_votes
        .iter()
        .map(|candidate| *candidate.number)
        .collect()
}

/// List the other candidates nominated
fn other_candidate_nomination(
    preferential_candidate_nomination: &[CandidateVotes],
    candidate_votes: &[CandidateVotes],
    non_assigned_seats: usize,
) -> Vec<CandidateVotes> {
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

/// List the candidates nominated with preferential votes
fn preferential_candidate_nomination(
    candidates_meeting_preference_threshold: &[CandidateVotes],
    list_seats: u32,
) -> Result<Vec<CandidateVotes>, ApportionmentError> {
    let mut preferential_candidate_nomination: Vec<CandidateVotes> = vec![];
    if candidates_meeting_preference_threshold.len() <= list_seats as usize {
        preferential_candidate_nomination.extend(candidates_meeting_preference_threshold);
    } else {
        // Loop over non-assigned seats
        for (index, non_assigned_seats) in (1..=list_seats).rev().enumerate() {
            // List all candidates with the same number of votes that have not been nominated yet
            let same_votes_candidates: Vec<CandidateVotes> =
                candidates_meeting_preference_threshold
                    .iter()
                    .filter(|candidate_votes| {
                        !preferential_candidate_nomination.contains(candidate_votes)
                            && candidate_votes.votes
                                == candidates_meeting_preference_threshold[index].votes
                    })
                    .copied()
                    .collect();
            // Check if we can actually nominate all these candidates, otherwise we would need to draw lots
            if same_votes_candidates.len() > non_assigned_seats as usize {
                // TODO: #788 if multiple lists have the same largest remainder and not enough residual seats are available, use drawing of lots
                info!(
                    "Drawing of lots is required for candidates: {:?}, only {non_assigned_seats} seat(s) available",
                    candidate_votes_numbers(&same_votes_candidates)
                );
                return Err(ApportionmentError::DrawingOfLotsNotImplemented);
            } else {
                // Nominate candidate to seat
                preferential_candidate_nomination
                    .push(candidates_meeting_preference_threshold[index]);
            }
        }
    }
    Ok(preferential_candidate_nomination)
}

/// Update the candidate list, moving the candidates meeting the preference threshold
/// to the top of the list and keeping the ranking of the rest of candidates on the list the same
fn update_candidate_ranking(
    preference_threshold: Fraction,
    candidate_votes_meeting_preference_threshold: &[CandidateVotes],
    candidate_votes: &[CandidateVotes],
) -> Vec<CandidateNumber> {
    let mut updated_candidate_ranking: Vec<CandidateNumber> = vec![];
    // Add candidates meeting preference threshold to the top of the ranking
    for candidate_votes in candidate_votes_meeting_preference_threshold {
        updated_candidate_ranking.push(candidate_votes.number);
    }

    // Add the remaining candidates in the order of the original candidate list
    for candidate_votes in candidate_votes
        .iter()
        .filter(|candidate_votes| Fraction::from(candidate_votes.votes) < preference_threshold)
    {
        updated_candidate_ranking.push(candidate_votes.number);
    }

    updated_candidate_ranking
}

#[cfg(test)]
mod tests {
    use test_log::test;

    use crate::{
        ApportionmentError,
        candidate_nomination::{
            Candidate, ListCandidateNomination, candidate_nomination, candidate_votes_numbers,
        },
        fraction::Fraction,
        structs::{CandidateVotes, ListNumber},
        test_helpers::candidate_nomination_fixture_with_given_number_of_seats,
    };

    fn check_list_candidate_nomination(
        nomination: &ListCandidateNomination,
        expected_preferential_nomination: &[u32],
        expected_other_nomination: &[u32],
        expected_updated_ranking: &[u32],
    ) {
        assert_eq!(
            candidate_votes_numbers(&nomination.preferential_candidate_nomination),
            expected_preferential_nomination
        );
        assert_eq!(
            candidate_votes_numbers(&nomination.other_candidate_nomination),
            expected_other_nomination
        );

        assert_eq!(
            nomination
                .updated_candidate_ranking
                .iter()
                .map(|n| **n)
                .collect::<Vec<u32>>(),
            expected_updated_ranking
        );
    }

    fn check_chosen_candidates(
        chosen_candidates: &[Candidate],
        list_number: &ListNumber,
        expected_chosen_candidates: &[CandidateVotes],
        expected_not_chosen_candidates: &[CandidateVotes],
    ) {
        assert!(expected_chosen_candidates.iter().all(|expected_candidate| {
            chosen_candidates.iter().any(|chosen_candidate| {
                chosen_candidate.list_number == *list_number
                    && chosen_candidate.candidate_number == expected_candidate.number
            })
        }));
        assert!(
            expected_not_chosen_candidates
                .iter()
                .all(|expected_candidate| {
                    !chosen_candidates.iter().any(|chosen_candidate| {
                        chosen_candidate.list_number == *list_number
                            && chosen_candidate.candidate_number == expected_candidate.number
                    })
                })
        );
    }

    fn get_chosen_and_not_chosen_candidates_for_a_list(
        list_candidates: &[CandidateVotes],
        list_preferential_nominated_candidate_numbers: &[u32],
        list_other_nominated_candidate_numbers: &[u32],
    ) -> (Vec<CandidateVotes>, Vec<CandidateVotes>) {
        let list_0_chosen_candidates: Vec<CandidateVotes> = list_candidates
            .iter()
            .filter(|&c| {
                list_preferential_nominated_candidate_numbers.contains(&c.number)
                    || list_other_nominated_candidate_numbers.contains(&c.number)
            })
            .cloned()
            .collect();
        let list_0_not_chosen_candidates: Vec<CandidateVotes> = list_candidates
            .iter()
            .filter(|&c| !list_0_chosen_candidates.contains(c))
            .cloned()
            .collect();
        (list_0_chosen_candidates, list_0_not_chosen_candidates)
    }

    /// Candidate nomination with ranking change due to preferential candidate nomination
    ///
    /// Actual case from GR2022  
    /// List seats: [8, 3, 2, 1, 1]  
    /// List 1: Preferential candidate nominations of candidates 1, 3, 2 and 4 and other candidate nominations of candidates 5, 6, 7 and 8  
    /// List 2: Preferential candidate nomination of candidate 1 and other candidate nomination of candidates 2 and 3  
    /// List 3: Preferential candidate nomination of candidate 1 and other candidate nomination of candidate 2  
    /// List 4: Preferential candidate nomination of candidate 1 and no other candidate nominations  
    /// List 5: Preferential candidate nomination of candidate 1 and no other candidate nominations
    #[test]
    fn test_with_lt_19_seats_and_preferential_candidate_nomination_and_updated_candidate_ranking() {
        let quota = Fraction::new(5104, 15);
        let input = candidate_nomination_fixture_with_given_number_of_seats(
            quota,
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
            vec![8, 3, 2, 1, 1],
        );
        let result = candidate_nomination(input.clone()).unwrap();

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
        check_list_candidate_nomination(&result.list_candidate_nomination[1], &[1], &[2, 3], &[]);
        check_list_candidate_nomination(&result.list_candidate_nomination[2], &[1], &[2], &[]);
        check_list_candidate_nomination(&result.list_candidate_nomination[3], &[1], &[], &[]);
        check_list_candidate_nomination(&result.list_candidate_nomination[4], &[1], &[], &[]);

        let lists = input.list_votes;
        check_chosen_candidates(
            &result.chosen_candidates,
            &lists[0].number,
            &lists[0].candidate_votes[..8],
            &lists[0].candidate_votes[9..],
        );
        check_chosen_candidates(
            &result.chosen_candidates,
            &lists[1].number,
            &lists[1].candidate_votes[..3],
            &lists[1].candidate_votes[4..],
        );
        check_chosen_candidates(
            &result.chosen_candidates,
            &lists[2].number,
            &lists[2].candidate_votes[..2],
            &lists[2].candidate_votes[3..],
        );
        check_chosen_candidates(
            &result.chosen_candidates,
            &lists[3].number,
            &lists[3].candidate_votes[..1],
            &lists[3].candidate_votes[2..],
        );
        check_chosen_candidates(
            &result.chosen_candidates,
            &lists[4].number,
            &lists[4].candidate_votes[..1],
            &lists[4].candidate_votes[2..],
        );
    }

    /// Candidate nomination with no preferential candidate nomination
    ///
    /// List seats: [1, 1, 1, 1, 1]  
    /// List 1: No preferential candidate nominations and other candidate nomination of candidate 1  
    /// List 2: No preferential candidate nominations and other candidate nomination of candidate 1  
    /// List 3: No preferential candidate nominations and other candidate nomination of candidate 1  
    /// List 4: No preferential candidate nominations and other candidate nomination of candidate 1  
    /// List 5: No preferential candidate nominations and other candidate nomination of candidate 1
    #[test]
    fn test_with_lt_19_seats_and_no_preferential_candidate_nomination() {
        let quota = Fraction::new(105, 5);
        let input = candidate_nomination_fixture_with_given_number_of_seats(
            quota,
            5,
            vec![
                vec![5, 4, 4, 4, 4],
                vec![4, 5, 4, 4, 4],
                vec![4, 4, 5, 4, 4],
                vec![4, 4, 4, 5, 4],
                vec![4, 4, 4, 4, 5],
            ],
            vec![1, 1, 1, 1, 1],
        );
        let result = candidate_nomination(input.clone()).unwrap();

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

        let lists = input.list_votes;
        check_chosen_candidates(
            &result.chosen_candidates,
            &lists[0].number,
            &lists[0].candidate_votes[..1],
            &lists[0].candidate_votes[2..],
        );
        check_chosen_candidates(
            &result.chosen_candidates,
            &lists[0].number,
            &lists[1].candidate_votes[..1],
            &lists[1].candidate_votes[2..],
        );
        check_chosen_candidates(
            &result.chosen_candidates,
            &lists[0].number,
            &lists[2].candidate_votes[..1],
            &lists[2].candidate_votes[2..],
        );
        check_chosen_candidates(
            &result.chosen_candidates,
            &lists[0].number,
            &lists[3].candidate_votes[..1],
            &lists[3].candidate_votes[2..],
        );
        check_chosen_candidates(
            &result.chosen_candidates,
            &lists[0].number,
            &lists[4].candidate_votes[..1],
            &lists[4].candidate_votes[2..],
        );
    }

    /// Candidate nomination with candidate votes meeting preference threshold but no seat
    ///
    /// List seats: [11, 7, 0]  
    /// List 1: Preferential candidate nominations of candidates 1, 2, 3, 4, 5, 6 and 7 and other candidate nominations of candidates 8, 9, 10 and 11  
    /// List 2: Preferential candidate nominations of candidates 1, 2, 3 and 4 and other candidate nominations of candidates 5, 6 and 7  
    /// List 3: No preferential candidate nominations and no other candidate nomination
    #[test]
    fn test_with_lt_19_seats_and_candidate_votes_meeting_preference_threshold_but_no_seat() {
        let quota = Fraction::new(570, 18);
        let input = candidate_nomination_fixture_with_given_number_of_seats(
            quota,
            18,
            vec![
                vec![80, 70, 60, 50, 40, 30, 20, 0, 0, 0, 0, 0],
                vec![80, 60, 40, 20, 4, 0, 0],
                vec![0, 0, 0, 0, 16],
            ],
            vec![11, 7, 0],
        );
        let result = candidate_nomination(input.clone()).unwrap();

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

        let lists = input.list_votes;
        check_chosen_candidates(
            &result.chosen_candidates,
            &lists[0].number,
            &lists[0].candidate_votes[..11],
            &lists[0].candidate_votes[11..],
        );
        check_chosen_candidates(
            &result.chosen_candidates,
            &lists[1].number,
            &lists[1].candidate_votes[..7],
            &[],
        );
        check_chosen_candidates(&result.chosen_candidates, &lists[2].number, &[], &[]);
    }

    /// Candidate nomination with candidate votes meeting preference threshold but no seat
    ///
    /// List seats: [6, 6, 5, 2, 0]  
    /// List 1: Preferential candidate nominations of candidates 1, 2, 3, 4 and 5 and other candidate nominations of candidate 6  
    /// List 2: Preferential candidate nominations of candidates 1, 2, 3 and 4 and other candidate nominations of candidates 5 and 6  
    /// List 3: Preferential candidate nominations of candidates 1, 2, 3 and 4 and other candidate nominations of candidate 5  
    /// List 4: Preferential candidate nominations of candidates 1 and 2 and no other candidate nominations  
    /// List 5: No preferential candidate nominations and no other candidate nomination
    #[test]
    fn test_with_gte_19_seats_and_candidate_votes_meeting_preference_threshold_but_no_seat() {
        let quota = Fraction::new(960, 19);
        let input = candidate_nomination_fixture_with_given_number_of_seats(
            quota,
            19,
            vec![
                vec![80, 70, 60, 50, 40, 0],
                vec![80, 70, 60, 50, 5, 0],
                vec![80, 70, 60, 50, 0, 0],
                vec![80, 40, 0, 0, 0],
                vec![0, 0, 0, 0, 15],
            ],
            vec![6, 6, 5, 2, 0],
        );
        let result = candidate_nomination(input.clone()).unwrap();

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
        check_list_candidate_nomination(&result.list_candidate_nomination[3], &[1, 2], &[], &[]);
        check_list_candidate_nomination(&result.list_candidate_nomination[4], &[], &[], &[]);

        let lists = input.list_votes;
        check_chosen_candidates(
            &result.chosen_candidates,
            &lists[0].number,
            &lists[0].candidate_votes,
            &[],
        );
        check_chosen_candidates(
            &result.chosen_candidates,
            &lists[1].number,
            &lists[1].candidate_votes,
            &[],
        );
        check_chosen_candidates(
            &result.chosen_candidates,
            &lists[2].number,
            &lists[2].candidate_votes[..5],
            &lists[2].candidate_votes[5..],
        );
        check_chosen_candidates(
            &result.chosen_candidates,
            &lists[3].number,
            &lists[3].candidate_votes[..2],
            &lists[3].candidate_votes[2..],
        );
        check_chosen_candidates(
            &result.chosen_candidates,
            &lists[4].number,
            &[],
            &lists[4].candidate_votes,
        );
    }

    /// Candidate nomination with more candidates eligible for preferential nomination than seats
    ///
    /// List seats: [6, 5, 4, 2, 2]  
    /// List 1: Preferential candidate nominations of candidates 1, 3, 4, 5, 6 and 7 no other candidate nominations  
    /// List 2: Preferential candidate nomination of candidates 1, 2, 4, 5 and 6 and no other candidate nominations  
    ///       Candidate 7 also meets the preferential threshold but does not get a seat  
    /// List 3: Preferential candidate nomination of candidate 1, 2, 3 and 5 and no other candidate nominations  
    ///       Candidates 6 and 7 also meet the preferential threshold but do not get seats  
    /// List 4: Preferential candidate nomination of candidate 1 and 2 and no other candidate nominations  
    ///       Candidates 3, 4, 6 and 7 also meet the preferential threshold but do not get seats  
    /// List 5: Preferential candidate nomination of candidate 1 and 2 and no other candidate nominations  
    ///       Candidates 4, 5 and 7 also meet the preferential threshold but do not get seats
    #[test]
    fn test_with_ge_19_seats_and_more_candidates_eligible_for_preferential_nomination_than_seats() {
        let quota = Fraction::new(9500, 19);
        let input = candidate_nomination_fixture_with_given_number_of_seats(
            quota,
            19,
            vec![
                vec![500, 0, 500, 500, 500, 500, 500],
                vec![400, 400, 0, 400, 400, 400, 399],
                vec![300, 300, 300, 0, 300, 299, 298],
                vec![200, 200, 199, 198, 0, 197, 196],
                vec![200, 200, 199, 198, 198, 0, 119],
            ],
            vec![6, 5, 4, 2, 2],
        );
        let result = candidate_nomination(input.clone()).unwrap();

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

        let lists = input.list_votes;
        let (list_0_chosen_candidates, list_0_not_chosen_candidates) =
            get_chosen_and_not_chosen_candidates_for_a_list(
                lists[0].candidate_votes.as_slice(),
                list_0_preferential_nominated_candidate_numbers,
                list_0_other_nominated_candidate_numbers,
            );
        check_chosen_candidates(
            &result.chosen_candidates,
            &lists[0].number,
            &list_0_chosen_candidates,
            &list_0_not_chosen_candidates,
        );

        let (list_1_chosen_candidates, list_1_not_chosen_candidates) =
            get_chosen_and_not_chosen_candidates_for_a_list(
                &lists[1].candidate_votes,
                list_1_preferential_nominated_candidate_numbers,
                list_1_other_nominated_candidate_numbers,
            );
        check_chosen_candidates(
            &result.chosen_candidates,
            &lists[1].number,
            &list_1_chosen_candidates,
            &list_1_not_chosen_candidates,
        );

        let (list_2_chosen_candidates, list_2_not_chosen_candidates) =
            get_chosen_and_not_chosen_candidates_for_a_list(
                &lists[2].candidate_votes,
                list_2_preferential_nominated_candidate_numbers,
                list_2_other_nominated_candidate_numbers,
            );
        check_chosen_candidates(
            &result.chosen_candidates,
            &lists[2].number,
            &list_2_chosen_candidates,
            &list_2_not_chosen_candidates,
        );

        let (list_3_chosen_candidates, list_3_not_chosen_candidates) =
            get_chosen_and_not_chosen_candidates_for_a_list(
                &lists[3].candidate_votes,
                list_3_preferential_nominated_candidate_numbers,
                list_3_other_nominated_candidate_numbers,
            );
        check_chosen_candidates(
            &result.chosen_candidates,
            &lists[3].number,
            &list_3_chosen_candidates,
            &list_3_not_chosen_candidates,
        );

        let (list_4_chosen_candidates, list_4_not_chosen_candidates) =
            get_chosen_and_not_chosen_candidates_for_a_list(
                &lists[4].candidate_votes,
                list_4_preferential_nominated_candidate_numbers,
                list_4_other_nominated_candidate_numbers,
            );
        check_chosen_candidates(
            &result.chosen_candidates,
            &lists[4].number,
            &list_4_chosen_candidates,
            &list_4_not_chosen_candidates,
        );
    }

    /// Candidate nomination with more candidates eligible for preferential nomination than seats
    ///
    /// List seats: [6, 5, 4, 2, 2]  
    /// List 1: Preferential candidate nominations of candidates 1, 2, 3, 4, 5 and 6 no other candidate nominations  
    /// List 2: Drawing of lots is required for candidates: [1, 2, 3, 4, 5, 6], only 5 seats available
    #[test]
    fn test_with_drawing_of_lots_error() {
        let quota = Fraction::new(9600, 19);
        let input = candidate_nomination_fixture_with_given_number_of_seats(
            quota,
            19,
            vec![
                vec![500, 500, 500, 500, 500, 500],
                vec![400, 400, 400, 400, 400, 400],
                vec![300, 300, 300, 300, 300, 300],
                vec![200, 200, 200, 200, 200, 200],
                vec![200, 200, 200, 200, 200, 200],
            ],
            vec![6, 5, 4, 2, 2],
        );
        let result = candidate_nomination(input.clone());

        assert_eq!(result, Err(ApportionmentError::DrawingOfLotsNotImplemented));
    }
}
