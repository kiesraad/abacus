use axum::http::StatusCode;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::{
    ErrorResponse,
    domain::{
        apportionment::{CandidateDrawn, ListDrawn},
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

#[derive(Clone, Debug, Default, Deserialize, PartialEq, Serialize, ToSchema, strum::Display)]
#[serde(tag = "type")]
pub enum ApportionmentState {
    #[default]
    Uninitialised,
    RegisteringDeceasedCandidates {
        deceased_candidates: Vec<DeceasedCandidate>,
    },
    #[serde(skip)] // TODO remove in next PR
    DrawingLots {
        deceased_candidates: Vec<DeceasedCandidate>,
        lists_drawn: Vec<ListDrawn>,
        candidates_drawn: Vec<CandidateDrawn>,
    },
    Finalised {
        deceased_candidates: Vec<DeceasedCandidate>,
        #[serde(skip)] // TODO remove in next PR
        lists_drawn: Vec<ListDrawn>,
        #[serde(skip)] // TODO remove in next PR
        candidates_drawn: Vec<CandidateDrawn>,
    },
}

impl ApportionmentState {
    pub fn skip_deceased_candidates(self) -> Result<Self, ApportionmentStateError> {
        match self {
            Self::Uninitialised => {
                // TODO go to correct state in https://github.com/kiesraad/abacus/issues/788
                Ok(Self::Finalised {
                    deceased_candidates: Vec::new(),
                    lists_drawn: Vec::new(),
                    candidates_drawn: Vec::new(),
                })
            }
            _ => Err(ApportionmentStateError::InvalidState),
        }
    }

    pub fn register_deceased_candidates(self) -> Result<Self, ApportionmentStateError> {
        match self {
            Self::Uninitialised => Ok(Self::RegisteringDeceasedCandidates {
                deceased_candidates: Vec::new(),
            }),
            _ => Err(ApportionmentStateError::InvalidState),
        }
    }

    pub fn finalise_deceased_candidates(self) -> Result<Self, ApportionmentStateError> {
        match self {
            Self::RegisteringDeceasedCandidates {
                deceased_candidates,
            } => {
                // TODO go to correct state in https://github.com/kiesraad/abacus/issues/788
                Ok(Self::Finalised {
                    deceased_candidates,
                    lists_drawn: Vec::new(),
                    candidates_drawn: Vec::new(),
                })
            }
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

    mod state_transitions {
        use test_log::test;

        use super::*;

        #[test]
        fn skip_deceased_candidates() {
            #[rustfmt::skip]
            let scenarios = vec![
                (Uninitialised, Ok(Finalised { deceased_candidates: vec![], lists_drawn: vec![],candidates_drawn: vec![]})),
                (RegisteringDeceasedCandidates { deceased_candidates: vec![] }, Err(InvalidState)),
                (DrawingLots { deceased_candidates: vec![], lists_drawn: vec![],candidates_drawn: vec![]}, Err(InvalidState)),
                (Finalised { deceased_candidates: vec![], lists_drawn: vec![],candidates_drawn: vec![]}, Err(InvalidState)),
            ];

            for (from, expected) in scenarios {
                assert_eq!(
                    from.clone().skip_deceased_candidates(),
                    expected,
                    "from state {from:?}"
                );
            }
        }

        #[test]
        fn register_deceased_candidates() {
            #[rustfmt::skip]
            let scenarios = vec![
                (Uninitialised, Ok(RegisteringDeceasedCandidates { deceased_candidates: vec![] })),
                (RegisteringDeceasedCandidates { deceased_candidates: vec![] }, Err(InvalidState)),
                (DrawingLots { deceased_candidates: vec![], lists_drawn: vec![],candidates_drawn: vec![]}, Err(InvalidState)),
                (Finalised { deceased_candidates: vec![], lists_drawn: vec![],candidates_drawn: vec![]}, Err(InvalidState)),
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
        fn finalise_deceased_candidates() {
            let candidate = DeceasedCandidate::from(4, 4);

            #[rustfmt::skip]
            let scenarios = vec![
                (Uninitialised, Err(InvalidState)),
                (RegisteringDeceasedCandidates { deceased_candidates: vec![candidate] }, Ok(Finalised { deceased_candidates: vec![candidate], lists_drawn: vec![], candidates_drawn: vec![] })),
                (DrawingLots { deceased_candidates: vec![candidate], lists_drawn: vec![], candidates_drawn: vec![] }, Err(InvalidState)),
                (Finalised { deceased_candidates: vec![], lists_drawn: vec![], candidates_drawn: vec![] }, Err(InvalidState)),
            ];

            for (from, expected) in scenarios {
                assert_eq!(
                    from.clone().finalise_deceased_candidates(),
                    expected,
                    "from {from:?}"
                )
            }
        }

        #[test]
        fn reset() {
            #[rustfmt::skip]
            let scenarios = vec![
                Uninitialised,
                RegisteringDeceasedCandidates { deceased_candidates: Vec::new() },
                DrawingLots { deceased_candidates: vec![], lists_drawn: vec![], candidates_drawn: vec![]},
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
