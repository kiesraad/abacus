use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

use crate::{
    APIError,
    domain::{
        apportionment::{ListDrawingLotsVariant, SeatChangeStep},
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
fn get_footnote_steps(steps: &[SeatChangeStep]) -> FootnoteSteps<'_> {
    let mut absolute_majority_reassignment = None;
    let mut drawn_lots_steps = vec![];
    let mut list_exhaustion_steps = vec![];
    for step in steps {
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
        steps: &[SeatChangeStep],
    ) -> Result<Option<Self>, APIError> {
        let footnote_steps = get_footnote_steps(steps);
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
    use test_log::test;

    use super::*;
    use crate::domain::{
        apportionment::{
            AbsoluteMajorityDrawingLots, AbsoluteMajorityReassignedSeat,
            HighestAverageAssignedSeat, HighestAverageResidualSeatDrawingLots,
            LargestRemainderAssignedSeat, LargestRemainderResidualSeatDrawingLots,
            ListExhaustionRemovedSeat, SeatChange,
        },
        election::tests::political_groups_with_candidates,
    };

    fn change_step(change: SeatChange) -> SeatChangeStep {
        SeatChangeStep {
            residual_seat_number: None,
            change,
            standings: vec![],
        }
    }

    /// * `seat_variant` - Can be HighestAverageAssignment/UniqueHighestAverageAssignment
    fn highest_average_step(
        seat_variant: impl FnOnce(HighestAverageAssignedSeat) -> SeatChange,
        selected: u32,
        options: &[u32],
    ) -> SeatChangeStep {
        let drawing_lots = (!options.is_empty()).then(|| {
            ListDrawingLotsVariant::HighestAverageResidualSeat(
                HighestAverageResidualSeatDrawingLots {
                    options: PGNumber::from_values(options.iter().copied()),
                    ..Default::default()
                },
            )
        });

        change_step(seat_variant(HighestAverageAssignedSeat {
            selected_list_number: PGNumber::from(selected),
            drawing_lots,
            ..Default::default()
        }))
    }

    fn largest_remainder_step(selected: u32, options: &[u32]) -> SeatChangeStep {
        let drawing_lots = (!options.is_empty()).then(|| {
            ListDrawingLotsVariant::LargestRemainderResidualSeat(
                LargestRemainderResidualSeatDrawingLots {
                    options: PGNumber::from_values(options.iter().copied()),
                    ..Default::default()
                },
            )
        });

        change_step(SeatChange::LargestRemainderAssignment(
            LargestRemainderAssignedSeat {
                selected_list_number: PGNumber::from(selected),
                drawing_lots,
                ..Default::default()
            },
        ))
    }

    /// * `lot_variant` - Can be AbsoluteMajorityHighestAverage/AbsoluteMajorityLargestRemainder
    fn absolute_majority_step(
        lot_variant: impl FnOnce(AbsoluteMajorityDrawingLots) -> ListDrawingLotsVariant,
        retracted: u32,
        assigned: u32,
        options: &[u32],
    ) -> SeatChangeStep {
        let drawing_lots = (!options.is_empty()).then(|| {
            lot_variant(AbsoluteMajorityDrawingLots {
                options: PGNumber::from_values(options.iter().copied()),
                ..Default::default()
            })
        });

        change_step(SeatChange::AbsoluteMajorityReassignment(
            AbsoluteMajorityReassignedSeat {
                list_retracted_seat: PGNumber::from(retracted),
                list_assigned_seat: PGNumber::from(assigned),
                drawing_lots,
            },
        ))
    }

    fn exhaustion_step(retracted: u32) -> SeatChangeStep {
        change_step(SeatChange::ListExhaustionRemoval(
            ListExhaustionRemovedSeat {
                list_retracted_seat: PGNumber::from(retracted),
                full_seat: true,
            },
        ))
    }

    fn get_footnotes(steps: &[SeatChangeStep]) -> Option<ApportionmentFootnotes> {
        let political_groups = political_groups_with_candidates(&[1, 1, 1, 1, 1]);
        ApportionmentFootnotes::new(&political_groups, steps)
            .expect("ApportionmentFootnotes::new should succeed")
    }

    #[test]
    fn test_none_for_empty_steps() {
        assert!(get_footnotes(&[]).is_none());
    }

    #[test]
    fn test_none_for_non_footnote_steps() {
        // A step which is not drawing lots, exhaustion or absolute majority.
        let steps = vec![highest_average_step(
            SeatChange::HighestAverageAssignment,
            1,
            &[],
        )];
        assert!(get_footnotes(&steps).is_none());
    }

    #[test]
    fn test_majority_highest_average_footnote() {
        let variants = vec![
            ListDrawingLotsVariant::AbsoluteMajorityHighestAverage,
            ListDrawingLotsVariant::AbsoluteMajorityLargestRemainder,
        ];

        for variant in variants {
            let steps = vec![absolute_majority_step(variant, 3, 1, &[])];
            let footnotes = get_footnotes(&steps).expect("footnotes should be present");

            assert!(footnotes.drawn_lots.is_none());
            assert!(footnotes.exhausted_lists.is_none());
            let absolute_majority = footnotes
                .absolute_majority
                .expect("absolute majority footnote should be present");
            assert_eq!(absolute_majority.number, PGNumber::from(1));
            assert_eq!(absolute_majority.name, "Political group 1");
        }
    }

    #[test]
    fn test_drawn_lots_averages() {
        let steps = vec![highest_average_step(
            SeatChange::HighestAverageAssignment,
            1,
            &[1, 2],
        )];
        let footnotes = get_footnotes(&steps).expect("footnotes should be present");

        assert!(footnotes.absolute_majority.is_none());
        assert!(footnotes.exhausted_lists.is_none());
        let drawn_lots = footnotes
            .drawn_lots
            .expect("drawn lots footnote should be present");
        assert_eq!(drawn_lots.len(), 1);

        let FootnoteDrawnLots::HighestAverageResidualSeat { lists } = &drawn_lots[0] else {
            panic!("expected HighestAverageResidualSeat variant");
        };
        assert_eq!(lists.len(), 2);
        assert_eq!(lists[0].number, PGNumber::from(1));
        assert_eq!(lists[0].name, "Political group 1");
        assert_eq!(lists[1].number, PGNumber::from(2));
        assert_eq!(lists[1].name, "Political group 2");
    }

    #[test]
    fn test_drawn_lots_remainders() {
        let steps = vec![largest_remainder_step(2, &[2, 3])];
        let footnotes = get_footnotes(&steps).expect("footnotes should be present");

        assert!(footnotes.absolute_majority.is_none());
        assert!(footnotes.exhausted_lists.is_none());
        let drawn_lots = footnotes
            .drawn_lots
            .expect("drawn lots footnote should be present");
        assert_eq!(drawn_lots.len(), 1);

        let FootnoteDrawnLots::LargestRemainderResidualSeat { lists } = &drawn_lots[0] else {
            panic!("expected LargestRemainderResidualSeat variant");
        };
        assert_eq!(lists[0].number, PGNumber::from(2));
        assert_eq!(lists[0].name, "Political group 2");
        assert_eq!(lists[1].number, PGNumber::from(3));
        assert_eq!(lists[1].name, "Political group 3");
    }

    #[test]
    fn test_drawn_lots_unique_highest_average() {
        let steps = vec![highest_average_step(
            SeatChange::UniqueHighestAverageAssignment,
            1,
            &[1, 2],
        )];
        let footnotes = get_footnotes(&steps).expect("footnotes should be present");

        let drawn_lots = footnotes
            .drawn_lots
            .expect("drawn lots footnote should be present");
        assert_eq!(drawn_lots.len(), 1);
        assert!(matches!(
            &drawn_lots[0],
            FootnoteDrawnLots::HighestAverageResidualSeat { .. }
        ));
    }

    #[test]
    fn test_drawn_lots_absolute_majority_variant_skipped() {
        // The absolute majority variant is skipped, but the absolute majority
        // footnote should be present.
        let steps = vec![absolute_majority_step(
            ListDrawingLotsVariant::AbsoluteMajorityHighestAverage,
            3,
            1,
            &[1, 3],
        )];
        let footnotes = get_footnotes(&steps).expect("footnotes should be present");

        assert!(footnotes.drawn_lots.is_none());
        let absolute_majority = footnotes
            .absolute_majority
            .expect("absolute majority footnote should be present");
        assert_eq!(absolute_majority.number, PGNumber::from(1));
    }

    #[test]
    fn test_drawn_lots_preserve_step_order() {
        let steps = vec![
            highest_average_step(SeatChange::HighestAverageAssignment, 3, &[3, 4]),
            highest_average_step(SeatChange::HighestAverageAssignment, 1, &[1, 2]),
            highest_average_step(SeatChange::HighestAverageAssignment, 2, &[2, 3]),
        ];
        let footnotes = get_footnotes(&steps).expect("footnotes should be present");

        let drawn_lots = footnotes
            .drawn_lots
            .expect("drawn lots footnote should be present");
        assert_eq!(drawn_lots.len(), 3);
        assert!(matches!(
            &drawn_lots[0],
            FootnoteDrawnLots::HighestAverageResidualSeat { lists }
                if lists[0].number == PGNumber::from(3)
        ));
        assert!(matches!(
            &drawn_lots[1],
            FootnoteDrawnLots::HighestAverageResidualSeat { lists }
                if lists[0].number == PGNumber::from(1)
        ));
        assert!(matches!(
            &drawn_lots[2],
            FootnoteDrawnLots::HighestAverageResidualSeat { lists }
                if lists[0].number == PGNumber::from(2)
        ));
    }

    #[test]
    fn test_drawn_lots_not_deduplicated() {
        // Two steps with drawing lots assigning the same list each produce their own footnote entry.
        let steps = vec![
            highest_average_step(SeatChange::HighestAverageAssignment, 1, &[1, 2]),
            largest_remainder_step(1, &[1, 3]),
        ];
        let footnotes = get_footnotes(&steps).expect("footnotes should be present");

        let drawn_lots = footnotes
            .drawn_lots
            .expect("drawn lots footnote should be present");
        assert_eq!(drawn_lots.len(), 2);
        assert!(matches!(
            &drawn_lots[0],
            FootnoteDrawnLots::HighestAverageResidualSeat { .. }
        ));
        assert!(matches!(
            &drawn_lots[1],
            FootnoteDrawnLots::LargestRemainderResidualSeat { .. }
        ));
    }

    #[test]
    fn test_exhausted_lists() {
        let steps = vec![exhaustion_step(1), exhaustion_step(2)];
        let footnotes = get_footnotes(&steps).expect("footnotes should be present");

        assert!(footnotes.absolute_majority.is_none());
        assert!(footnotes.drawn_lots.is_none());
        let exhausted_lists = footnotes
            .exhausted_lists
            .expect("exhausted lists footnote should be present");
        assert_eq!(exhausted_lists.len(), 2);
        assert_eq!(exhausted_lists[0].number, PGNumber::from(1));
        assert_eq!(exhausted_lists[0].name, "Political group 1");
        assert_eq!(exhausted_lists[1].number, PGNumber::from(2));
        assert_eq!(exhausted_lists[1].name, "Political group 2");
    }

    #[test]
    fn test_exhausted_lists_sorted_and_deduplicated() {
        // The BTreeMap sorts ascending and deduplicates.
        let steps = vec![exhaustion_step(3), exhaustion_step(1), exhaustion_step(3)];
        let footnotes = get_footnotes(&steps).expect("footnotes should be present");

        let exhausted_lists = footnotes
            .exhausted_lists
            .expect("exhausted lists footnote should be present");
        assert_eq!(exhausted_lists.len(), 2);
        assert_eq!(exhausted_lists[0].number, PGNumber::from(1));
        assert_eq!(exhausted_lists[0].name, "Political group 1");
        assert_eq!(exhausted_lists[1].number, PGNumber::from(3));
        assert_eq!(exhausted_lists[1].name, "Political group 3");
    }

    #[test]
    fn test_all_footnotes() {
        let steps = vec![
            absolute_majority_step(
                ListDrawingLotsVariant::AbsoluteMajorityHighestAverage,
                4,
                1,
                &[],
            ),
            highest_average_step(SeatChange::HighestAverageAssignment, 2, &[2, 3]),
            exhaustion_step(5),
        ];
        let footnotes = get_footnotes(&steps).expect("footnotes should be present");

        assert!(footnotes.absolute_majority.is_some());
        assert!(footnotes.drawn_lots.is_some());
        assert!(footnotes.exhausted_lists.is_some());
    }
}
