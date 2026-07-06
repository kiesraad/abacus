use axum::http::StatusCode;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::{
    ErrorResponse,
    domain::{
        apportionment::{
            CandidateDrawingLotsVariant, CandidateDrawn, ListDrawingLotsVariant, ListDrawn,
        },
        election::{CandidateNumber, PGNumber},
    },
    error::{ApiErrorResponse, ErrorReference},
};

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ApportionmentStateError {
    CandidateNotFound,
    CandidateNotUnique,
    InvalidState,
}

impl ApiErrorResponse for ApportionmentStateError {
    fn to_response_parts(&self) -> (StatusCode, ErrorResponse) {
        match self {
            ApportionmentStateError::CandidateNotFound => (
                StatusCode::CONFLICT,
                ErrorResponse::new("Candidate not found", ErrorReference::EntryNotFound, false),
            ),
            ApportionmentStateError::CandidateNotUnique => (
                StatusCode::CONFLICT,
                ErrorResponse::new(
                    "Candidate not unique",
                    ErrorReference::EntryNotUnique,
                    false,
                ),
            ),
            ApportionmentStateError::InvalidState => (
                StatusCode::CONFLICT,
                ErrorResponse::new(
                    "Invalid state",
                    ErrorReference::InvalidStateTransition,
                    false,
                ),
            ),
        }
    }
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Serialize, ToSchema)]
pub struct DeceasedCandidate {
    pub pg_number: PGNumber,
    pub candidate_number: CandidateNumber,
}

#[cfg(test)]
impl DeceasedCandidate {
    pub fn from(pg_number: u32, candidate_number: u32) -> Self {
        Self {
            pg_number: PGNumber::from(pg_number),
            candidate_number: CandidateNumber::from(candidate_number),
        }
    }
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize, ToSchema)]
#[serde(tag = "type")]
pub enum DrawingLotsRequired {
    ListDrawingLotsRequired(ListDrawingLotsVariant),
    CandidateDrawingLotsRequired(CandidateDrawingLotsVariant),
}

#[derive(Clone, Debug, Default, Deserialize, PartialEq, Serialize, ToSchema, strum::Display)]
#[serde(tag = "type")]
pub enum ApportionmentState {
    #[default]
    Uninitialised,
    RegisteringDeceasedCandidates {
        deceased_candidates: Vec<DeceasedCandidate>,
    },
    DrawingLots {
        drawing_lots_required: DrawingLotsRequired,
        deceased_candidates: Vec<DeceasedCandidate>,
        lists_drawn: Vec<ListDrawn>,
        candidates_drawn: Vec<CandidateDrawn>,
    },
    Finalised {
        deceased_candidates: Vec<DeceasedCandidate>,
        lists_drawn: Vec<ListDrawn>,
        candidates_drawn: Vec<CandidateDrawn>,
    },
}

impl ApportionmentState {
    pub fn register_deceased_candidates(self) -> Result<Self, ApportionmentStateError> {
        match self {
            Self::Uninitialised => Ok(Self::RegisteringDeceasedCandidates {
                deceased_candidates: Vec::new(),
            }),
            _ => Err(ApportionmentStateError::InvalidState),
        }
    }

    pub fn draw_lots(
        self,
        drawing_lots_required: DrawingLotsRequired,
    ) -> Result<Self, ApportionmentStateError> {
        match self {
            Self::Uninitialised => Ok(Self::DrawingLots {
                drawing_lots_required,
                deceased_candidates: Vec::new(),
                lists_drawn: Vec::new(),
                candidates_drawn: Vec::new(),
            }),
            Self::RegisteringDeceasedCandidates {
                deceased_candidates,
            } => Ok(Self::DrawingLots {
                drawing_lots_required,
                deceased_candidates,
                lists_drawn: Vec::new(),
                candidates_drawn: Vec::new(),
            }),
            Self::DrawingLots {
                deceased_candidates,
                lists_drawn,
                candidates_drawn,
                ..
            } => Ok(Self::DrawingLots {
                drawing_lots_required,
                deceased_candidates,
                lists_drawn,
                candidates_drawn,
            }),
            _ => Err(ApportionmentStateError::InvalidState),
        }
    }

