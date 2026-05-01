use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::domain::{
    election::{Candidate, CandidateGender, CandidateNumber, PGNumber},
    results::political_group_candidate_votes::CandidateVotes,
};

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct SeatAssignment {
    pub seats: u32,
    pub full_seats: u32,
    pub residual_seats: u32,
    pub quota: DisplayFraction,
    pub steps: Vec<SeatChangeStep>,
    pub final_standing: Vec<ListSeatAssignment>,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct SeatChangeStep {
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub residual_seat_number: Option<u32>,
    pub change: SeatChange,
    pub standings: Vec<ListStanding>,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
#[serde(deny_unknown_fields, tag = "changed_by")]
pub enum SeatChange {
    HighestAverageAssignment(HighestAverageAssignedSeat),
    UniqueHighestAverageAssignment(HighestAverageAssignedSeat),
    LargestRemainderAssignment(LargestRemainderAssignedSeat),
    AbsoluteMajorityReassignment(AbsoluteMajorityReassignedSeat),
    ListExhaustionRemoval(ListExhaustionRemovedSeat),
}

impl SeatChange {
    /// Returns true if the seat was changed through the largest remainder assignment
    pub fn is_changed_by_largest_remainder_assignment(&self) -> bool {
        matches!(self, Self::LargestRemainderAssignment(_))
    }

    /// Returns true if the seat was changed through the highest average assignment
    pub fn is_changed_by_highest_average_assignment(&self) -> bool {
        matches!(self, Self::HighestAverageAssignment(_))
    }

    /// Returns true if the seat was changed through the unique highest average assignment
    pub fn is_changed_by_unique_highest_average_assignment(&self) -> bool {
        matches!(self, Self::UniqueHighestAverageAssignment(_))
    }

    /// Returns true if the seat was changed through the absolute majority reassignment
    pub fn is_changed_by_absolute_majority_reassignment(&self) -> bool {
        matches!(self, Self::AbsoluteMajorityReassignment(_))
    }

    /// Returns true if the seat was changed through the list exhaustion removal
    pub fn is_changed_by_list_exhaustion_removal(&self) -> bool {
        matches!(self, Self::ListExhaustionRemoval(_))
    }

    pub fn list_number_assigned(&self) -> PGNumber {
        match self {
            Self::HighestAverageAssignment(highest_average_assigned_seat) => {
                highest_average_assigned_seat.selected_list_number
            }
            Self::UniqueHighestAverageAssignment(unique_highest_average_assigned_seat) => {
                unique_highest_average_assigned_seat.selected_list_number
            }
            Self::LargestRemainderAssignment(largest_remainder_assigned_seat) => {
                largest_remainder_assigned_seat.selected_list_number
            }
            Self::AbsoluteMajorityReassignment(absolute_majority_reassigned_seat) => {
                absolute_majority_reassigned_seat.list_assigned_seat
            }
            Self::ListExhaustionRemoval(_) => unimplemented!(),
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct HighestAverageAssignedSeat {
    pub selected_list_number: PGNumber,
    pub list_options: Vec<PGNumber>,
    pub list_assigned: Vec<PGNumber>,
    pub list_exhausted: Vec<PGNumber>,
    pub votes_per_seat: DisplayFraction,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct LargestRemainderAssignedSeat {
    pub selected_list_number: PGNumber,
    pub list_options: Vec<PGNumber>,
    pub list_assigned: Vec<PGNumber>,
    pub remainder_votes: DisplayFraction,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AbsoluteMajorityReassignedSeat {
    pub list_retracted_seat: PGNumber,
    pub list_assigned_seat: PGNumber,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct ListExhaustionRemovedSeat {
    pub list_retracted_seat: PGNumber,
    pub full_seat: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct ListStanding {
    pub list_number: PGNumber,
    pub votes_cast: u64,
    pub remainder_votes: DisplayFraction,
    pub meets_remainder_threshold: bool,
    pub next_votes_per_seat: DisplayFraction,
    pub full_seats: u32,
    pub residual_seats: u32,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ListSeatAssignment {
    pub list_number: PGNumber,
    pub votes_cast: u64,
    pub remainder_votes: DisplayFraction,
    pub meets_remainder_threshold: bool,
    pub full_seats: u32,
    pub residual_seats: u32,
    pub total_seats: u32,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct CandidateNomination {
    pub preference_threshold: PreferenceThreshold,
    pub chosen_candidates: Vec<ChosenCandidate>,
    pub list_candidate_nomination: Vec<ListCandidateNomination>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct PreferenceThreshold {
    pub percentage: u64,
    pub number_of_votes: DisplayFraction,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ListCandidateNomination {
    pub list_number: PGNumber,
    pub list_name: String,
    pub list_seats: u32,
    pub preferential_candidate_nomination: Vec<CandidateVotes>,
    pub other_candidate_nomination: Vec<CandidateVotes>,
    pub updated_candidate_ranking: Vec<Candidate>,
}

impl From<&apportionment::SeatChange<PGNumber>> for SeatChange {
    fn from(change: &apportionment::SeatChange<PGNumber>) -> Self {
        use apportionment::SeatChange::*;

        let as_highest_avg =
            |c: &apportionment::HighestAverageAssignedSeat<PGNumber>| HighestAverageAssignedSeat {
                selected_list_number: c.selected_list_number,
                list_options: c.list_options.clone(),
                list_assigned: c.list_assigned.clone(),
                list_exhausted: c.list_exhausted.clone(),
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
                    list_options: c.list_options.clone(),
                    list_assigned: c.list_assigned.clone(),
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

impl From<&apportionment::SeatChangeStep<PGNumber>> for SeatChangeStep {
    fn from(step: &apportionment::SeatChangeStep<PGNumber>) -> Self {
        SeatChangeStep {
            residual_seat_number: step.residual_seat_number,
            change: (&step.change).into(),
            standings: step
                .standings
                .iter()
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

/// Fraction with the integer part split out for display purposes
#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
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

/// Chosen candidate
#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct ChosenCandidate {
    #[schema(value_type = u32)]
    pub number: CandidateNumber,
    pub initials: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub first_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub last_name_prefix: Option<String>,
    pub last_name: String,
    pub locality: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub country_code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub gender: Option<CandidateGender>,
    pub list_number: PGNumber,
    pub list_name: String,
}

impl ChosenCandidate {
    pub fn new(candidate: Candidate, list_number: PGNumber, list_name: String) -> Self {
        Self {
            number: candidate.number,
            initials: candidate.initials,
            first_name: candidate.first_name,
            last_name_prefix: candidate.last_name_prefix,
            last_name: candidate.last_name,
            locality: candidate.locality,
            country_code: candidate.country_code,
            gender: candidate.gender,
            list_number,
            list_name,
        }
    }
}
