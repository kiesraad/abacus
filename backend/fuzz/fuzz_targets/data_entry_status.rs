#![no_main]

use abacus::{
    domain::{
        data_entry::{ClientState, DataEntryStatus, DataEntryTransitionError, DataEntryUpdate},
        election::{
            CommitteeCategory, CommitteeDistrict, ElectionCategory, ElectionDomain, ElectionId,
            ElectionSubCategory, ElectionWithPoliticalGroups, VoteCountingMethod,
        },
        results::{
            Results,
            counting_differences_polling_station::CountingDifferencesPollingStation,
            cso_first_session_results::CSOFirstSessionResults,
            differences_counts::{
                DifferenceCountsCompareVotesCastAdmittedVoters, DifferencesCounts,
            },
            extra_investigation::ExtraInvestigation,
            voters_counts::VotersCounts,
            votes_counts::VotesCounts,
            yes_no::YesNo,
        },
    },
    repository::user_repo::UserId,
};
use chrono::NaiveDate;
use libfuzzer_sys::{
    arbitrary::{self, Arbitrary},
    fuzz_target,
};

/// A valid result without any votes
fn valid_empty_result() -> Results {
    Results::CSOFirstSession(valid_empty_cso_result())
}

fn valid_empty_cso_result() -> CSOFirstSessionResults {
    CSOFirstSessionResults {
        extra_investigation: ExtraInvestigation {
            extra_investigation_other_reason: YesNo::default(),
            ballots_recounted_extra_investigation: YesNo::default(),
        },
        counting_differences_polling_station: CountingDifferencesPollingStation {
            difference_ballots_voters_completely_accounted_for: YesNo::yes(),
            difference_ballots_per_list: YesNo::no(),
        },
        voters_counts: Default::default(),
        votes_counts: Default::default(),
        differences_counts: DifferencesCounts {
            compare_votes_cast_admitted_voters: {
                DifferenceCountsCompareVotesCastAdmittedVoters {
                    admitted_voters_equal_votes_cast: true,
                    votes_cast_greater_than_admitted_voters: false,
                    votes_cast_smaller_than_admitted_voters: false,
                }
            },
            more_ballots_count: 0,
            fewer_ballots_count: 0,
            difference_completely_accounted_for: YesNo::yes(),
        },
        political_group_votes: vec![],
    }
}

/// A valid result that is different from [`valid_empty_result`], so that two
/// entries can have differences but no errors.
fn valid_counted_result() -> Results {
    Results::CSOFirstSession(CSOFirstSessionResults {
        voters_counts: VotersCounts {
            poll_card_count: 100,
            proxy_certificate_count: 0,
            voter_card_count: None,
            total_admitted_voters_count: 100,
        },
        votes_counts: VotesCounts {
            political_group_total_votes: vec![],
            total_votes_candidates_count: 0,
            blank_votes_count: 100,
            invalid_votes_count: 0,
            total_votes_cast_count: 100,
        },
        ..valid_empty_cso_result()
    })
}

fn invalid_result() -> Results {
    Results::CSOFirstSession(CSOFirstSessionResults {
        extra_investigation: Default::default(),
        counting_differences_polling_station: Default::default(),
        voters_counts: VotersCounts {
            poll_card_count: 10,
            proxy_certificate_count: 5,
            voter_card_count: None,
            total_admitted_voters_count: 20,
        },
        votes_counts: VotesCounts {
            political_group_total_votes: vec![],
            total_votes_candidates_count: 10,
            blank_votes_count: 0,
            invalid_votes_count: 0,
            total_votes_cast_count: 20,
        },
        differences_counts: DifferencesCounts {
            compare_votes_cast_admitted_voters: Default::default(),
            more_ballots_count: 0,
            fewer_ballots_count: 0,
            difference_completely_accounted_for: Default::default(),
        },
        political_group_votes: vec![],
    })
}

/// The possible values an entry can hold.
#[derive(Arbitrary, Debug, Clone, Copy, PartialEq, Eq)]
enum EntryValue {
    ValidEmpty,
    ValidCounted,
    Invalid,
}