    pub fn add_list_drawn(self, list_drawn: ListDrawn) -> Result<Self, ApportionmentStateError> {
        match self {
            Self::DrawingLots {
                drawing_lots_required,
                deceased_candidates,
                mut lists_drawn,
                candidates_drawn,
            } => Ok(Self::DrawingLots {
                drawing_lots_required,
                deceased_candidates,
                lists_drawn: {
                    lists_drawn.push(list_drawn);
                    lists_drawn
                },
                candidates_drawn,
            }),
            _ => Err(ApportionmentStateError::InvalidState),
        }
    }

    pub fn get_lists_drawn(&self) -> &[ListDrawn] {
        match self {
            ApportionmentState::Uninitialised
            | ApportionmentState::RegisteringDeceasedCandidates { .. } => &[],
            ApportionmentState::DrawingLots { lists_drawn, .. }
            | ApportionmentState::Finalised { lists_drawn, .. } => lists_drawn,
        }
    }

    pub fn add_candidate_drawn(
        self,
        candidate_drawn: CandidateDrawn,
    ) -> Result<Self, ApportionmentStateError> {
        match self {
            Self::DrawingLots {
                drawing_lots_required,
                deceased_candidates,
                lists_drawn,
                mut candidates_drawn,
            } => Ok(Self::DrawingLots {
                drawing_lots_required,
                deceased_candidates,
                lists_drawn,
                candidates_drawn: {
                    candidates_drawn.push(candidate_drawn);
                    candidates_drawn
                },
            }),
            _ => Err(ApportionmentStateError::InvalidState),
        }
    }

    pub fn get_candidates_drawn(&self) -> &[CandidateDrawn] {
        match self {
            ApportionmentState::Uninitialised
            | ApportionmentState::RegisteringDeceasedCandidates { .. } => &[],
            ApportionmentState::DrawingLots {
                candidates_drawn, ..
            }
            | ApportionmentState::Finalised {
                candidates_drawn, ..
            } => candidates_drawn,
        }
    }

    pub fn finalise(self) -> Result<Self, ApportionmentStateError> {
        match self {
            Self::Uninitialised => Ok(Self::Finalised {
                deceased_candidates: Vec::new(),
                lists_drawn: Vec::new(),
                candidates_drawn: Vec::new(),
            }),
            Self::RegisteringDeceasedCandidates {
                deceased_candidates,
            } => Ok(Self::Finalised {
                deceased_candidates,
                lists_drawn: Vec::new(),
                candidates_drawn: Vec::new(),
            }),
            Self::DrawingLots {
                deceased_candidates,
                lists_drawn,
                candidates_drawn,
                ..
            } => Ok(Self::Finalised {
                deceased_candidates,
                lists_drawn,
                candidates_drawn,
            }),

            _ => Err(ApportionmentStateError::InvalidState),
        }
    }

    pub fn get_deceased_candidates(&self) -> &[DeceasedCandidate] {
        match self {
            Self::Uninitialised => &[],
            Self::RegisteringDeceasedCandidates {
                deceased_candidates,
            }
            | Self::Finalised {
                deceased_candidates,
                ..
            }
            | Self::DrawingLots {
                deceased_candidates,
                ..
            } => deceased_candidates,
        }
    }

    pub fn add_deceased_candidate(
        self,
        candidate: DeceasedCandidate,
    ) -> Result<Self, ApportionmentStateError> {
        match self {
            Self::RegisteringDeceasedCandidates {
                mut deceased_candidates,
            } => {
                if deceased_candidates.contains(&candidate) {
                    return Err(ApportionmentStateError::CandidateNotUnique);
                }

                deceased_candidates.push(candidate);

                Ok(Self::RegisteringDeceasedCandidates {
                    deceased_candidates,
                })
            }
            _ => Err(ApportionmentStateError::InvalidState),
        }
    }

