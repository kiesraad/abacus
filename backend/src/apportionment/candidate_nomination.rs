use crate::{
    apportionment::{ApportionmentError, Fraction},
    data_entry::CandidateVotes,
    election::{Candidate, CandidateNumber, Election, PGNumber, PoliticalGroup},
    summary::ElectionSummary,
};
use serde::{Deserialize, Serialize};
use tracing::{debug, info};
use utoipa::ToSchema;

/// Contains information about the chosen candidates and the candidate list ranking
/// for a specific political group.
#[derive(Debug, PartialEq, Serialize, Deserialize, ToSchema)]
pub struct PoliticalGroupCandidateNomination {
    /// Political group number for which this nomination applies
    #[schema(value_type = u32)]
    pg_number: PGNumber,
    /// Political group name for which this nomination applies
    pub pg_name: String,
    /// The number of seats assigned to this group
    pub pg_seats: u32,
    /// The list of chosen candidates via preferential votes, can be empty
    pub preferential_candidate_nomination: Vec<CandidateVotes>,
    /// The list of other chosen candidates, can be empty
    pub other_candidate_nomination: Vec<CandidateVotes>,
    /// The updated ranking of the whole candidate list, can be empty
    pub updated_candidate_ranking: Vec<Candidate>,
}

#[derive(Debug, PartialEq, Serialize, Deserialize, ToSchema)]
pub struct PreferenceThreshold {
    /// Preference threshold as a percentage (0 to 100)
    pub percentage: u64,
    /// Preference threshold as a number of votes
    pub number_of_votes: Fraction,
}