impl EntryValue {
    fn results(self) -> Results {
        match self {
            EntryValue::ValidEmpty => valid_empty_result(),
            EntryValue::ValidCounted => valid_counted_result(),
            EntryValue::Invalid => invalid_result(),
        }
    }

    fn has_errors(self) -> bool {
        matches!(self, EntryValue::Invalid)
    }
}

fn update(user_id: UserId, entry: EntryValue) -> DataEntryUpdate {
    DataEntryUpdate {
        progress: 0,
        user_id,
        entry: entry.results(),
        client_state: ClientState::default(),
    }
}

fn election() -> ElectionWithPoliticalGroups {
    ElectionWithPoliticalGroups {
        id: ElectionId::from(1),
        name: "Gemeenteraad Test Location 2025".to_string(),
        eml_name: "Gemeenteraad Test Location 2025".to_string(),
        committee_category: CommitteeCategory::GSB,
        counting_method: Some(VoteCountingMethod::CSO),
        election_id: "GR2025_TestLocation".to_string(),
        location: "Test Location".to_string(),
        authority_id: "0000".to_string(),
        authority_name: "Test".to_string(),
        authority_region: "Test".to_string(),
        district: CommitteeDistrict::None,
        domain: Some(ElectionDomain {
            id: Some("0000".to_string()),
            name: "Test".to_string(),
        }),
        category: ElectionCategory::Municipal,
        sub_category: ElectionSubCategory::GR1,
        number_of_seats: 18,
        number_of_voters: 1000,
        election_date: NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
        nomination_date: NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
        political_groups: vec![],
    }
}

#[derive(Arbitrary, Debug)]
enum Transition {
    ClaimFirstEntry(bool),
    ClaimSecondEntry(bool),
    UpdateFirstEntry(bool, EntryValue),
    UpdateSecondEntry(bool, EntryValue),
    FinaliseFirstEntry(bool),
    FinaliseSecondEntry(bool),
    DiscardFirstEntryInProgress(bool),
    DiscardSecondEntryInProgress(bool),
    ResumeFirstEntryWithErrors,
    DiscardFirstEntryWithErrors,
    DiscardEntries,
    KeepFirstEntry,
    KeepSecondEntry,
    CorrectFirstEntry,
    CorrectSecondEntry,
}