    pub fn delete_deceased_candidate(
        self,
        candidate: DeceasedCandidate,
    ) -> Result<Self, ApportionmentStateError> {
        match self {
            Self::RegisteringDeceasedCandidates {
                mut deceased_candidates,
            } => {
                if !deceased_candidates.contains(&candidate) {
                    return Err(ApportionmentStateError::CandidateNotFound);
                }

                deceased_candidates.retain(|c| *c != candidate);

                Ok(Self::RegisteringDeceasedCandidates {
                    deceased_candidates,
                })
            }
            _ => Err(ApportionmentStateError::InvalidState),
        }
    }

    pub fn is_finalised(&self) -> bool {
        matches!(self, Self::Finalised { .. })
    }

    pub fn reset(self) -> Result<Self, ApportionmentStateError> {
        Ok(Self::Uninitialised)
    }
}

#[cfg(test)]
mod tests {
    use ApportionmentState::*;
    use ApportionmentStateError::*;

    use super::*;
    use crate::domain::apportionment::{AbsoluteMajorityDrawingLots, CandidateDrawingLotsVariant};

    fn list_required() -> DrawingLotsRequired {
        DrawingLotsRequired::ListDrawingLotsRequired(
            ListDrawingLotsVariant::AbsoluteMajorityHighestAverage(AbsoluteMajorityDrawingLots {
                assign_to: PGNumber::from(1),
                options: PGNumber::from_values(vec![8, 9]),
            }),
        )
    }

    fn list_drawn() -> ListDrawn {
        let DrawingLotsRequired::ListDrawingLotsRequired(variant) = list_required() else {
            panic!("should be ListDrawingLotsRequired");
        };

        ListDrawn {
            variant,
            drawn: PGNumber::from(8),
        }
    }

    fn candidate_required() -> DrawingLotsRequired {
        DrawingLotsRequired::CandidateDrawingLotsRequired(CandidateDrawingLotsVariant {
            list: PGNumber::from(1),
            total_seats: 2,
            number_of_votes: 1000,
            seat_numbers: vec![1, 2, 3],
            options: CandidateNumber::from_values(vec![3, 4, 5]),
        })
    }

    fn candidate_drawn() -> CandidateDrawn {
        let DrawingLotsRequired::CandidateDrawingLotsRequired(variant) = candidate_required()
        else {
            panic!("should be CandidateDrawingLotsRequired");
        };

        CandidateDrawn {
            variant,
            drawn: CandidateNumber::from(4),
        }
    }

    mod state_transitions {
        use test_log::test;

        use super::*;

        #[test]
        fn draw_lots() {
            #[rustfmt::skip]
            let scenarios = vec![
                (Uninitialised, Ok(DrawingLots { drawing_lots_required: candidate_required(), deceased_candidates: vec![], lists_drawn: vec![],candidates_drawn: vec![]})),
                (RegisteringDeceasedCandidates { deceased_candidates: vec![] }, Ok(DrawingLots { drawing_lots_required: candidate_required(), deceased_candidates: vec![], lists_drawn: vec![],candidates_drawn: vec![]})),
                (DrawingLots { drawing_lots_required: list_required(), deceased_candidates: vec![], lists_drawn: vec![],candidates_drawn: vec![]}, Ok(DrawingLots { drawing_lots_required: candidate_required(), deceased_candidates: vec![], lists_drawn: vec![],candidates_drawn: vec![]})),
                (Finalised { deceased_candidates: vec![], lists_drawn: vec![],candidates_drawn: vec![]}, Err(InvalidState)),
            ];

            for (from, expected) in scenarios {
                assert_eq!(
                    from.clone().draw_lots(candidate_required()),
                    expected,
                    "from state {from:?}"
                );
            }
        }

