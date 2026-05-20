use serde::{Deserialize, Serialize};

use crate::domain::{
    apportionment::{CandidateNomination, ChosenCandidate, ListCandidateNomination},
    election::{Candidate, ElectionWithPoliticalGroups, PGNumber, PoliticalGroup},
    models::error::ModelsError,
    results::{count::Count, political_group_candidate_votes::CandidateVotes},
};

#[derive(Debug, Serialize, Deserialize)]
pub struct EnrichedCandidateNomination {
    list_candidate_nomination: Vec<EnrichedListCandidateNomination>,
    chosen_candidates: Vec<ChosenCandidate>,
}

impl EnrichedCandidateNomination {
    pub fn new(
        election: &ElectionWithPoliticalGroups,
        candidate_nomination: &CandidateNomination,
    ) -> Result<Self, ModelsError> {
        Ok(EnrichedCandidateNomination {
            chosen_candidates: candidate_nomination.chosen_candidates.clone(),
            list_candidate_nomination: election
              .political_groups
              .iter()
              .map(|pg| {
                  EnrichedListCandidateNomination::new(
                      pg.clone(),
                      candidate_nomination.list_candidate_nomination.iter().find(|cn| cn.list_number == pg.number).ok_or(ModelsError::DataIntegrityError(format!(
                          "No list candidate nomination found for political group number {} in candidate nomination", pg.number
                      )))?,
                  )
              })
              .collect::<Result<Vec<_>, _>>()?,
        })
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EnrichedListCandidateNomination {
    /// Political group number
    list_number: PGNumber,
    /// Political group display name
    list_name: String,
    /// Political group seats
    list_seats: u32,
    /// Columns with seat, votes, and details per preferentially chosen candidate
    preferential_nomination_columns: Vec<CandidateWithSeatTableColumn>,
    /// Columns with seat, votes, and details per other chosen candidate
    other_nomination_columns: Vec<CandidateWithSeatTableColumn>,
    /// Updated candidate ranking or original candidate ranking if not updated
    updated_candidate_ranking: Vec<Candidate>,
}

impl EnrichedListCandidateNomination {
    fn get_candidate_with_seat_table_columns(
        list_candidates: &[Candidate],
        candidate_votes: &[CandidateVotes],
        start_seat_number: usize,
    ) -> Result<Vec<CandidateWithSeatTableColumn>, ModelsError> {
        let mut columns = Vec::new();

        for (idx, chosen_candidate) in candidate_votes.iter().enumerate() {
            let candidate = list_candidates
                .iter()
                .find(|candidate| candidate.number == chosen_candidate.number)
                .ok_or(ModelsError::DataIntegrityError(format!(
                    "No candidate found for candidate number {} in political group candidates",
                    chosen_candidate.number
                )))?;
            columns.push(CandidateWithSeatTableColumn {
                list_seat_number: start_seat_number + idx,
                candidate: candidate.clone(),
                votes: chosen_candidate.votes,
            })
        }
        Ok(columns)
    }

    pub fn new(
        group: PoliticalGroup,
        list_candidate_nomination: &ListCandidateNomination,
    ) -> Result<Self, ModelsError> {
        let preferential_nomination_columns = Self::get_candidate_with_seat_table_columns(
            &group.candidates,
            &list_candidate_nomination.preferential_candidate_nomination,
            1,
        )?;
        let other_nomination_columns = Self::get_candidate_with_seat_table_columns(
            &group.candidates,
            &list_candidate_nomination.other_candidate_nomination,
            preferential_nomination_columns.len() + 1,
        )?;

        Ok(Self {
            list_number: list_candidate_nomination.list_number,
            list_name: list_candidate_nomination.list_name.clone(),
            list_seats: list_candidate_nomination.list_seats,
            preferential_nomination_columns,
            other_nomination_columns,
            updated_candidate_ranking: if list_candidate_nomination
                .updated_candidate_ranking
                .is_empty()
            {
                group.candidates
            } else {
                list_candidate_nomination.updated_candidate_ranking.clone()
            },
        })
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CandidateWithSeatTableColumn {
    /// Seat number candidate received
    list_seat_number: usize,
    /// Candidate
    candidate: Candidate,
    /// Number of votes
    votes: Count,
}

#[cfg(test)]
mod tests {
    use test_log::test;

    use crate::{
        api::apportionment::{ApportionmentInputData, map_candidate_nomination},
        domain::{
            election::{CommitteeCategory, tests::election_fixture_with_given_number_of_seats},
            models::enriched_candidate_nomination::EnrichedCandidateNomination,
            results::political_group_candidate_votes::create_political_group_candidate_votes,
        },
    };

    #[test]
    fn test_enriched_candidate_nomination() {
        let candidate_votes = vec![
            vec![1069, 303, 321, 210, 36, 101, 79, 121, 150, 181],
            vec![452, 39, 81, 274, 131],
            vec![229, 147, 191],
            vec![347, 100],
            vec![266, 187],
        ];
        let election = election_fixture_with_given_number_of_seats(
            CommitteeCategory::CSB,
            &candidate_votes
                .iter()
                .map(|cv| u32::try_from(cv.len()).expect("Should fit in u32"))
                .collect::<Vec<u32>>(),
            15,
        );
        let political_groups = &election.political_groups;
        let list_votes = create_political_group_candidate_votes(political_groups, candidate_votes);
        let apportionment_input =
            ApportionmentInputData::new(election.number_of_seats, &list_votes, &[]);
        let apportionment_result =
            apportionment::process(&apportionment_input).expect("apportionment failed");
        let candidate_nomination = map_candidate_nomination(
            &apportionment_result.candidate_nomination,
            political_groups.clone(),
        );
        let result = EnrichedCandidateNomination::new(&election, &candidate_nomination)
            .expect("EnrichedCandidateNomination::new should succeed");
        assert_eq!(
            result.chosen_candidates,
            candidate_nomination.chosen_candidates
        );

        let lcn = result.list_candidate_nomination;
        assert_eq!(
            lcn[0].updated_candidate_ranking,
            candidate_nomination.list_candidate_nomination[0].updated_candidate_ranking
        );
        // Check preferential nomination columns of list 1
        let lcn_0_pnc = &lcn[0].preferential_nomination_columns;
        assert_eq!(lcn_0_pnc.len(), 5);
        assert_eq!(lcn_0_pnc[0].candidate, political_groups[0].candidates[0]);
        assert_eq!(lcn_0_pnc[0].votes, 1069);
        assert_eq!(lcn_0_pnc[0].list_seat_number, 1);
        assert_eq!(lcn_0_pnc[1].candidate, political_groups[0].candidates[2]);
        assert_eq!(lcn_0_pnc[1].votes, 321);
        assert_eq!(lcn_0_pnc[1].list_seat_number, 2);
        assert_eq!(lcn_0_pnc[2].candidate, political_groups[0].candidates[1]);
        assert_eq!(lcn_0_pnc[2].votes, 303);
        assert_eq!(lcn_0_pnc[2].list_seat_number, 3);
        assert_eq!(lcn_0_pnc[3].candidate, political_groups[0].candidates[3]);
        assert_eq!(lcn_0_pnc[3].votes, 210);
        assert_eq!(lcn_0_pnc[3].list_seat_number, 4);
        assert_eq!(lcn_0_pnc[4].candidate, political_groups[0].candidates[9]);
        assert_eq!(lcn_0_pnc[4].votes, 181);
        assert_eq!(lcn_0_pnc[4].list_seat_number, 5);
        // Check other nomination columns of list 1
        let lcn_0_onc = &lcn[0].other_nomination_columns;
        assert_eq!(lcn_0_onc.len(), 3);
        assert_eq!(lcn_0_onc[0].candidate, political_groups[0].candidates[4]);
        assert_eq!(lcn_0_onc[0].votes, 36);
        assert_eq!(lcn_0_onc[0].list_seat_number, 6);
        assert_eq!(lcn_0_onc[1].candidate, political_groups[0].candidates[5]);
        assert_eq!(lcn_0_onc[1].votes, 101);
        assert_eq!(lcn_0_onc[1].list_seat_number, 7);
        assert_eq!(lcn_0_onc[2].candidate, political_groups[0].candidates[6]);
        assert_eq!(lcn_0_onc[2].votes, 79);
        assert_eq!(lcn_0_onc[2].list_seat_number, 8);

        assert_eq!(
            lcn[1].updated_candidate_ranking,
            candidate_nomination.list_candidate_nomination[1].updated_candidate_ranking
        );
        // Check preferential nomination columns of list 2
        let lcn_1_pnc = &lcn[1].preferential_nomination_columns;
        assert_eq!(lcn_1_pnc.len(), 2);
        assert_eq!(lcn_1_pnc[0].candidate, political_groups[1].candidates[0]);
        assert_eq!(lcn_1_pnc[0].votes, 452);
        assert_eq!(lcn_1_pnc[0].list_seat_number, 1);
        assert_eq!(lcn_1_pnc[1].candidate, political_groups[1].candidates[3]);
        assert_eq!(lcn_1_pnc[1].votes, 274);
        assert_eq!(lcn_1_pnc[1].list_seat_number, 2);
        // Check other nomination columns of list 2
        let lcn_1_onc = &lcn[1].other_nomination_columns;
        assert_eq!(lcn_1_onc.len(), 1);
        assert_eq!(lcn_1_onc[0].candidate, political_groups[1].candidates[1]);
        assert_eq!(lcn_1_onc[0].votes, 39);
        assert_eq!(lcn_1_onc[0].list_seat_number, 3);

        assert_eq!(
            lcn[2].updated_candidate_ranking,
            candidate_nomination.list_candidate_nomination[2].updated_candidate_ranking
        );
        // Check preferential nomination columns of list 3
        let lcn_2_pnc = &lcn[2].preferential_nomination_columns;
        assert_eq!(lcn_2_pnc.len(), 2);
        assert_eq!(lcn_2_pnc[0].candidate, political_groups[2].candidates[0]);
        assert_eq!(lcn_2_pnc[0].votes, 229);
        assert_eq!(lcn_2_pnc[0].list_seat_number, 1);
        assert_eq!(lcn_2_pnc[1].candidate, political_groups[2].candidates[2]);
        assert_eq!(lcn_2_pnc[1].votes, 191);
        assert_eq!(lcn_2_pnc[1].list_seat_number, 2);
        // Check other nomination columns of list 3
        let lcn_2_onc = &lcn[2].other_nomination_columns;
        assert_eq!(lcn_2_onc.len(), 0);

        assert_eq!(
            lcn[3].updated_candidate_ranking,
            political_groups[3].candidates
        );
        // Check preferential nomination columns of list 4
        let lcn_3_pnc = &lcn[3].preferential_nomination_columns;
        assert_eq!(lcn_3_pnc.len(), 1);
        assert_eq!(lcn_3_pnc[0].candidate, political_groups[3].candidates[0]);
        assert_eq!(lcn_3_pnc[0].votes, 347);
        assert_eq!(lcn_3_pnc[0].list_seat_number, 1);
        // Check other nomination columns of list 4
        let lcn_3_onc = &lcn[3].other_nomination_columns;
        assert_eq!(lcn_3_onc.len(), 0);

        assert_eq!(
            lcn[4].updated_candidate_ranking,
            political_groups[4].candidates
        );
        // Check preferential nomination columns of list 5
        let lcn_4_pnc = &lcn[4].preferential_nomination_columns;
        assert_eq!(lcn_4_pnc.len(), 1);
        assert_eq!(lcn_4_pnc[0].candidate, political_groups[4].candidates[0]);
        assert_eq!(lcn_4_pnc[0].votes, 266);
        assert_eq!(lcn_4_pnc[0].list_seat_number, 1);
        // Check other nomination columns of list 5
        let lcn_4_onc = &lcn[4].other_nomination_columns;
        assert_eq!(lcn_4_onc.len(), 0);
    }
}