/// This matches the state machine described in:
/// https://github.com/kiesraad/abacus/blob/main/documentatie/state-machines/data-entry-state.md
///
/// It also contains some additional self loops which are not explicitly documented there:
/// - the "save" (update) endpoints for the in progress and correction states
/// - re-invocations of "claim" for the in progress and correction states
///
/// It also specifies the expected errors that the fuzzer might run in to.
fn is_as_expected(
    state: &DataEntryStatus,
    transition: &Transition,
    resulting_state: &Result<DataEntryStatus, DataEntryTransitionError>,
    first_entry: EntryValue,
    second_entry: EntryValue,
) -> bool {
    match (state, transition) {
        // ClaimFirstEntry: an unclaimed first entry can be claimed by any user
        (DataEntryStatus::Empty, Transition::ClaimFirstEntry(_)) => matches!(
            resulting_state,
            Ok(DataEntryStatus::FirstEntryInProgress(_))
        ),
        // ClaimFirstEntry self loop, only allowed with same user
        (DataEntryStatus::FirstEntryInProgress(_), Transition::ClaimFirstEntry(true)) => matches!(
            resulting_state,
            Ok(DataEntryStatus::FirstEntryInProgress(_))
        ),
        // UpdateFirstEntry
        (DataEntryStatus::FirstEntryInProgress(_), Transition::UpdateFirstEntry(true, _)) => {
            matches!(
                resulting_state,
                Ok(DataEntryStatus::FirstEntryInProgress(_))
            )
        }
        // DeleteFirstEntry
        (
            DataEntryStatus::FirstEntryInProgress(_),
            Transition::DiscardFirstEntryInProgress(true),
        ) => {
            matches!(resulting_state, Ok(DataEntryStatus::Empty))
        }
        // FinaliseFirstEntry
        (DataEntryStatus::FirstEntryInProgress(_), Transition::FinaliseFirstEntry(true)) => {
            is_kept_as_expected(resulting_state, first_entry)
        }
        // DiscardFirstEntry
        (DataEntryStatus::FirstEntryHasErrors(_), Transition::DiscardFirstEntryWithErrors) => {
            matches!(resulting_state, Ok(DataEntryStatus::Empty))
        }
        // ResumeFirstEntry
        (DataEntryStatus::FirstEntryHasErrors(_), Transition::ResumeFirstEntryWithErrors) => {
            matches!(
                resulting_state,
                Ok(DataEntryStatus::FirstEntryInProgress(_))
            )
        }
        // ClaimSecondEntry
        (DataEntryStatus::FirstEntryFinalised(_), Transition::ClaimSecondEntry(true)) => {
            matches!(
                resulting_state,
                Ok(DataEntryStatus::SecondEntryInProgress(_))
            )
        }
        // UpdateSecondEntry
        (DataEntryStatus::SecondEntryInProgress(_), Transition::UpdateSecondEntry(true, _)) => {
            matches!(
                resulting_state,
                Ok(DataEntryStatus::SecondEntryInProgress(_))
            )
        }
        // FirstEntryFinalised self loop, only allowed with same user
        (DataEntryStatus::SecondEntryInProgress(_), Transition::ClaimSecondEntry(true)) => {
            matches!(
                resulting_state,
                Ok(DataEntryStatus::SecondEntryInProgress(_))
            )
        }
        // DeleteSecondEntry
        (
            DataEntryStatus::SecondEntryInProgress(_),
            Transition::DiscardSecondEntryInProgress(true),
        ) => {
            matches!(resulting_state, Ok(DataEntryStatus::FirstEntryFinalised(_)))
        }
        // FinaliseSecondEntry
        (DataEntryStatus::SecondEntryInProgress(_), Transition::FinaliseSecondEntry(true)) => {
            is_finalised_as_expected(resulting_state, first_entry, second_entry)
        }
        // KeepFirstEntry
        (DataEntryStatus::EntriesDifferent(_), Transition::KeepFirstEntry) => {
            is_kept_as_expected(resulting_state, first_entry)
        }
        // KeepSecondEntry
        (DataEntryStatus::EntriesDifferent(_), Transition::KeepSecondEntry) => {
            is_kept_as_expected(resulting_state, second_entry)
        }
        // DiscardBothEntries
        (DataEntryStatus::EntriesDifferent(_), Transition::DiscardEntries) => {
            matches!(resulting_state, Ok(DataEntryStatus::Empty))
        }
        // CorrectFirstEntry, only allowed when the second entry has no errors
        (DataEntryStatus::EntriesDifferent(_), Transition::CorrectFirstEntry) => {
            if second_entry.has_errors() {
                matches!(
                    resulting_state,
                    Err(DataEntryTransitionError::CorrectionNotAllowed)
                )
            } else {
                matches!(
                    resulting_state,
                    Ok(DataEntryStatus::FirstEntryCorrection(_))
                )
            }
        }
        // CorrectSecondEntry, only allowed when the first entry has no errors
        (DataEntryStatus::EntriesDifferent(_), Transition::CorrectSecondEntry) => {
            if first_entry.has_errors() {
                matches!(
                    resulting_state,
                    Err(DataEntryTransitionError::CorrectionNotAllowed)
                )
            } else {
                matches!(
                    resulting_state,
                    Ok(DataEntryStatus::SecondEntryCorrection(_))
                )
            }
        }
        // ClaimFirstEntry self loop, only allowed with same user
        (DataEntryStatus::FirstEntryCorrection(_), Transition::ClaimFirstEntry(true)) => matches!(
            resulting_state,
            Ok(DataEntryStatus::FirstEntryCorrection(_))
        ),
        // UpdateFirstEntry self loop
        (DataEntryStatus::FirstEntryCorrection(_), Transition::UpdateFirstEntry(true, _)) => {
            matches!(
                resulting_state,
                Ok(DataEntryStatus::FirstEntryCorrection(_))
            )
        }
        // FinaliseFirstEntry after correcting it
        (DataEntryStatus::FirstEntryCorrection(_), Transition::FinaliseFirstEntry(true)) => {
            is_finalised_as_expected(resulting_state, first_entry, second_entry)
        }
        // DiscardFirstEntry while correcting it: the kept second entry becomes the first entry
        (
            DataEntryStatus::FirstEntryCorrection(_),
            Transition::DiscardFirstEntryInProgress(true),
        ) => {
            matches!(resulting_state, Ok(DataEntryStatus::FirstEntryFinalised(_)))
        }
        // ClaimSecondEntry self loop, only allowed with same user
        (DataEntryStatus::SecondEntryCorrection(_), Transition::ClaimSecondEntry(true)) => {
            matches!(
                resulting_state,
                Ok(DataEntryStatus::SecondEntryCorrection(_))
            )
        }
        // UpdateSecondEntry self loop
        (DataEntryStatus::SecondEntryCorrection(_), Transition::UpdateSecondEntry(true, _)) => {
            matches!(
                resulting_state,
                Ok(DataEntryStatus::SecondEntryCorrection(_))
            )
        }
        // FinaliseSecondEntry after correcting it
        (DataEntryStatus::SecondEntryCorrection(_), Transition::FinaliseSecondEntry(true)) => {
            is_finalised_as_expected(resulting_state, first_entry, second_entry)
        }
        // DiscardSecondEntry while correcting it: the finalised first entry is kept unchanged
        (
            DataEntryStatus::SecondEntryCorrection(_),
            Transition::DiscardSecondEntryInProgress(true),
        ) => {
            matches!(resulting_state, Ok(DataEntryStatus::FirstEntryFinalised(_)))
        }
        // Expected error: FirstEntryAlreadyClaimed
        (
            DataEntryStatus::FirstEntryInProgress(_) | DataEntryStatus::FirstEntryCorrection(_),
            Transition::ClaimFirstEntry(false),
        ) => {
            matches!(
                resulting_state,
                Err(DataEntryTransitionError::FirstEntryAlreadyClaimed)
            )
        }
        // Expected error: SecondEntryNeedsDifferentUser
        (DataEntryStatus::FirstEntryFinalised(_), Transition::ClaimSecondEntry(false)) => {
            matches!(
                resulting_state,
                Err(DataEntryTransitionError::SecondEntryNeedsDifferentUser)
            )
        }
        // Expected error: SecondEntryAlreadyClaimed
        (
            DataEntryStatus::SecondEntryInProgress(_) | DataEntryStatus::SecondEntryCorrection(_),
            Transition::ClaimSecondEntry(false),
        ) => {
            matches!(
                resulting_state,
                Err(DataEntryTransitionError::SecondEntryAlreadyClaimed)
            )
        }
        // Expected error: CannotTransitionUsingDifferentUser for the first and the second entry,
        // both while entering them and while correcting them
        (
            DataEntryStatus::FirstEntryInProgress(_) | DataEntryStatus::FirstEntryCorrection(_),
            Transition::UpdateFirstEntry(false, _)
            | Transition::DiscardFirstEntryInProgress(false)
            | Transition::FinaliseFirstEntry(false),
        )
        | (
            DataEntryStatus::SecondEntryInProgress(_) | DataEntryStatus::SecondEntryCorrection(_),
            Transition::UpdateSecondEntry(false, _)
            | Transition::DiscardSecondEntryInProgress(false)
            | Transition::FinaliseSecondEntry(false),
        ) => {
            matches!(
                resulting_state,
                Err(DataEntryTransitionError::CannotTransitionUsingDifferentUser)
            )
        }
        // Expected error: FirstEntryAlreadyFinalised
        // oddity: SecondEntryInProgress --ClaimFirstEntry--> invalid instead of FirstEntryAlreadyFinalised
        (DataEntryStatus::SecondEntryInProgress(_), Transition::ClaimFirstEntry(_)) => {
            matches!(resulting_state, Err(DataEntryTransitionError::Invalid))
        }
        (
            DataEntryStatus::FirstEntryFinalised(_) | DataEntryStatus::SecondEntryInProgress(_),
            Transition::FinaliseFirstEntry(_)
            | Transition::ClaimFirstEntry(_)
            | Transition::UpdateFirstEntry(_, _)
            | Transition::DiscardFirstEntryInProgress(_),
        ) => matches!(
            resulting_state,
            Err(DataEntryTransitionError::FirstEntryAlreadyFinalised)
        ),
        // Expected error: SecondEntryAlreadyFinalised
        (
            DataEntryStatus::Definitive(_),
            Transition::FinaliseFirstEntry(_)
            | Transition::ClaimFirstEntry(_)
            | Transition::UpdateFirstEntry(_, _)
            | Transition::DiscardFirstEntryInProgress(_)
            | Transition::FinaliseSecondEntry(_)
            | Transition::ClaimSecondEntry(_)
            | Transition::UpdateSecondEntry(_, _)
            | Transition::DiscardSecondEntryInProgress(_),
        ) => matches!(
            resulting_state,
            Err(DataEntryTransitionError::SecondEntryAlreadyFinalised)
        ),
        // All other state transitions should be invalid. Every state is listed explicitly, so
        // that adding a state to DataEntryStatus does not compile until it is added to the fuzzer.
        (
            DataEntryStatus::Empty
            | DataEntryStatus::FirstEntryInProgress(_)
            | DataEntryStatus::FirstEntryHasErrors(_)
            | DataEntryStatus::FirstEntryFinalised(_)
            | DataEntryStatus::SecondEntryInProgress(_)
            | DataEntryStatus::EntriesDifferent(_)
            | DataEntryStatus::FirstEntryCorrection(_)
            | DataEntryStatus::SecondEntryCorrection(_)
            | DataEntryStatus::Definitive(_),
            _,
        ) => matches!(resulting_state, Err(DataEntryTransitionError::Invalid)),
    }
}

