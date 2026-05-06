use axum::http::StatusCode;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::{
    ErrorResponse,
    domain::election::{CandidateNumber, PGNumber},
    error::{ApiErrorResponse, ErrorReference, error_response},
};

#[derive(Debug, PartialEq)]
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
                error_response("Candidate not found", ErrorReference::EntryNotFound, false),
            ),
            ApportionmentStateError::CandidateNotUnique => (
                StatusCode::CONFLICT,
                error_response(
                    "Candidate not unique",
                    ErrorReference::EntryNotUnique,
                    false,
                ),
            ),
            ApportionmentStateError::InvalidState => (
                StatusCode::CONFLICT,
                error_response(
                    "Invalid state",
                    ErrorReference::InvalidStateTransition,
                    false,
                ),
            ),
        }
    }
}

#[derive(Clone, Debug, Default, Deserialize, PartialEq, Serialize, ToSchema)]

pub enum ApportionmentState {
    #[default]
    Uninitialised,
    RegisteringDeceasedCandidates {
        deceased_candidates: Vec<(PGNumber, CandidateNumber)>,
    },
    // TODO add new states in https://github.com/kiesraad/abacus/issues/788
    Finalised {
        deceased_candidates: Vec<(PGNumber, CandidateNumber)>,
    },
}

impl ApportionmentState {
    pub fn skip_deceased_candidates(self) -> Result<Self, ApportionmentStateError> {
        match self {
            Self::Uninitialised => {
                // TODO go to correct state in https://github.com/kiesraad/abacus/issues/788
                Ok(Self::Finalised {
                    deceased_candidates: Vec::new(),
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
                })
            }
            _ => Err(ApportionmentStateError::InvalidState),
        }
    }

    pub fn add_deceased_candidate(
        self,
        pg_number: PGNumber,
        candidate_number: CandidateNumber,
    ) -> Result<Self, ApportionmentStateError> {
        match self {
            Self::RegisteringDeceasedCandidates {
                mut deceased_candidates,
            } => {
                if deceased_candidates.contains(&(pg_number, candidate_number)) {
                    return Err(ApportionmentStateError::CandidateNotUnique);
                }

                deceased_candidates.push((pg_number, candidate_number));

                Ok(Self::RegisteringDeceasedCandidates {
                    deceased_candidates,
                })
            }
            _ => Err(ApportionmentStateError::InvalidState),
        }
    }

    pub fn delete_deceased_candidate(
        self,
        pg_number: PGNumber,
        candidate_number: CandidateNumber,
    ) -> Result<Self, ApportionmentStateError> {
        match self {
            Self::RegisteringDeceasedCandidates {
                mut deceased_candidates,
            } => {
                if !deceased_candidates.contains(&(pg_number, candidate_number)) {
                    return Err(ApportionmentStateError::CandidateNotFound);
                }

                deceased_candidates.retain(|(p, c)| *p != pg_number || *c != candidate_number);

                Ok(Self::RegisteringDeceasedCandidates {
                    deceased_candidates,
                })
            }
            _ => Err(ApportionmentStateError::InvalidState),
        }
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
                (Uninitialised, Ok(Finalised { deceased_candidates: vec![] })),
                (RegisteringDeceasedCandidates { deceased_candidates: vec![] }, Err(InvalidState)),
                (Finalised { deceased_candidates: vec![] }, Err(InvalidState)),
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
                (Finalised { deceased_candidates: vec![] }, Err(InvalidState)),
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
            let dc = || vec![(PGNumber::from(3), CandidateNumber::from(5))];

            #[rustfmt::skip]
            let scenarios = vec![
                (Uninitialised, Err(InvalidState)),
                (RegisteringDeceasedCandidates { deceased_candidates: dc() }, Ok(Finalised { deceased_candidates: dc() })),
                (Finalised {deceased_candidates: Vec::new()}, Err(InvalidState)),
            ];

            for (from, expected) in scenarios {
                assert_eq!(
                    from.clone().finalise_deceased_candidates(),
                    expected,
                    "from {from:?}"
                )
            }
        }

        mod deceased_candidates {
            use test_log::test;

            use super::*;

            #[test]
            fn invalid_state() {
                let pg_4: PGNumber = PGNumber::from(4);
                let candidate_4: CandidateNumber = CandidateNumber::from(4);
                let candidate_13: CandidateNumber = CandidateNumber::from(13);

                let invalid_states = vec![
                    Uninitialised,
                    Finalised {
                        deceased_candidates: vec![(pg_4, candidate_4)],
                    },
                ];

                for state in invalid_states {
                    assert_eq!(
                        state.clone().add_deceased_candidate(pg_4, candidate_13),
                        Err(InvalidState),
                        "from {state:?}"
                    );

                    assert_eq!(
                        state.clone().delete_deceased_candidate(pg_4, candidate_4),
                        Err(InvalidState),
                        "from {state:?}"
                    );
                }
            }

            #[test]
            fn add_deceased_candidate() {
                let pg_4: PGNumber = PGNumber::from(4);
                let candidate_4: CandidateNumber = CandidateNumber::from(4);
                let candidate_13: CandidateNumber = CandidateNumber::from(13);

                // Start with empty list
                let status = RegisteringDeceasedCandidates {
                    deceased_candidates: vec![],
                };

                // Add successfully
                let status = status.add_deceased_candidate(pg_4, candidate_4).unwrap();
                assert_eq!(
                    status,
                    RegisteringDeceasedCandidates {
                        deceased_candidates: vec![(pg_4, candidate_4)]
                    }
                );

                // Add another successfully
                let status = status.add_deceased_candidate(pg_4, candidate_13).unwrap();
                assert_eq!(
                    status,
                    RegisteringDeceasedCandidates {
                        deceased_candidates: vec![(pg_4, candidate_4), (pg_4, candidate_13)]
                    }
                );

                // Try to add again will return an error and do nothing
                let result = status.add_deceased_candidate(pg_4, candidate_13);
                assert_eq!(result, Err(CandidateNotUnique));
            }

            #[test]
            fn delete_deceased_candidate() {
                let pg_4: PGNumber = PGNumber::from(4);
                let candidate_4: CandidateNumber = CandidateNumber::from(4);
                let candidate_13: CandidateNumber = CandidateNumber::from(13);

                // Start with one candidate
                let status = RegisteringDeceasedCandidates {
                    deceased_candidates: vec![(pg_4, candidate_4)],
                };

                // Try to delete a different candidate will return an error and do nothing
                let result = status.clone().delete_deceased_candidate(pg_4, candidate_13);
                assert_eq!(result, Err(CandidateNotFound));

                // Delete successfully
                let status = status.delete_deceased_candidate(pg_4, candidate_4).unwrap();
                assert_eq!(
                    status,
                    RegisteringDeceasedCandidates {
                        deceased_candidates: vec![]
                    }
                );

                // Try to delete again will return an error
                let result = status.delete_deceased_candidate(pg_4, candidate_4);
                assert_eq!(result, Err(CandidateNotFound));
            }
        }
    }
}
