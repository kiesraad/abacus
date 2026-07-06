use std::collections::{HashMap, HashSet};

use apportionment;
use serde::Serialize;
use utoipa::ToSchema;

use crate::domain::{
    apportionment::{
        AbsoluteMajorityDrawingLots, ApportionmentWarning, CandidateDrawingLotsVariant,
        CandidateDrawn, CandidateNomination, HighestAverageResidualSeatDrawingLots,
        LargestRemainderResidualSeatDrawingLots, ListAverage, ListDrawingLotsVariant, ListDrawn,
        ListRemainder, SeatAssignment,
    },
    apportionment_state::DeceasedCandidate,
    election::{CandidateNumber, PGNumber},
    results::political_group_candidate_votes::{CandidateVotes, PoliticalGroupCandidateVotes},
    summary::ElectionSummary,
};

#[derive(Clone, Debug)]
pub struct ApportionmentInputData<'a> {
    pub number_of_seats: u32,
    pub list_votes: &'a [PoliticalGroupCandidateVotes],
    pub deceased_candidates: HashMap<PGNumber, HashSet<CandidateNumber>>,
    pub lists_drawn: &'a [ListDrawn],
    pub candidates_drawn: &'a [CandidateDrawn],
}

impl<'a> ApportionmentInputData<'a> {
    pub fn new(
        number_of_seats: u32,
        list_votes: &'a [PoliticalGroupCandidateVotes],
        deceased_candidates: &[DeceasedCandidate],
        lists_drawn: &'a [ListDrawn],
        candidates_drawn: &'a [CandidateDrawn],
    ) -> Self {
        let mut grouped: HashMap<PGNumber, HashSet<CandidateNumber>> = HashMap::new();

        for dc in deceased_candidates {
            grouped
                .entry(dc.pg_number)
                .or_default()
                .insert(dc.candidate_number);
        }

        Self {
            number_of_seats,
            list_votes,
            deceased_candidates: grouped,
            lists_drawn,
            candidates_drawn,
        }
    }
}

impl<'a> apportionment::ApportionmentInput for ApportionmentInputData<'a> {
    type List = PoliticalGroupCandidateVotes;
    type ListDrawn = ListDrawn;
    type CandidateDrawn = CandidateDrawn;

    fn number_of_seats(&self) -> u32 {
        self.number_of_seats
    }

    fn list_votes(&self) -> &[Self::List] {
        self.list_votes
    }

    fn deceased_candidates(&self) -> &HashMap<PGNumber, HashSet<CandidateNumber>> {
        &self.deceased_candidates
    }

    fn lists_drawn(&self) -> impl Iterator<Item = &ListDrawn> {
        self.lists_drawn.iter()
    }

    fn candidates_drawn(&self) -> impl Iterator<Item = &CandidateDrawn> {
        self.candidates_drawn.iter()
    }
}

impl apportionment::ListVotes for PoliticalGroupCandidateVotes {
    type Cv = CandidateVotes;
    type ListNumber = PGNumber;

    fn number(&self) -> Self::ListNumber {
        self.number
    }

    fn candidate_votes(&self) -> &[Self::Cv] {
        &self.candidate_votes
    }
}

impl apportionment::CandidateVotes for CandidateVotes {
    type CandidateNumber = CandidateNumber;

    fn number(&self) -> Self::CandidateNumber {
        self.number
    }

    fn votes(&self) -> u32 {
        self.votes
    }
}

impl From<ListDrawingLotsVariant> for apportionment::ListDrawingLotsVariant<PGNumber> {
    fn from(value: ListDrawingLotsVariant) -> Self {
        match value {
            ListDrawingLotsVariant::HighestAverageResidualSeat(
                HighestAverageResidualSeatDrawingLots {
                    max_average,
                    residual_seat_numbers,
                    options,
                    list_averages,
                },
            ) => Self::HighestAverageResidualSeat(
                apportionment::HighestAverageResidualSeatDrawingLots {
                    max_average: max_average.into(),
                    residual_seat_numbers,
                    options,
                    list_averages: list_averages
                        .into_iter()
                        .map(|ListAverage { pg_number, average }| (pg_number, average.into()))
                        .collect(),
                },
            ),
            ListDrawingLotsVariant::LargestRemainderResidualSeat(
                LargestRemainderResidualSeatDrawingLots {
                    max_remainder,
                    residual_seat_numbers,
                    options,
                    list_remainders,
                },
            ) => Self::LargestRemainderResidualSeat(
                apportionment::LargestRemainderResidualSeatDrawingLots {
                    max_remainder: max_remainder.into(),
                    residual_seat_numbers,
                    options,
                    list_remainders: list_remainders
                        .into_iter()
                        .map(
                            |ListRemainder {
                                 pg_number,
                                 remainder,
                             }| (pg_number, remainder.into()),
                        )
                        .collect(),
                },
            ),
            ListDrawingLotsVariant::AbsoluteMajorityHighestAverage(
                AbsoluteMajorityDrawingLots { assign_to, options },
            ) => Self::AbsoluteMajorityHighestAverage(apportionment::AbsoluteMajorityDrawingLots {
                assign_to,
                options,
            }),
            ListDrawingLotsVariant::AbsoluteMajorityLargestRemainder(
                AbsoluteMajorityDrawingLots { assign_to, options },
            ) => {
                Self::AbsoluteMajorityLargestRemainder(apportionment::AbsoluteMajorityDrawingLots {
                    assign_to,
                    options,
                })
            }
        }
    }
}

impl apportionment::ListDrawn<PGNumber> for ListDrawn {
    fn variant(&self) -> apportionment::ListDrawingLotsVariant<PGNumber> {
        self.variant.clone().into()
    }

    fn drawn(&self) -> &PGNumber {
        &self.drawn
    }
}

impl From<CandidateDrawingLotsVariant>
    for apportionment::CandidateDrawingLotsVariant<PGNumber, CandidateNumber>
{
    fn from(
        CandidateDrawingLotsVariant {
            list,
            number_of_votes,
            seat_numbers,
            options,
        }: CandidateDrawingLotsVariant,
    ) -> Self {
        Self {
            list,
            number_of_votes,
            seat_numbers,
            options,
        }
    }
}

impl apportionment::CandidateDrawn<PGNumber, CandidateNumber> for CandidateDrawn {
    fn variant(&self) -> apportionment::CandidateDrawingLotsVariant<PGNumber, CandidateNumber> {
        self.variant.clone().into()
    }

    fn drawn(&self) -> &CandidateNumber {
        &self.drawn
    }
}

#[derive(Debug, Serialize, ToSchema, PartialEq)]
pub struct ElectionApportionmentResponse {
    pub seat_assignment: SeatAssignment,
    pub candidate_nomination: CandidateNomination,
    pub election_summary: ElectionSummary,
    pub warnings: Vec<ApportionmentWarning>,
}