/// A single entry being finalised or kept while it is the only entry.
///
/// - Keeping the first entry will discard the second entry.
/// - Keeping the second entry will discard the first entry, making the second entry the first entry.
/// - The state transitions to `FirstEntryFinalised` if that data entry does not have errors and to `FirstEntryHasErrors` if it does.
fn is_kept_as_expected(
    resulting_state: &Result<DataEntryStatus, DataEntryTransitionError>,
    entry: EntryValue,
) -> bool {
    if entry.has_errors() {
        matches!(resulting_state, Ok(DataEntryStatus::FirstEntryHasErrors(_)))
    } else {
        matches!(resulting_state, Ok(DataEntryStatus::FirstEntryFinalised(_)))
    }
}

/// All transitions that finalise an entry with both entries present
fn is_finalised_as_expected(
    resulting_state: &Result<DataEntryStatus, DataEntryTransitionError>,
    first_entry: EntryValue,
    second_entry: EntryValue,
) -> bool {
    if first_entry.results() != second_entry.results() {
        matches!(resulting_state, Ok(DataEntryStatus::EntriesDifferent(_)))
    } else if first_entry.has_errors() {
        matches!(
            resulting_state,
            Err(DataEntryTransitionError::ValidationError(_))
        )
    } else {
        matches!(resulting_state, Ok(DataEntryStatus::Definitive(_)))
    }
}

