use crate::{CandidateVotesTrait, Fraction, ListVotesTrait};

/// Contains information about the chosen candidates and
/// the candidate list ranking for a specific list.
#[derive(Debug, PartialEq)]
pub struct ListCandidateNomination<'a, T: ListVotesTrait> {
    /// List number for which this nomination applies
    pub list_number: T::ListNumber,
    /// The number of seats assigned to this group
    pub list_seats: u32,
    /// The list of chosen candidates via preferential votes, can be empty
    pub preferential_candidate_nomination: Vec<&'a T::Cv>,
    /// The list of other chosen candidates, can be empty
    pub other_candidate_nomination: Vec<&'a T::Cv>,
    /// The updated ranking of the whole candidate list, can be empty
    pub updated_candidate_ranking: Vec<<T::Cv as CandidateVotesTrait>::CandidateNumber>,
}

#[derive(Debug, PartialEq)]
pub struct PreferenceThreshold {
    /// Preference threshold as a percentage (0 to 100)
    pub percentage: u64,
    /// Preference threshold as a number of votes
    pub number_of_votes: Fraction,
}

/// The result of the candidate nomination procedure.  
/// This contains the preference threshold and percentage that was used.  
/// It contains a list of all chosen candidates.
/// It also contains the preferential nomination of candidates, the remaining
/// nomination of candidates and the final ranking of candidates for each list.
#[derive(Debug, PartialEq)]
pub struct CandidateNominationResult<'a, T: ListVotesTrait> {
    /// Preference threshold percentage and number of votes
    pub preference_threshold: PreferenceThreshold,
    /// List of chosen candidates
    pub chosen_candidates: Vec<Candidate<T>>,
    /// List of chosen candidates and candidate list ranking per list
    pub list_candidate_nomination: Vec<ListCandidateNomination<'a, T>>,
}

#[derive(Debug, PartialEq)]
pub struct Candidate<T: ListVotesTrait> {
    pub list_number: T::ListNumber,
    pub candidate_number: <T::Cv as CandidateVotesTrait>::CandidateNumber,
}