        #[test]
        fn add_list_drawn() {
            let state = DrawingLots {
                drawing_lots_required: list_required(),
                deceased_candidates: vec![],
                lists_drawn: vec![],
                candidates_drawn: vec![],
            };

            assert_eq!(
                state
                    .add_list_drawn(list_drawn())
                    .expect("add_list_drawn should succeed"),
                DrawingLots {
                    drawing_lots_required: list_required(),
                    deceased_candidates: vec![],
                    lists_drawn: vec![list_drawn()],
                    candidates_drawn: vec![],
                }
            );
        }

        #[test]
        fn add_list_drawn_invalid() {
            #[rustfmt::skip]
            let invalid_states = vec![
                Uninitialised,
                RegisteringDeceasedCandidates {deceased_candidates: Vec::new() },
                Finalised {deceased_candidates: vec![],lists_drawn: vec![],candidates_drawn: vec![] },
            ];

            for state in invalid_states {
                assert_eq!(
                    state.clone().add_list_drawn(list_drawn()),
                    Err(InvalidState),
                    "from {state:?}"
                );
            }
        }

        #[test]
        fn add_candidate_drawn() {
            let state = DrawingLots {
                drawing_lots_required: candidate_required(),
                deceased_candidates: vec![],
                lists_drawn: vec![],
                candidates_drawn: vec![],
            };

            assert_eq!(
                state
                    .add_candidate_drawn(candidate_drawn())
                    .expect("add_candidate_drawn should succeed"),
                DrawingLots {
                    drawing_lots_required: candidate_required(),
                    deceased_candidates: vec![],
                    lists_drawn: vec![],
                    candidates_drawn: vec![candidate_drawn()],
                }
            );
        }

        #[test]
        fn add_candidate_drawn_invalid() {
            #[rustfmt::skip]
            let invalid_states = vec![
                Uninitialised,
                RegisteringDeceasedCandidates {deceased_candidates: Vec::new() },
                Finalised {deceased_candidates: vec![],lists_drawn: vec![],candidates_drawn: vec![] },
            ];

            for state in invalid_states {
                assert_eq!(
                    state.clone().add_candidate_drawn(CandidateDrawn {
                        variant: CandidateDrawingLotsVariant {
                            list: PGNumber::from(1),
                            total_seats: 2,
                            number_of_votes: 1000,
                            seat_numbers: vec![1, 2, 3],
                            options: CandidateNumber::from_values(vec![3, 4, 5]),
                        },
                        drawn: CandidateNumber::from(4),
                    }),
                    Err(InvalidState),
                    "from {state:?}"
                );
            }
        }

        #[test]
        fn register_deceased_candidates() {
            #[rustfmt::skip]
            let scenarios = vec![
                (Uninitialised, Ok(RegisteringDeceasedCandidates { deceased_candidates: vec![] })),
                (RegisteringDeceasedCandidates { deceased_candidates: vec![] }, Err(InvalidState)),
                (DrawingLots { drawing_lots_required: list_required(), deceased_candidates: vec![], lists_drawn: vec![],candidates_drawn: vec![]}, Err(InvalidState)),
                (Finalised { deceased_candidates: vec![], lists_drawn: vec![], candidates_drawn: vec![]}, Err(InvalidState)),
            ];

            for (from, expected) in scenarios {
                assert_eq!(
                    from.clone().register_deceased_candidates(),
                    expected,
                    "from {from:?}"
                )
            }
        }

        #[test]
        fn finalise() {
            let candidate = DeceasedCandidate::from(4, 4);

            #[rustfmt::skip]
            let scenarios = vec![
                (Uninitialised, Ok(Finalised { deceased_candidates: vec![], lists_drawn: vec![], candidates_drawn: vec![] })),
                (RegisteringDeceasedCandidates { deceased_candidates: vec![candidate] }, Ok(Finalised { deceased_candidates: vec![candidate], lists_drawn: vec![], candidates_drawn: vec![] })),
                (DrawingLots { drawing_lots_required: candidate_required(), deceased_candidates: vec![candidate], lists_drawn: vec![], candidates_drawn: vec![] }, Ok(Finalised { deceased_candidates: vec![candidate], lists_drawn: vec![], candidates_drawn: vec![] })),
                (Finalised { deceased_candidates: vec![], lists_drawn: vec![], candidates_drawn: vec![] }, Err(InvalidState)),
            ];

            for (from, expected) in scenarios {
                assert_eq!(from.clone().finalise(), expected, "from {from:?}")
            }
        }