/// Fuzz state shadowing the real state machine
struct Model {
    first_user: UserId,  // used for first entry
    second_user: UserId, // used for second entry
    first_entry: EntryValue,
    second_entry: EntryValue,
}

impl Model {
    fn new() -> Self {
        Model {
            first_user: UserId::from(0),
            second_user: UserId::from(1),
            first_entry: EntryValue::ValidEmpty,
            second_entry: EntryValue::ValidEmpty,
        }
    }

    fn first_user(&self, correct_user: bool) -> UserId {
        if correct_user {
            self.first_user
        } else {
            self.second_user
        }
    }

    fn second_user(&self, correct_user: bool) -> UserId {
        if correct_user {
            self.second_user
        } else {
            self.first_user
        }
    }

    /// An unclaimed first entry can be claimed by any user.
    fn claim_empty_first_entry(&mut self, correct_user: bool) {
        if !correct_user {
            std::mem::swap(&mut self.first_user, &mut self.second_user);
        }
        self.first_entry = EntryValue::ValidEmpty;
    }

    /// The second entry becomes the first entry, taking its typist along.
    fn promote_second_entry(&mut self) {
        std::mem::swap(&mut self.first_user, &mut self.second_user);
        self.first_entry = self.second_entry;
    }
}

// This fuzz target randomly chooses a sequence of transitions to mutate the state, and checks that
// every step matches the expected state machine defined above
fuzz_target!(|transitions: Vec<Transition>| {
    let mut state = DataEntryStatus::default();
    let mut model = Model::new();
    let election = election();

    for transition in transitions {
        let prev_state = state.clone();

        // Apply transition
        let next_state = match transition {
            Transition::ClaimFirstEntry(correct_user) => {
                let res =
                    state.claim_first_entry(model.first_user(correct_user), valid_empty_result());
                if res.is_ok() && prev_state == DataEntryStatus::Empty {
                    model.claim_empty_first_entry(correct_user);
                }
                res
            }
            Transition::UpdateFirstEntry(correct_user, entry) => {
                let res = state.update_first_entry(update(model.first_user(correct_user), entry));
                if res.is_ok() {
                    model.first_entry = entry
                };
                res
            }
            Transition::FinaliseFirstEntry(correct_user) => {
                state.finalise_first_entry(&election, model.first_user(correct_user))
            }
            Transition::DiscardFirstEntryInProgress(correct_user) => {
                let was_correction = matches!(prev_state, DataEntryStatus::FirstEntryCorrection(_));
                let res = state
                    .discard_first_entry_in_progress(model.first_user(correct_user), &election);
                if res.is_ok() && was_correction {
                    // discarding a correction keeps the second entry, which becomes the first
                    model.promote_second_entry();
                }
                res
            }
            Transition::DiscardFirstEntryWithErrors => state.discard_first_entry_with_errors(),
            Transition::ClaimSecondEntry(correct_user) => {
                let res =
                    state.claim_second_entry(model.second_user(correct_user), valid_empty_result());
                if res.is_ok() && matches!(prev_state, DataEntryStatus::FirstEntryFinalised(_)) {
                    // a newly claimed second entry starts out empty
                    model.second_entry = EntryValue::ValidEmpty;
                }
                res
            }
            Transition::UpdateSecondEntry(correct_user, entry) => {
                let res = state.update_second_entry(update(model.second_user(correct_user), entry));
                if res.is_ok() {
                    model.second_entry = entry
                };
                res
            }
            Transition::DiscardSecondEntryInProgress(correct_user) => {
                state.discard_second_entry_in_progress(model.second_user(correct_user), &election)
            }
            Transition::FinaliseSecondEntry(correct_user) => {
                state.finalise_second_entry(&election, model.second_user(correct_user))
            }
            Transition::ResumeFirstEntryWithErrors => state.resume_first_entry_with_errors(),
            Transition::DiscardEntries => state.discard_entries(),
            Transition::KeepFirstEntry => state.keep_first_entry(&election),
            Transition::KeepSecondEntry => {
                let res = state.keep_second_entry(&election);
                if res.is_ok() {
                    model.promote_second_entry();
                }
                res
            }
            Transition::CorrectFirstEntry => state.correct_first_entry(&election),
            Transition::CorrectSecondEntry => state.correct_second_entry(&election),
        };

        // Check that the applied transition matches what we expect from the state machine
        if !is_as_expected(
            &prev_state,
            &transition,
            &next_state,
            model.first_entry,
            model.second_entry,
        ) {
            panic!(
                "Prev: {:?}\n\nNext: {:?}\n\nInvalid transition: {} --{:?}--> {}\nfirst_entry: {:?}, second_entry: {:?}\n",
                prev_state,
                next_state,
                prev_state.status_name(),
                transition,
                next_state
                    .as_ref()
                    .map(|s| s.status_name().to_string())
                    .unwrap_or_else(|e| e.to_string()),
                model.first_entry,
                model.second_entry
            )
        }

        // State only updates if there was no error during the transition
        state = next_state.unwrap_or(prev_state)
    }
});
