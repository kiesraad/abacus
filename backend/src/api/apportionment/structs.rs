use apportionment::{self};
use serde::Serialize;
use utoipa::ToSchema;

use crate::{
    api::election::ElectionDetails,
    domain::{
        data_entry::{CandidateVotes, PoliticalGroupCandidateVotes},
        election::{self, Candidate, PGNumber},
        summary::ElectionSummary,
    },
    infra::audit_log::{AsAuditEvent, AuditEvent, AuditEventType, as_audit_event},
};

#[derive(Serialize)]
pub struct ApportionmentCreated(pub ElectionDetails);
as_audit_event!(ApportionmentCreated, AuditEventType::ApportionmentCreated);

#[derive(Clone, Debug)]
pub struct ApportionmentInputData {
    pub number_of_seats: u32,
    pub list_votes: Vec<PoliticalGroupCandidateVotes>,
}

impl apportionment::ApportionmentInput for ApportionmentInputData {
    type List = PoliticalGroupCandidateVotes;

    fn number_of_seats(&self) -> u32 {
        self.number_of_seats
    }

    fn list_votes(&self) -> &[Self::List] {
        &self.list_votes
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
    type CandidateNumber = election::CandidateNumber;

    fn number(&self) -> Self::CandidateNumber {
        self.number
    }

    fn votes(&self) -> u32 {
        self.votes
    }
}

/// Fraction with the integer part split out for display purposes
#[derive(Debug, Serialize, ToSchema)]
pub struct DisplayFraction {
    pub integer: u64,
    pub numerator: u64,
    pub denominator: u64,
}

impl From<apportionment::Fraction> for DisplayFraction {
    fn from(fraction: apportionment::Fraction) -> Self {
        let remainder = fraction.fractional_part();
        Self {
            integer: fraction.integer_part(),
            numerator: remainder.numerator,
            denominator: remainder.denominator,
        }
    }
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ElectionApportionmentResponse {
    pub seat_assignment: SeatAssignment,
    pub candidate_nomination: CandidateNomination,
    pub election_summary: ElectionSummary,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct SeatAssignment {
    pub seats: u32,
    pub full_seats: u32,
    pub residual_seats: u32,
    pub quota: DisplayFraction,
    pub steps: Vec<SeatChangeStep>,
    pub final_standing: Vec<ListSeatAssignment>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct SeatChangeStep {
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub residual_seat_number: Option<u32>,
    pub change: SeatChange,
    pub standings: Vec<ListStanding>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(deny_unknown_fields, tag = "changed_by")]
pub enum SeatChange {
    HighestAverageAssignment(HighestAverageAssignedSeat),
    UniqueHighestAverageAssignment(HighestAverageAssignedSeat),
    LargestRemainderAssignment(LargestRemainderAssignedSeat),
    AbsoluteMajorityReassignment(AbsoluteMajorityReassignedSeat),
    ListExhaustionRemoval(ListExhaustionRemovedSeat),
}

#[derive(Debug, Serialize, ToSchema)]
pub struct HighestAverageAssignedSeat {
    pub selected_list_number: PGNumber,
    pub list_options: Vec<PGNumber>,
    pub list_assigned: Vec<PGNumber>,
    pub list_exhausted: Vec<PGNumber>,
    pub votes_per_seat: DisplayFraction,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct LargestRemainderAssignedSeat {
    pub selected_list_number: PGNumber,
    pub list_options: Vec<PGNumber>,
    pub list_assigned: Vec<PGNumber>,
    pub remainder_votes: DisplayFraction,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct AbsoluteMajorityReassignedSeat {
    pub list_retracted_seat: PGNumber,
    pub list_assigned_seat: PGNumber,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ListExhaustionRemovedSeat {
    pub list_retracted_seat: PGNumber,
    pub full_seat: bool,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ListStanding {
    pub list_number: PGNumber,
    pub votes_cast: u64,
    pub remainder_votes: DisplayFraction,
    pub meets_remainder_threshold: bool,
    pub next_votes_per_seat: DisplayFraction,
    pub full_seats: u32,
    pub residual_seats: u32,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ListSeatAssignment {
    pub list_number: PGNumber,
    pub votes_cast: u64,
    pub remainder_votes: DisplayFraction,
    pub meets_remainder_threshold: bool,
    pub full_seats: u32,
    pub residual_seats: u32,
    pub total_seats: u32,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct CandidateNomination {
    pub preference_threshold: PreferenceThreshold,
    pub chosen_candidates: Vec<Candidate>,
    pub list_candidate_nomination: Vec<ListCandidateNomination>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct PreferenceThreshold {
    pub percentage: u64,
    pub number_of_votes: DisplayFraction,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ListCandidateNomination {
    pub list_number: PGNumber,
    pub list_name: String,
    pub list_seats: u32,
    pub preferential_candidate_nomination: Vec<CandidateVotes>,
    pub other_candidate_nomination: Vec<CandidateVotes>,
    pub updated_candidate_ranking: Vec<Candidate>,
}

impl From<apportionment::SeatChange<PGNumber>> for SeatChange {
    fn from(change: apportionment::SeatChange<PGNumber>) -> Self {
        use apportionment::SeatChange::*;

        let as_highest_avg =
            |c: apportionment::HighestAverageAssignedSeat<PGNumber>| HighestAverageAssignedSeat {
                selected_list_number: c.selected_list_number,
                list_options: c.list_options,
                list_assigned: c.list_assigned,
                list_exhausted: c.list_exhausted,
                votes_per_seat: DisplayFraction::from(c.votes_per_seat),
            };

        match change {
            HighestAverageAssignment(c) => SeatChange::HighestAverageAssignment(as_highest_avg(c)),
            UniqueHighestAverageAssignment(c) => {
                SeatChange::UniqueHighestAverageAssignment(as_highest_avg(c))
            }
            LargestRemainderAssignment(c) => {
                SeatChange::LargestRemainderAssignment(LargestRemainderAssignedSeat {
                    selected_list_number: c.selected_list_number,
                    list_options: c.list_options,
                    list_assigned: c.list_assigned,
                    remainder_votes: DisplayFraction::from(c.remainder_votes),
                })
            }
            AbsoluteMajorityReassignment(c) => {
                SeatChange::AbsoluteMajorityReassignment(AbsoluteMajorityReassignedSeat {
                    list_retracted_seat: c.list_retracted_seat,
                    list_assigned_seat: c.list_assigned_seat,
                })
            }
            ListExhaustionRemoval(c) => {
                SeatChange::ListExhaustionRemoval(ListExhaustionRemovedSeat {
                    list_retracted_seat: c.list_retracted_seat,
                    full_seat: c.full_seat,
                })
            }
        }
    }
}

impl From<apportionment::SeatChangeStep<PGNumber>> for SeatChangeStep {
    fn from(step: apportionment::SeatChangeStep<PGNumber>) -> Self {
        SeatChangeStep {
            residual_seat_number: step.residual_seat_number,
            change: step.change.into(),
            standings: step
                .standings
                .into_iter()
                .map(|standing| ListStanding {
                    list_number: standing.list_number,
                    votes_cast: standing.votes_cast,
                    remainder_votes: DisplayFraction::from(standing.remainder_votes),
                    meets_remainder_threshold: standing.meets_remainder_threshold,
                    next_votes_per_seat: DisplayFraction::from(standing.next_votes_per_seat),
                    full_seats: standing.full_seats,
                    residual_seats: standing.residual_seats,
                })
                .collect(),
        }
    }
}
