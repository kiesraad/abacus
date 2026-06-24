use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

use crate::{
    APIError,
    domain::{
        apportionment::{ListDrawingLotsVariant, SeatAssignment, SeatChangeStep},
        election::{PGNumber, PoliticalGroup},
    },
};

#[derive(Debug, Serialize, Deserialize)]
pub struct ApportionmentFootnotes {
    #[serde(skip_serializing_if = "Option::is_none")]
    absolute_majority: Option<FootnotePoliticalGroup>,
    #[serde(skip_serializing_if = "Option::is_none")]
    drawn_lots: Option<Vec<FootnoteDrawnLots>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    exhausted_lists: Option<Vec<FootnotePoliticalGroup>>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "variant")]
pub enum FootnoteDrawnLots {
    HighestAverageResidualSeat { lists: Vec<FootnotePoliticalGroup> },
    LargestRemainderResidualSeat { lists: Vec<FootnotePoliticalGroup> },
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FootnotePoliticalGroup {
    /// Political group number
    number: PGNumber,
    /// Political group display name
    name: String,
}

struct FootnoteSteps<'a> {
    absolute_majority_reassignment: Option<&'a SeatChangeStep>,
    drawn_lots_steps: Vec<&'a SeatChangeStep>,
    list_exhaustion_steps: Vec<&'a SeatChangeStep>,
}

/// Retrieves [SeatChangeStep]s of type AbsoluteMajorityReassignment/ListExhaustionRemoval
fn get_footnote_steps(seat_assignment: &SeatAssignment) -> FootnoteSteps<'_> {
    let mut absolute_majority_reassignment = None;
    let mut drawn_lots_steps = vec![];
    let mut list_exhaustion_steps = vec![];
    for step in &seat_assignment.steps {
        if step.change.is_changed_by_absolute_majority_reassignment() {
            absolute_majority_reassignment = Some(step);
        }
        if step.change.drawn_lots().is_some() {
            drawn_lots_steps.push(step);
        }
        if step.change.is_changed_by_list_exhaustion_removal() {
            list_exhaustion_steps.push(step);
        }
    }
    FootnoteSteps {
        drawn_lots_steps,
        absolute_majority_reassignment,
        list_exhaustion_steps,
    }
}

impl ApportionmentFootnotes {
    fn get_absolute_majority(
        absolute_majority_reassignment: Option<&SeatChangeStep>,
        political_groups: &[PoliticalGroup],
    ) -> Option<FootnotePoliticalGroup> {
        if let Some(absolute_majority) = absolute_majority_reassignment {
            let pg_number = absolute_majority.change.list_number_assigned();
            Some(FootnotePoliticalGroup {
                number: pg_number,
                name: political_groups
                    .iter()
                    .find(|pg| pg.number == pg_number)
                    .expect("political group should exist")
                    .name
                    .clone(),
            })
        } else {
            None
        }
    }

    fn get_drawn_lots(
        drawn_lots_steps: Vec<&SeatChangeStep>,
        political_groups: &[PoliticalGroup],
    ) -> Option<Vec<FootnoteDrawnLots>> {
        let footnote_groups = |options: &[PGNumber]| -> Vec<FootnotePoliticalGroup> {
            options
                .iter()
                .map(|&number| FootnotePoliticalGroup {
                    number,
                    name: political_groups
                        .iter()
                        .find(|pg| pg.number == number)
                        .expect("political group should exist")
                        .name
                        .clone(),
                })
                .collect()
        };

        let mut drawn_lots = vec![];
        for step in drawn_lots_steps {
            let footnote = match step.change.drawn_lots() {
                Some(ListDrawingLotsVariant::HighestAverageResidualSeat(lots)) => {
                    FootnoteDrawnLots::HighestAverageResidualSeat {
                        lists: footnote_groups(&lots.options),
                    }
                }
                Some(ListDrawingLotsVariant::LargestRemainderResidualSeat(lots)) => {
                    FootnoteDrawnLots::LargestRemainderResidualSeat {
                        lists: footnote_groups(&lots.options),
                    }
                }
                // Absolute majority drawing of lots is reported by the absolute majority footnote
                Some(ListDrawingLotsVariant::AbsoluteMajorityHighestAverage(_))
                | Some(ListDrawingLotsVariant::AbsoluteMajorityLargestRemainder(_))
                | None => continue,
            };

            drawn_lots.push(footnote);
        }

        if drawn_lots.is_empty() {
            None
        } else {
            Some(drawn_lots)
        }
    }

    fn get_exhausted_lists(
        list_exhaustion_steps: Vec<&SeatChangeStep>,
        political_groups: &[PoliticalGroup],
    ) -> Option<Vec<FootnotePoliticalGroup>> {
        let mut exhausted_lists = BTreeMap::new();
        for step in list_exhaustion_steps {
            let pg_number = step.change.list_number_retracted();
            exhausted_lists.insert(
                pg_number,
                political_groups
                    .iter()
                    .find(|pg| pg.number == pg_number)
                    .expect("political group should exist")
                    .name
                    .clone(),
            );
        }
        if exhausted_lists.is_empty() {
            None
        } else {
            Some(
                exhausted_lists
                    .into_iter()
                    .map(|(number, name)| FootnotePoliticalGroup { number, name })
                    .collect(),
            )
        }
    }

