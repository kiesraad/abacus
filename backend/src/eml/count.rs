use std::num::NonZeroU64;

use eml_nl::{
    EMLError,
    documents::election_count::{
        ElectionCount, SelectionAffiliationVotes, TotalVotes, UncountedVotesReason,
    },
    utils::StringValue,
};

use crate::domain::{
    election::{CandidateNumber, PGNumber},
    results::{
        count::Count,
        gsb_differences_counts::GSBDifferencesCounts,
        gsb_results::GSBResults,
        political_group_candidate_votes::{CandidateVotes, PoliticalGroupCandidateVotes},
        political_group_total_votes::PoliticalGroupTotalVotes,
        voters_counts::VotersCounts,
        votes_counts::VotesCounts,
    },
};

impl GSBResults {
    /// Create GSB results from the `TotalVotes` element in an EML_NL 510b count document.
    ///
    /// Only the first contest is used, as Abacus only supports elections with a single contest.
    pub fn from_eml_count(count: &ElectionCount) -> Result<Self, EMLError> {
        let contest = count
            .count
            .election
            .contests
            .first()
            .ok_or_else(|| EMLError::custom("Missing a Contest element"))?;
        let total_votes = contest
            .total_votes
            .as_ref()
            .ok_or_else(|| EMLError::custom("Missing the TotalVotes element"))?;

        Self::from_eml_total_votes(total_votes)
    }

    /// Create GSB results from the `TotalVotes` element of an EML_NL 510b count document.
    pub fn from_eml_total_votes(total_votes: &TotalVotes) -> Result<Self, EMLError> {
        let political_group_votes = total_votes
            .selections_per_affiliation()?
            .iter()
            .map(political_group_candidate_votes)
            .collect::<Result<Vec<_>, EMLError>>()?;

        let total_votes_candidates_count = count_value(&total_votes.candidate_votes_count)?;
        let blank_votes_count = count_value(total_votes.blank_votes()?)?;
        let invalid_votes_count = count_value(total_votes.invalid_votes()?)?;

        Ok(GSBResults {
            number_of_voters: count_value(&total_votes.eligible_voter_count)?,
            voters_counts: VotersCounts {
                poll_card_count: uncounted_votes(
                    total_votes,
                    UncountedVotesReason::ValidPollCards,
                )?,
                proxy_certificate_count: uncounted_votes(
                    total_votes,
                    UncountedVotesReason::ValidProxyCertificates,
                )?,
                // Voter cards only exist for non-local elections, so they are optional
                voter_card_count: total_votes
                    .uncounted_votes
                    .get(&UncountedVotesReason::ValidVoterCards)
                    .map(count_value)
                    .transpose()?,
                total_admitted_voters_count: uncounted_votes(
                    total_votes,
                    UncountedVotesReason::AdmittedVoters,
                )?,
            },
            votes_counts: VotesCounts {
                political_group_total_votes: political_group_votes
                    .iter()
                    .map(|pg| PoliticalGroupTotalVotes {
                        number: pg.number,
                        total: pg.total,
                    })
                    .collect(),
                total_votes_candidates_count,
                blank_votes_count,
                invalid_votes_count,
                // EML has no element for total votes cast count, so we add the counts
                // of the votes on candidates, the blank votes, and the invalid votes
                total_votes_cast_count: count(
                    u64::from(total_votes_candidates_count)
                        + u64::from(blank_votes_count)
                        + u64::from(invalid_votes_count),
                )?,
            },
            differences_counts: GSBDifferencesCounts {
                more_ballots_count: uncounted_votes(
                    total_votes,
                    UncountedVotesReason::MoreBallotsCounted,
                )?,
                fewer_ballots_count: uncounted_votes(
                    total_votes,
                    UncountedVotesReason::FewerBallotsCounted,
                )?,
            },
            political_group_votes,
        })
    }
}

/// Convert the votes for an affiliation and its candidates into political group candidate votes.
fn political_group_candidate_votes(
    votes: &SelectionAffiliationVotes<'_>,
) -> Result<PoliticalGroupCandidateVotes, EMLError> {
    Ok(PoliticalGroupCandidateVotes {
        number: PGNumber::from(number(
            votes.affiliation.id.copied_value()?.value(),
            "Affiliation",
        )?),
        total: count(votes.valid_votes)?,
        candidate_votes: votes
            .candidates
            .iter()
            .map(|candidate| {
                Ok(CandidateVotes {
                    number: CandidateNumber::from(number(
                        candidate.candidate.identifier.id.copied_value()?.value(),
                        "Candidate",
                    )?),
                    votes: count(candidate.valid_votes)?,
                })
            })
            .collect::<Result<Vec<_>, EMLError>>()?,
    })
}

/// Get the number of uncounted votes for the given reason
fn uncounted_votes(
    total_votes: &TotalVotes,
    reason: UncountedVotesReason,
) -> Result<Count, EMLError> {
    total_votes
        .uncounted_votes
        .get(&reason)
        .ok_or_else(|| {
            EMLError::custom(format!(
                "Missing UncountedVotes element with reason code \"{}\"",
                reason.to_eml_value()
            ))
        })
        .and_then(count_value)
}

/// Convert a value from the document into a count (u32)
fn count_value(value: &StringValue<u64>) -> Result<Count, EMLError> {
    count(value.copied_value()?)
}

/// Convert a u64 value into a count (u32)
fn count(value: u64) -> Result<Count, EMLError> {
    Count::try_from(value)
        .map_err(|_| EMLError::custom(format!("Value {value} is too large for a count")))
}

/// Convert an id from the EML into a u32
fn number(id: NonZeroU64, element: &str) -> Result<u32, EMLError> {
    u32::try_from(id.get()).map_err(|_| EMLError::custom(format!("{element} id {id} is too large")))
}
