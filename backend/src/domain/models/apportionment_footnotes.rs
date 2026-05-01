use serde::{Deserialize, Serialize};

use crate::{
    APIError,
    domain::{
        apportionment::{SeatAssignment, SeatChangeStep},
        election::{PGNumber, PoliticalGroup},
    },
};

#[derive(Debug, Serialize, Deserialize)]
pub struct ApportionmentFootnotes {
    #[serde(skip_serializing_if = "Option::is_none")]
    absolute_majority: Option<AbsoluteMajority>,
    #[serde(skip_serializing_if = "Option::is_none")]
    exhausted_lists: Option<Vec<ExhaustedList>>,
}

struct FootnoteSteps<'a> {
    absolute_majority_reassignment: Option<&'a SeatChangeStep>,
    list_exhaustion_steps: Vec<&'a SeatChangeStep>,
}

/// Retrieves [SeatChangeStep]s of type AbsoluteMajorityReassignment/ListExhaustionRemoval
fn get_footnote_steps(seat_assignment: &SeatAssignment) -> FootnoteSteps<'_> {
    let mut absolute_majority_reassignment = None;
    let mut list_exhaustion_steps = vec![];
    for step in &seat_assignment.steps {
        if step.change.is_changed_by_absolute_majority_reassignment() {
            absolute_majority_reassignment = Some(step);
        }
        if step.change.is_changed_by_list_exhaustion_removal() {
            list_exhaustion_steps.push(step);
        }
    }
    FootnoteSteps {
        absolute_majority_reassignment,
        list_exhaustion_steps,
    }
}

impl ApportionmentFootnotes {
    pub fn get_absolute_majority(
        absolute_majority_reassignment: Option<&SeatChangeStep>,
        political_groups: &[PoliticalGroup],
    ) -> Option<AbsoluteMajority> {
        if let Some(absolute_majority) = absolute_majority_reassignment {
            let pg_number = absolute_majority.change.list_number_assigned();
            Some(AbsoluteMajority {
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

    pub fn get_exhausted_lists(
        list_exhaustion_steps: Vec<&SeatChangeStep>,
        political_groups: &[PoliticalGroup],
    ) -> Option<Vec<ExhaustedList>> {
        let mut unique_exhausted_list_numbers = Vec::new();
        let mut exhausted_lists = Vec::new();
        for step in list_exhaustion_steps {
            let pg_number = step.change.list_number_retracted();
            if !unique_exhausted_list_numbers.contains(&pg_number) {
                unique_exhausted_list_numbers.push(pg_number);
                exhausted_lists.push(ExhaustedList {
                    number: pg_number,
                    name: political_groups
                        .iter()
                        .find(|pg| pg.number == pg_number)
                        .expect("political group should exist")
                        .name
                        .clone(),
                })
            }
        }
        if exhausted_lists.is_empty() {
            None
        } else {
            Some(exhausted_lists)
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
        let exhausted_lists =
            Self::get_exhausted_lists(footnote_steps.list_exhaustion_steps, political_groups);
        if absolute_majority.is_some() || exhausted_lists.is_some() {
            Ok(Some(ApportionmentFootnotes {
                absolute_majority,
                exhausted_lists,
            }))
        } else {
            Ok(None)
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AbsoluteMajority {
    /// Political group number
    number: PGNumber,
    /// Political group display name
    name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExhaustedList {
    /// Political group number
    number: PGNumber,
    /// Political group display name
    name: String,
}