    pub fn new(
        political_groups: &[PoliticalGroup],
        seat_assignment: &SeatAssignment,
    ) -> Result<Option<Self>, APIError> {
        let footnote_steps = get_footnote_steps(seat_assignment);
        let absolute_majority = Self::get_absolute_majority(
            footnote_steps.absolute_majority_reassignment,
            political_groups,
        );
        let drawn_lots = Self::get_drawn_lots(footnote_steps.drawn_lots_steps, political_groups);
        let exhausted_lists =
            Self::get_exhausted_lists(footnote_steps.list_exhaustion_steps, political_groups);
        if drawn_lots.is_some() || absolute_majority.is_some() || exhausted_lists.is_some() {
            Ok(Some(ApportionmentFootnotes {
                drawn_lots,
                absolute_majority,
                exhausted_lists,
            }))
        } else {
            Ok(None)
        }
    }
}

#[cfg(test)]
mod tests {
    use apportionment::ApportionmentOutput;
    use test_log::test;

    use crate::{
        api::apportionment::{ApportionmentInputData, map_seat_assignment},
        domain::{
            election::{CommitteeCategory, tests::election_fixture_with_given_number_of_seats},
            models::apportionment_footnotes::ApportionmentFootnotes,
            results::political_group_candidate_votes::create_political_group_candidate_votes,
        },
    };

    #[test]
    fn test_apportionment_footnotes_none() {
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
        let list_votes =
            create_political_group_candidate_votes(&election.political_groups, &candidate_votes);
        let apportionment_input =
            ApportionmentInputData::new(election.number_of_seats, &list_votes, &[], &[], &[]);
        let apportionment_result = apportionment::process(&apportionment_input);
        let Ok(ApportionmentOutput::Completed(apportionment)) = apportionment_result else {
            panic!("should be Completed");
        };

        let seat_assignment = map_seat_assignment(&apportionment.seat_assignment);
        let result = ApportionmentFootnotes::new(&election.political_groups, &seat_assignment)
            .expect("ApportionmentFootnotes::new should succeed");
        assert!(result.is_none());
    }

    #[test]
    fn test_apportionment_footnotes_absolute_majority() {
        let candidate_votes = vec![
            vec![1069, 303, 321, 210, 36, 101, 79, 121, 150, 149, 15, 17],
            vec![
                452, 39, 81, 76, 35, 109, 29, 25, 17, 6, 18, 9, 25, 30, 5, 18, 3,
            ],
            vec![229, 63, 65, 9, 10, 58, 29, 50, 6, 11, 37],
            vec![347, 33, 14, 82, 30, 30],
            vec![266, 36, 39, 36, 38, 38],
        ];
        let election = election_fixture_with_given_number_of_seats(
            CommitteeCategory::CSB,
            &candidate_votes
                .iter()
                .map(|cv| u32::try_from(cv.len()).expect("Should fit in u32"))
                .collect::<Vec<u32>>(),
            15,
        );
        let list_votes =
            create_political_group_candidate_votes(&election.political_groups, &candidate_votes);
        let apportionment_input =
            ApportionmentInputData::new(election.number_of_seats, &list_votes, &[], &[], &[]);
        let apportionment_result = apportionment::process(&apportionment_input);
        let Ok(ApportionmentOutput::Completed(apportionment)) = apportionment_result else {
            panic!("should be Completed");
        };

        let seat_assignment = map_seat_assignment(&apportionment.seat_assignment);
        let result = ApportionmentFootnotes::new(&election.political_groups, &seat_assignment)
            .expect("ApportionmentFootnotes::new should succeed");
        assert!(result.is_some());
        let footnotes = result.unwrap();
        assert!(footnotes.exhausted_lists.is_none());
        assert!(footnotes.absolute_majority.is_some());
        let absolute_majority = footnotes.absolute_majority.unwrap();
        assert_eq!(
            absolute_majority.number,
            election.political_groups[0].number
        );
        assert_eq!(absolute_majority.name, election.political_groups[0].name);
    }

    #[test]
    fn test_apportionment_footnotes_exhausted_lists() {
        let candidate_votes = vec![
            vec![80, 70, 60, 50, 40],
            vec![80, 70, 60, 50, 5],
            vec![80, 70, 60, 50, 0],
            vec![80, 40, 0, 0],
            vec![0, 0, 0, 0, 15],
        ];
        let election = election_fixture_with_given_number_of_seats(
            CommitteeCategory::CSB,
            &candidate_votes
                .iter()
                .map(|cv| u32::try_from(cv.len()).expect("Should fit in u32"))
                .collect::<Vec<u32>>(),
            19,
        );
        let list_votes =
            create_political_group_candidate_votes(&election.political_groups, &candidate_votes);
        let apportionment_input =
            ApportionmentInputData::new(election.number_of_seats, &list_votes, &[], &[], &[]);
        let apportionment_result = apportionment::process(&apportionment_input);
        let Ok(ApportionmentOutput::Completed(apportionment)) = apportionment_result else {
            panic!("should be Completed");
        };

        let seat_assignment = map_seat_assignment(&apportionment.seat_assignment);
        let result = ApportionmentFootnotes::new(&election.political_groups, &seat_assignment)
            .expect("ApportionmentFootnotes::new should succeed");
        assert!(result.is_some());
        let footnotes = result.unwrap();
        assert!(footnotes.exhausted_lists.is_some());
        assert!(footnotes.absolute_majority.is_none());
        let exhausted_lists = footnotes.exhausted_lists.unwrap();
        assert_eq!(exhausted_lists.len(), 2);
        assert_eq!(
            exhausted_lists[0].number,
            election.political_groups[0].number
        );
        assert_eq!(exhausted_lists[0].name, election.political_groups[0].name);
        assert_eq!(
            exhausted_lists[1].number,
            election.political_groups[1].number
        );
        assert_eq!(exhausted_lists[1].name, election.political_groups[1].name);
    }
}