/// The result of the candidate nomination procedure.  
/// This contains the preference threshold and percentage that was used.  
/// It contains a list of all chosen candidates in alphabetical order.  
/// It also contains the preferential nomination of candidates, the remaining
/// nomination of candidates and the final ranking of candidates for each political group.
#[derive(Debug, PartialEq, Serialize, Deserialize, ToSchema)]
pub struct CandidateNominationResult {
    /// Preference threshold percentage and number of votes
    pub preference_threshold: PreferenceThreshold,
    /// List of chosen candidates in alphabetical order
    pub chosen_candidates: Vec<Candidate>,
    /// List of chosen candidates and candidate list ranking per political group
    pub political_group_candidate_nomination: Vec<PoliticalGroupCandidateNomination>,
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

/// List the candidates nominated with preferential votes
fn preferential_candidate_nomination(
    candidates_meeting_preference_threshold: &[CandidateVotes],
    pg_seats: u32,
) -> Result<Vec<CandidateVotes>, ApportionmentError> {
    let mut preferential_candidate_nomination: Vec<CandidateVotes> = vec![];
    if candidates_meeting_preference_threshold.len() <= pg_seats as usize {
        preferential_candidate_nomination.extend(candidates_meeting_preference_threshold);
    } else {
        // Loop over non-assigned seats
        for (index, non_assigned_seats) in (1..=pg_seats).rev().enumerate() {
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
                // TODO: #788 if multiple political groups have the same largest remainder and not enough residual seats are available, use drawing of lots
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

fn update_candidate_ranking(
    preference_threshold: Fraction,
    candidate_votes_meeting_preference_threshold: &[CandidateVotes],
    candidate_votes: &[CandidateVotes],
    candidates: &[Candidate],
) -> Vec<Candidate> {
    let mut updated_candidate_ranking: Vec<Candidate> = vec![];
    // Add candidates meeting preference threshold to the top of the ranking
    for candidate_votes in candidate_votes_meeting_preference_threshold {
        updated_candidate_ranking.push(candidates[candidate_votes.number as usize - 1].clone());
    }

    // Add the remaining candidates in the order of the original candidate list
    for candidate_votes in candidate_votes
        .iter()
        .filter(|candidate_votes| Fraction::from(candidate_votes.votes) < preference_threshold)
    {
        updated_candidate_ranking.push(candidates[candidate_votes.number as usize - 1].clone());
    }

    updated_candidate_ranking
}

/// This function nominates candidates for the seats each political group has been assigned.  
/// The candidate nomination is first done based on preferential votes and then the other
/// candidates are nominated.
fn candidate_nomination_per_political_group(
    election: &Election,
    totals: &ElectionSummary,
    preference_threshold: Fraction,
    total_seats: &[u32],
) -> Result<Vec<PoliticalGroupCandidateNomination>, ApportionmentError> {
    let mut political_group_candidate_nomination: Vec<PoliticalGroupCandidateNomination> = vec![];
    for pg in election.political_groups.clone().unwrap_or_default() {
        let pg_index = pg.number as usize - 1;
        let pg_seats = total_seats[pg_index];
        let candidate_votes = &totals.political_group_votes[pg_index].candidate_votes;
        let candidate_votes_meeting_preference_threshold =
            candidate_votes_meeting_preference_threshold(preference_threshold, candidate_votes);
        let preferential_candidate_nomination = preferential_candidate_nomination(
            &candidate_votes_meeting_preference_threshold,
            pg_seats,
        )?;

        // [Artikel P 17 Kieswet](https://wetten.overheid.nl/jci1.3:c:BWBR0004627&afdeling=II&hoofdstuk=P&paragraaf=3&artikel=P_17&z=2025-02-12&g=2025-02-12)
        let other_candidate_nomination = other_candidate_nomination(
            &preferential_candidate_nomination,
            candidate_votes,
            pg_seats as usize - preferential_candidate_nomination.len(),
        );

        // [Artikel P 19 Kieswet](https://wetten.overheid.nl/jci1.3:c:BWBR0004627&afdeling=II&hoofdstuk=P&paragraaf=3&artikel=P_19&z=2025-02-12&g=2025-02-12)
        let updated_candidate_ranking: Vec<Candidate> =
            if candidate_votes_meeting_preference_threshold.is_empty()
                || (election.number_of_seats >= 19 && pg_seats == 0)
            {
                vec![]
            } else {
                let updated_ranking = update_candidate_ranking(
                    preference_threshold,
                    &candidate_votes_meeting_preference_threshold,
                    candidate_votes,
                    &pg.candidates,
                );

                // If the updated candidate ranking is the same as the original candidate list,
                // return an empty list, otherwise return the updated list
                if updated_ranking == pg.candidates {
                    vec![]
                } else {
                    updated_ranking
                }
            };

        political_group_candidate_nomination.push(PoliticalGroupCandidateNomination {
            pg_number: pg.number,
            pg_name: pg.name.clone(),
            pg_seats,
            preferential_candidate_nomination,
            other_candidate_nomination,
            updated_candidate_ranking,
        });
    }
    Ok(political_group_candidate_nomination)
}

pub fn sort_candidates_on_last_name_alphabetically(
    mut candidates: Vec<Candidate>,
) -> Vec<Candidate> {
    candidates.sort_by(|a, b| a.last_name.cmp(&b.last_name));
    candidates
}

fn all_sorted_chosen_candidates(
    pgs: Vec<PoliticalGroup>,
    political_group_candidate_nomination: &[PoliticalGroupCandidateNomination],
) -> Vec<Candidate> {
    let mut chosen_candidates: Vec<Candidate> = vec![];
    for pg in pgs {
        let pg_candidate_nomination = &political_group_candidate_nomination[pg.number as usize - 1];
        chosen_candidates.extend(
            pg.candidates
                .iter()
                .filter(|candidate| {
                    pg_candidate_nomination
                        .preferential_candidate_nomination
                        .iter()
                        .any(|cv| cv.number == candidate.number)
                        || pg_candidate_nomination
                            .other_candidate_nomination
                            .iter()
                            .any(|cv| cv.number == candidate.number)
                })
                .cloned(),
        );
    }
    chosen_candidates = sort_candidates_on_last_name_alphabetically(chosen_candidates);
    chosen_candidates
}

/// Candidate nomination
pub fn candidate_nomination(
    election: &Election,
    quota: Fraction,
    totals: &ElectionSummary,
    total_seats: Vec<u32>,
) -> Result<CandidateNominationResult, ApportionmentError> {
    info!("Candidate nomination");

    // [Artikel P 15 Kieswet](https://wetten.overheid.nl/jci1.3:c:BWBR0004627&afdeling=II&hoofdstuk=P&paragraaf=3&artikel=P_15&z=2025-02-12&g=2025-02-12)
    // Calculate preference threshold as a proper fraction
    let preference_threshold_percentage = if election.number_of_seats >= 19 {
        25
    } else {
        50
    };
    let preference_threshold = quota * Fraction::new(preference_threshold_percentage, 100);
    info!(
        "Preference threshold percentage: {}%",
        preference_threshold_percentage
    );
    info!("Preference threshold: {}", preference_threshold);

    let political_group_candidate_nomination = candidate_nomination_per_political_group(
        election,
        totals,
        preference_threshold,
        &total_seats,
    )?;
    debug!(
        "Political group candidate nomination: {:#?}",
        political_group_candidate_nomination
    );

    // Create alphabetically ordered chosen candidates list
    let chosen_candidates = all_sorted_chosen_candidates(
        election.political_groups.clone().unwrap_or_default(),
        &political_group_candidate_nomination,
    );
    debug!(
        "Chosen candidates (sorted alphabetically): {:#?}",
        chosen_candidates
    );

    Ok(CandidateNominationResult {
        preference_threshold: PreferenceThreshold {
            percentage: preference_threshold_percentage,
            number_of_votes: preference_threshold,
        },
        chosen_candidates,
        political_group_candidate_nomination,
    })
}

/// Create a vector containing just the candidate numbers from an iterator of candidate votes
pub fn candidate_votes_numbers(candidate_votes: &[CandidateVotes]) -> Vec<CandidateNumber> {
    candidate_votes
        .iter()
        .map(|candidate| candidate.number)
        .collect()
}

/// Create a vector containing just the candidate numbers from an iterator of candidates
pub fn candidate_numbers(candidates: &[Candidate]) -> Vec<CandidateNumber> {
    candidates
        .iter()
        .map(|candidate| candidate.number)
        .collect()
}

#[cfg(test)]
mod tests {
    use crate::{
        apportionment::{
            ApportionmentError, Fraction, PoliticalGroupCandidateNomination, candidate_nomination,
            candidate_numbers, candidate_votes_numbers,
            sort_candidates_on_last_name_alphabetically,
            test_helpers::election_summary_fixture_with_given_candidate_votes,
        },
        election::{
            Candidate, CandidateGender::X, CandidateNumber,
            tests::election_fixture_with_given_number_of_seats,
        },
    };
    use test_log::test;

    fn check_political_group_candidate_nomination(
        nomination: &PoliticalGroupCandidateNomination,
        expected_preferential_nomination: &[CandidateNumber],
        expected_other_nomination: &[CandidateNumber],
        expected_updated_ranking: &[CandidateNumber],
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
            candidate_numbers(&nomination.updated_candidate_ranking),
            expected_updated_ranking
        );
    }

    fn check_chosen_candidates(
        chosen_candidates: &[Candidate],
        expected_chosen_candidates: &[Candidate],
        expected_not_chosen_candidates: &[Candidate],
    ) {
        assert!(
            expected_chosen_candidates
                .iter()
                .all(|item| chosen_candidates.contains(item))
        );
        assert!(
            expected_not_chosen_candidates
                .iter()
                .all(|item| !chosen_candidates.contains(item))
        );
    }

    fn get_chosen_and_not_chosen_candidates_for_a_pg(
        pg_candidates: &[Candidate],
        pg_preferential_nominated_candidate_numbers: &[CandidateNumber],
        pg_other_nominated_candidate_numbers: &[CandidateNumber],
    ) -> (Vec<Candidate>, Vec<Candidate>) {
        let pg_0_chosen_candidates: Vec<Candidate> = pg_candidates
            .iter()
            .filter(|&c| {
                pg_preferential_nominated_candidate_numbers.contains(&c.number)
                    || pg_other_nominated_candidate_numbers.contains(&c.number)
            })
            .cloned()
            .collect();
        let pg_0_not_chosen_candidates: Vec<Candidate> = pg_candidates
            .iter()
            .filter(|&c| !pg_0_chosen_candidates.contains(c))
            .cloned()
            .collect();
        (pg_0_chosen_candidates, pg_0_not_chosen_candidates)
    }

    /// Candidate nomination with ranking change due to preferential candidate nomination
    ///
    /// Actual case from GR2022  
    /// PG seats: [8, 3, 2, 1, 1]  
    /// PG 1: Preferential candidate nominations of candidates 1, 3, 2 and 4 and other candidate nominations of candidates 5, 6, 7 and 8  
    /// PG 2: Preferential candidate nomination of candidate 1 and other candidate nomination of candidates 2 and 3  
    /// PG 3: Preferential candidate nomination of candidate 1 and other candidate nomination of candidate 2  
    /// PG 4: Preferential candidate nomination of candidate 1 and no other candidate nominations  
    /// PG 5: Preferential candidate nomination of candidate 1 and no other candidate nominations
    #[test]
    fn test_with_lt_19_seats_and_preferential_candidate_nomination_and_updated_candidate_ranking() {
        let election = election_fixture_with_given_number_of_seats(&[12, 17, 11, 6, 6], 15);
        let quota = Fraction::new(5104, 15);
        let totals = election_summary_fixture_with_given_candidate_votes(vec![
            vec![1069, 303, 321, 210, 36, 101, 79, 121, 150, 149, 15, 17],
            vec![
                452, 39, 81, 76, 35, 109, 29, 25, 17, 6, 18, 9, 25, 30, 5, 18, 3,
            ],
            vec![229, 63, 65, 9, 10, 58, 29, 50, 6, 11, 37],
            vec![347, 33, 14, 82, 30, 30],
            vec![266, 36, 39, 36, 38, 38],
        ]);
        let result = candidate_nomination(&election, quota, &totals, vec![8, 3, 2, 1, 1]).unwrap();
        assert_eq!(result.preference_threshold.percentage, 50);
        assert_eq!(
            result.preference_threshold.number_of_votes,
            quota * Fraction::new(result.preference_threshold.percentage, 100)
        );
        check_political_group_candidate_nomination(
            &result.political_group_candidate_nomination[0],
            &[1, 3, 2, 4],
            &[5, 6, 7, 8],
            &[1, 3, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        );
        check_political_group_candidate_nomination(
            &result.political_group_candidate_nomination[1],
            &[1],
            &[2, 3],
            &[],
        );
        check_political_group_candidate_nomination(
            &result.political_group_candidate_nomination[2],
            &[1],
            &[2],
            &[],
        );
        check_political_group_candidate_nomination(
            &result.political_group_candidate_nomination[3],
            &[1],
            &[],
            &[],
        );
        check_political_group_candidate_nomination(
            &result.political_group_candidate_nomination[4],
            &[1],
            &[],
            &[],
        );

        let pgs = election.political_groups.unwrap_or_default();
        check_chosen_candidates(
            &result.chosen_candidates,
            &pgs[0].candidates[..8],
            &pgs[0].candidates[9..],
        );
        check_chosen_candidates(
            &result.chosen_candidates,
            &pgs[1].candidates[..3],
            &pgs[1].candidates[4..],
        );
        check_chosen_candidates(
            &result.chosen_candidates,
            &pgs[2].candidates[..2],
            &pgs[2].candidates[3..],
        );
        check_chosen_candidates(
            &result.chosen_candidates,
            &pgs[3].candidates[..1],
            &pgs[3].candidates[2..],
        );
        check_chosen_candidates(
            &result.chosen_candidates,
            &pgs[4].candidates[..1],
            &pgs[4].candidates[2..],
        );
    }

    /// Candidate nomination with no preferential candidate nomination
    ///
    /// PG seats: [1, 1, 1, 1, 1]  
    /// PG 1: No preferential candidate nominations and other candidate nomination of candidate 1  
    /// PG 2: No preferential candidate nominations and other candidate nomination of candidate 1  
    /// PG 3: No preferential candidate nominations and other candidate nomination of candidate 1  
    /// PG 4: No preferential candidate nominations and other candidate nomination of candidate 1  
    /// PG 5: No preferential candidate nominations and other candidate nomination of candidate 1
    #[test]
    fn test_with_lt_19_seats_and_no_preferential_candidate_nomination() {
        let election = election_fixture_with_given_number_of_seats(&[5, 5, 5, 5, 5], 5);
        let quota = Fraction::new(105, 5);
        let totals = election_summary_fixture_with_given_candidate_votes(vec![
            vec![5, 4, 4, 4, 4],
            vec![4, 5, 4, 4, 4],
            vec![4, 4, 5, 4, 4],
            vec![4, 4, 4, 5, 4],
            vec![4, 4, 4, 4, 5],
        ]);
        let result = candidate_nomination(&election, quota, &totals, vec![1, 1, 1, 1, 1]).unwrap();
        assert_eq!(result.preference_threshold.percentage, 50);
        assert_eq!(
            result.preference_threshold.number_of_votes,
            quota * Fraction::new(result.preference_threshold.percentage, 100)
        );
        check_political_group_candidate_nomination(
            &result.political_group_candidate_nomination[0],
            &[],
            &[1],
            &[],
        );
        check_political_group_candidate_nomination(
            &result.political_group_candidate_nomination[1],
            &[],
            &[1],
            &[],
        );
        check_political_group_candidate_nomination(
            &result.political_group_candidate_nomination[2],
            &[],
            &[1],
            &[],
        );
        check_political_group_candidate_nomination(
            &result.political_group_candidate_nomination[3],
            &[],
            &[1],
            &[],
        );
        check_political_group_candidate_nomination(
            &result.political_group_candidate_nomination[4],
            &[],
            &[1],
            &[],
        );

        let pgs = election.political_groups.unwrap_or_default();
        check_chosen_candidates(
            &result.chosen_candidates,
            &pgs[0].candidates[..1],
            &pgs[0].candidates[2..],
        );
        check_chosen_candidates(
            &result.chosen_candidates,
            &pgs[1].candidates[..1],
            &pgs[1].candidates[2..],
        );
        check_chosen_candidates(
            &result.chosen_candidates,
            &pgs[2].candidates[..1],
            &pgs[2].candidates[2..],
        );
        check_chosen_candidates(
            &result.chosen_candidates,
            &pgs[3].candidates[..1],
            &pgs[3].candidates[2..],
        );
        check_chosen_candidates(
            &result.chosen_candidates,
            &pgs[4].candidates[..1],
            &pgs[4].candidates[2..],
        );
    }

    /// Candidate nomination with more candidates eligible for preferential nomination than seats
    ///
    /// PG seats: [6, 5, 4, 2, 2]  
    /// PG 1: Preferential candidate nominations of candidates 1, 3, 4, 5, 6 and 7 no other candidate nominations  
    /// PG 2: Preferential candidate nomination of candidates 1, 2, 4, 5 and 6 and no other candidate nominations  
    ///       Candidate 7 also meets the preferential threshold but does not get a seat  
    /// PG 3: Preferential candidate nomination of candidate 1, 2, 3 and 5 and no other candidate nominations  
    ///       Candidates 6 and 7 also meet the preferential threshold but do not get seats  
    /// PG 4: Preferential candidate nomination of candidate 1 and 2 and no other candidate nominations  
    ///       Candidates 3, 4, 6 and 7 also meet the preferential threshold but do not get seats  
    /// PG 5: Preferential candidate nomination of candidate 1 and 2 and no other candidate nominations  
    ///       Candidates 4, 5 and 7 also meet the preferential threshold but do not get seats  
    #[test]
    fn test_with_ge_19_seats_and_more_candidates_eligible_for_preferential_nomination_than_seats() {
        let election = election_fixture_with_given_number_of_seats(&[7, 7, 7, 7, 7], 19);
        let quota = Fraction::new(9500, 19);
        let totals = election_summary_fixture_with_given_candidate_votes(vec![
            vec![500, 0, 500, 500, 500, 500, 500],
            vec![400, 400, 0, 400, 400, 400, 399],
            vec![300, 300, 300, 0, 300, 299, 298],
            vec![200, 200, 199, 198, 0, 197, 196],
            vec![200, 200, 199, 198, 198, 0, 119],
        ]);
        let result = candidate_nomination(&election, quota, &totals, vec![6, 5, 4, 2, 2]).unwrap();
        assert_eq!(result.preference_threshold.percentage, 25);
        assert_eq!(
            result.preference_threshold.number_of_votes,
            quota * Fraction::new(result.preference_threshold.percentage, 100)
        );
        let pg_0_preferential_nominated_candidate_numbers = &[1, 3, 4, 5, 6, 7];
        let pg_0_other_nominated_candidate_numbers = &[];
        check_political_group_candidate_nomination(
            &result.political_group_candidate_nomination[0],
            pg_0_preferential_nominated_candidate_numbers,
            pg_0_other_nominated_candidate_numbers,
            &[1, 3, 4, 5, 6, 7, 2],
        );

        let pg_1_preferential_nominated_candidate_numbers = &[1, 2, 4, 5, 6];
        let pg_1_other_nominated_candidate_numbers = &[];
        check_political_group_candidate_nomination(
            &result.political_group_candidate_nomination[1],
            pg_1_preferential_nominated_candidate_numbers,
            pg_1_other_nominated_candidate_numbers,
            &[1, 2, 4, 5, 6, 7, 3],
        );

        let pg_2_preferential_nominated_candidate_numbers = &[1, 2, 3, 5];
        let pg_2_other_nominated_candidate_numbers = &[];
        check_political_group_candidate_nomination(
            &result.political_group_candidate_nomination[2],
            pg_2_preferential_nominated_candidate_numbers,
            pg_2_other_nominated_candidate_numbers,
            &[1, 2, 3, 5, 6, 7, 4],
        );

        let pg_3_preferential_nominated_candidate_numbers = &[1, 2];
        let pg_3_other_nominated_candidate_numbers = &[];
        check_political_group_candidate_nomination(
            &result.political_group_candidate_nomination[3],
            pg_3_preferential_nominated_candidate_numbers,
            pg_3_other_nominated_candidate_numbers,
            &[1, 2, 3, 4, 6, 7, 5],
        );

        let pg_4_preferential_nominated_candidate_numbers = &[1, 2];
        let pg_4_other_nominated_candidate_numbers = &[];
        check_political_group_candidate_nomination(
            &result.political_group_candidate_nomination[4],
            pg_4_preferential_nominated_candidate_numbers,
            pg_4_other_nominated_candidate_numbers,
            &[],
        );

        let pgs = election.political_groups.clone().unwrap_or_default();
        let (pg_0_chosen_candidates, pg_0_not_chosen_candidates) =
            get_chosen_and_not_chosen_candidates_for_a_pg(
                &pgs[0].candidates,
                pg_0_preferential_nominated_candidate_numbers,
                pg_0_other_nominated_candidate_numbers,
            );
        check_chosen_candidates(
            &result.chosen_candidates,
            &pg_0_chosen_candidates,
            &pg_0_not_chosen_candidates,
        );

        let (pg_1_chosen_candidates, pg_1_not_chosen_candidates) =
            get_chosen_and_not_chosen_candidates_for_a_pg(
                &pgs[1].candidates,
                pg_1_preferential_nominated_candidate_numbers,
                pg_1_other_nominated_candidate_numbers,
            );
        check_chosen_candidates(
            &result.chosen_candidates,
            &pg_1_chosen_candidates,
            &pg_1_not_chosen_candidates,
        );

        let (pg_2_chosen_candidates, pg_2_not_chosen_candidates) =
            get_chosen_and_not_chosen_candidates_for_a_pg(
                &pgs[2].candidates,
                pg_2_preferential_nominated_candidate_numbers,
                pg_2_other_nominated_candidate_numbers,
            );
        check_chosen_candidates(
            &result.chosen_candidates,
            &pg_2_chosen_candidates,
            &pg_2_not_chosen_candidates,
        );

        let (pg_3_chosen_candidates, pg_3_not_chosen_candidates) =
            get_chosen_and_not_chosen_candidates_for_a_pg(
                &pgs[3].candidates,
                pg_3_preferential_nominated_candidate_numbers,
                pg_3_other_nominated_candidate_numbers,
            );
        check_chosen_candidates(
            &result.chosen_candidates,
            &pg_3_chosen_candidates,
            &pg_3_not_chosen_candidates,
        );

        let (pg_4_chosen_candidates, pg_4_not_chosen_candidates) =
            get_chosen_and_not_chosen_candidates_for_a_pg(
                &pgs[4].candidates,
                pg_4_preferential_nominated_candidate_numbers,
                pg_4_other_nominated_candidate_numbers,
            );
        check_chosen_candidates(
            &result.chosen_candidates,
            &pg_4_chosen_candidates,
            &pg_4_not_chosen_candidates,
        );
    }

    /// Candidate nomination with more candidates eligible for preferential nomination than seats
    ///
    /// PG seats: [6, 5, 4, 2, 2]  
    /// PG 1: Preferential candidate nominations of candidates 1, 2, 3, 4, 5 and 6 no other candidate nominations  
    /// PG 2: Drawing of lots is required for candidates: [1, 2, 3, 4, 5, 6], only 5 seats available
    #[test]
    fn test_with_drawing_of_lots_error() {
        let election = election_fixture_with_given_number_of_seats(&[6, 6, 6, 6, 6], 19);
        let quota = Fraction::new(9600, 19);
        let totals = election_summary_fixture_with_given_candidate_votes(vec![
            vec![500, 500, 500, 500, 500, 500],
            vec![400, 400, 400, 400, 400, 400],
            vec![300, 300, 300, 300, 300, 300],
            vec![200, 200, 200, 200, 200, 200],
            vec![200, 200, 200, 200, 200, 200],
        ]);
        let result = candidate_nomination(&election, quota, &totals, vec![6, 5, 4, 2, 2]);
        assert_eq!(result, Err(ApportionmentError::DrawingOfLotsNotImplemented));
    }

    /// Test for function sort_candidates_on_last_name_alphabetically
    #[test]
    fn test_sort_candidates_on_last_name_alphabetically() {
        let names = ["Duin", "Korte", "Appel", "Zee", "Groen"];
        let candidates: Vec<Candidate> = (0..5)
            .map(|i| Candidate {
                number: i + 1,
                initials: "A.B.".to_string(),
                first_name: Some(format!("Candidate {}", i + 1)),
                last_name_prefix: if (i % 2) == 0 {
                    Some("van".to_string())
                } else {
                    None
                },
                last_name: names[i as usize].to_string(),
                locality: "Juinen".to_string(),
                country_code: Some("NL".to_string()),
                gender: Some(X),
            })
            .collect();
        let sorted_candidates = sort_candidates_on_last_name_alphabetically(candidates);
        assert_eq!(candidate_numbers(&sorted_candidates), vec![3, 1, 5, 2, 4]);
    }
}
