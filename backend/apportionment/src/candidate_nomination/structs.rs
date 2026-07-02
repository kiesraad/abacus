use crate::{
    Fraction, ListVotes,
    structs::{CandidateNumber, ListNumber},
};

/// Indicates what the ranking of candidates in the list is.
///
/// This is either the original list as defined in the candidate lists, or the
/// updated ranking if preferential votes or deceased candidates have changed
/// the ranking of candidates.
#[derive(Debug, PartialEq, Eq)]
pub enum CandidateRanking<T> {
    /// The ranking of candidates was updated.
    ///
    /// This could happen because of deceased candidates or because of preferential votes.
    Updated(Vec<T>),
    /// The ranking of candidates was not updated.
    Original(Vec<T>),
}

impl<T> CandidateRanking<T> {
    /// Return a slice of the ranked candidate numbers, either the updated
    /// ranking when it was changed from the original or the original ranking
    /// if no changes were made.
    pub fn as_slice(&self) -> &[T] {
        match self {
            CandidateRanking::Updated(vec) => vec.as_slice(),
            CandidateRanking::Original(vec) => vec.as_slice(),
        }
    }

    /// If the candidate list was updated, this returns a slice of the
    /// updated candidate ranking. If it was not updated (i.e. is original),
    /// this returns an empty slice.
    pub fn as_updated_slice(&self) -> &[T] {
        match self {
            CandidateRanking::Updated(vec) => vec.as_slice(),
            _ => &[],
        }
    }

    /// Iterate over the ranked candidate numbers (either the original or the
    /// updated ranking).
    pub fn iter(&self) -> impl Iterator<Item = &T> {
        self.as_slice().iter()
    }

    /// Iterate over the updated ranked candidate numbers, if they are updated.
    ///
    /// If the candidate ranking is not updated, this returns an empty iterator.
    pub fn iter_updated(&self) -> impl Iterator<Item = &T> {
        self.as_updated_slice().iter()
    }

    /// Returns true if the ranking of candidates was updated, false otherwise.
    pub fn is_updated(&self) -> bool {
        matches!(self, CandidateRanking::Updated(_))
    }

    /// Returns true if the ranking of candidates was not updated, false otherwise.
    pub fn is_original(&self) -> bool {
        matches!(self, CandidateRanking::Original(_))
    }
}

/// Contains information about the chosen candidates and
/// the candidate list ranking for a specific list.
#[derive(Debug, PartialEq)]
pub struct ListCandidateNomination<'a, T: ListVotes> {
    /// List number for which this nomination applies
    pub list_number: ListNumber<T>,
    /// The number of seats assigned to this group
    pub list_seats: u32,
    /// The list of chosen candidates via preferential votes, can be empty
    pub preferential_candidate_nomination: Vec<&'a T::Cv>,
    /// The list of other chosen candidates, can be empty
    pub other_candidate_nomination: Vec<&'a T::Cv>,
    /// The ranking of the whole candidate list, either the original ranking or
    /// the updated ranking if changes were made.
    ///
    /// This contains the candidate numbers of all candidates in the list (including
    /// those that did not receive a nomination) ordered such that candidates
    /// have been re-ordered according to their preferential votes.
    pub candidate_ranking: CandidateRanking<CandidateNumber<T>>,
}

impl<'a, T: ListVotes> ListCandidateNomination<'a, T> {
    /// Returns a slice of the candidate ranking, but only for the nominated candidates
    pub fn nominated_candidate_ranking(&self) -> &[CandidateNumber<T>] {
        &self.candidate_ranking.as_slice()[..(self.list_seats as usize)]
    }
}

/// Contains the preference threshold as a percentage and as a fraction of the number of votes.
#[derive(Debug, PartialEq, Clone, Copy)]
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
pub struct CandidateNominationDetails<'a, T: ListVotes> {
    /// Preference threshold percentage and number of votes
    pub preference_threshold: PreferenceThreshold,
    /// List of chosen candidates
    pub chosen_candidates: Vec<Candidate<T>>,
    /// List of chosen candidates and candidate list ranking per list
    pub list_candidate_nomination: Vec<ListCandidateNomination<'a, T>>,
}

/// Contains the list number the candidate is listed on and the candidate number on that list.
#[derive(Debug, PartialEq)]
pub struct Candidate<T: ListVotes> {
    pub list_number: ListNumber<T>,
    pub candidate_number: CandidateNumber<T>,
}