        #[test]
        fn reset() {
            #[rustfmt::skip]
            let scenarios = vec![
                Uninitialised,
                RegisteringDeceasedCandidates { deceased_candidates: Vec::new() },
                DrawingLots { drawing_lots_required: candidate_required(), deceased_candidates: vec![], lists_drawn: vec![], candidates_drawn: vec![]},
                Finalised {deceased_candidates: vec![], lists_drawn: vec![], candidates_drawn: vec![]},
            ];

            for state in scenarios {
                assert_eq!(state.clone().reset(), Ok(Uninitialised), "from {state:?}")
            }
        }

        mod deceased_candidates {
            use test_log::test;

            use super::*;

            #[test]
            fn invalid_state() {
                let candidate_4 = DeceasedCandidate::from(4, 4);
                let candidate_13 = DeceasedCandidate::from(4, 13);

                let invalid_states = vec![
                    Uninitialised,
                    DrawingLots {
                        drawing_lots_required: candidate_required(),
                        deceased_candidates: vec![],
                        lists_drawn: vec![],
                        candidates_drawn: vec![],
                    },
                    Finalised {
                        deceased_candidates: vec![candidate_4],
                        lists_drawn: vec![],
                        candidates_drawn: vec![],
                    },
                ];

                for state in invalid_states {
                    assert_eq!(
                        state.clone().add_deceased_candidate(candidate_13),
                        Err(InvalidState),
                        "from {state:?}"
                    );

                    assert_eq!(
                        state.clone().delete_deceased_candidate(candidate_4),
                        Err(InvalidState),
                        "from {state:?}"
                    );
                }
            }

            #[test]
            fn add_deceased_candidate() {
                let candidate_4 = DeceasedCandidate::from(4, 4);
                let candidate_13 = DeceasedCandidate::from(4, 13);

                // Start with empty list
                let status = RegisteringDeceasedCandidates {
                    deceased_candidates: vec![],
                };

                // Add successfully
                let status = status.add_deceased_candidate(candidate_4).unwrap();
                assert_eq!(
                    status,
                    RegisteringDeceasedCandidates {
                        deceased_candidates: vec![candidate_4]
                    }
                );

                // Add another successfully
                let status = status.add_deceased_candidate(candidate_13).unwrap();
                assert_eq!(
                    status,
                    RegisteringDeceasedCandidates {
                        deceased_candidates: vec![candidate_4, candidate_13]
                    }
                );

                // Try to add again will return an error and do nothing
                let result = status.add_deceased_candidate(candidate_13);
                assert_eq!(result, Err(CandidateNotUnique));
            }

            #[test]
            fn delete_deceased_candidate() {
                let candidate_4 = DeceasedCandidate::from(4, 4);
                let candidate_13 = DeceasedCandidate::from(4, 13);

                // Start with one candidate
                let status = RegisteringDeceasedCandidates {
                    deceased_candidates: vec![candidate_4],
                };

                // Try to delete a different candidate will return an error and do nothing
                let result = status.clone().delete_deceased_candidate(candidate_13);
                assert_eq!(result, Err(CandidateNotFound));

                // Delete successfully
                let status = status.delete_deceased_candidate(candidate_4).unwrap();
                assert_eq!(
                    status,
                    RegisteringDeceasedCandidates {
                        deceased_candidates: vec![]
                    }
                );

                // Try to delete again will return an error
                let result = status.delete_deceased_candidate(candidate_4);
                assert_eq!(result, Err(CandidateNotFound));
            }
        }
    }
}
