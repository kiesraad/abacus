#![no_main]

use abacus::{
    committee_session::CommitteeSessionId,
    data_entry::{status::*, *},
    election::{ElectionCategory, ElectionId, ElectionWithPoliticalGroups, VoteCountingMethod},
    polling_station::{PollingStationId, PollingStation, PollingStationType},
};

use chrono::NaiveDate;
use libfuzzer_sys::{
    arbitrary::{self, Arbitrary},
    fuzz_target,
};

fn valid_polling_station_result() -> PollingStationResults {
    PollingStationResults::CSOFirstSession(CSOFirstSessionResults {
        extra_investigation: ExtraInvestigation {
            extra_investigation_other_reason: YesNo::default(),
            ballots_recounted_extra_investigation: YesNo::default(),
        },
        counting_differences_polling_station: CountingDifferencesPollingStation {
            unexplained_difference_ballots_voters: YesNo::no(),
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
    })
}

fn invalid_polling_station_result() -> PollingStationResults {
    PollingStationResults::CSOFirstSession(CSOFirstSessionResults {
        extra_investigation: Default::default(),
        counting_differences_polling_station: Default::default(),
        voters_counts: VotersCounts {
            poll_card_count: 10,
            proxy_certificate_count: 5,
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

fn get_cde(user_id: u32, correct_entry: bool) -> CurrentDataEntry {
    CurrentDataEntry {
        progress: None,
        user_id,
        entry: if correct_entry {
            valid_polling_station_result()
        } else {
            invalid_polling_station_result()
        },
        client_state: None,
    }
}

fn polling_station() -> PollingStation {
    PollingStation {
        id: PollingStationId::from(1),
        election_id: ElectionId::from(1),
        committee_session_id: CommitteeSessionId::from(1),
        id_prev_session: None,
        name: "Test polling station".to_string(),
        number: 1,
        number_of_voters: None,
        polling_station_type: Some(PollingStationType::FixedLocation),
        address: "Test street".to_string(),
        postal_code: "1234 YQ".to_string(),
        locality: "Test city".to_string(),
    }
}

fn election() -> ElectionWithPoliticalGroups {
    ElectionWithPoliticalGroups {
        id: ElectionId::from(1),
        name: "Test election".to_string(),
        counting_method: VoteCountingMethod::CSO,
        election_id: "Test_2025".to_string(),
        location: "Test locatie".to_string(),
        domain_id: "0000".to_string(),
        category: ElectionCategory::Municipal,
        number_of_seats: 18,
        number_of_voters: 1000,
        election_date: NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
        nomination_date: NaiveDate::from_ymd_opt(2024, 1, 1).unwrap(),
        political_groups: vec![],
    }
}

#[derive(Arbitrary, Debug)]
enum Transition {
    ClaimFirstEntry,
    ClaimSecondEntry(bool),
    UpdateFirstEntry(bool, bool),
    UpdateSecondEntry(bool, bool),
    FinaliseFirstEntry(bool),
    FinaliseSecondEntry(bool),
    DeleteFirstEntry(bool),
    DeleteSecondEntry(bool),
    ResumeFirstEntry,
    DiscardFirstEntry,
    DeleteBothEntries,
    KeepFirstEntry,
    KeepSecondEntry,
}

/// This matches the state machine described in:
/// https://github.com/kiesraad/abacus/blob/main/documentatie/flowcharts/data-entry-state.md
///
/// It also contains some additional self loops which are not explicitly documented there:
/// - the "save" (update) endpoints for FirstEntryInProgress and SecondEntryInProgress
/// - re-invocations of "claim" for FirstEntryInProgress and SecondEntryInProgress
///
/// It also specifies the expected errors that the fuzzer might run in to
fn is_as_expected(
    state: &DataEntryStatus,
    transition: &Transition,
    resulting_state: &Result<DataEntryStatus, DataEntryTransitionError>,
    first_entry_correct: bool,
    second_entry_correct: bool,
) -> bool {
    match (state, transition) {
        // ClaimFirstEntry
        (DataEntryStatus::Empty, Transition::ClaimFirstEntry) => matches!(
            resulting_state,
            Ok(DataEntryStatus::FirstEntryInProgress(_))
        ),
        // ClaimFirstEntry self loop, only allowed with same user
        // (we currently don't test the already claimed error because we only use the correct user ID)
        (DataEntryStatus::FirstEntryInProgress(_), Transition::ClaimFirstEntry) => matches!(
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
        (DataEntryStatus::FirstEntryInProgress(_), Transition::DeleteFirstEntry(true)) => {
            matches!(resulting_state, Ok(DataEntryStatus::Empty))
        }
        // FinaliseFirstEntry
        (DataEntryStatus::FirstEntryInProgress(_), Transition::FinaliseFirstEntry(true)) => {
            if first_entry_correct {
                matches!(
                    resulting_state,
                    Ok(DataEntryStatus::FirstEntryFinalised(_))
                )
            } else {
                matches!(resulting_state, Ok(DataEntryStatus::FirstEntryHasErrors(_)))
            }
        }
        // DiscardFirstEntry
        (DataEntryStatus::FirstEntryHasErrors(_), Transition::DiscardFirstEntry) => {
            matches!(resulting_state, Ok(DataEntryStatus::Empty))
        }
        // ResumeFirstEntry
        (DataEntryStatus::FirstEntryHasErrors(_), Transition::ResumeFirstEntry) => {
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
        (DataEntryStatus::SecondEntryInProgress(_), Transition::DeleteSecondEntry(true)) => {
            matches!(
                resulting_state,
                Ok(DataEntryStatus::FirstEntryFinalised(_))
            )
        }
        // FinaliseSecondEntry
        (DataEntryStatus::SecondEntryInProgress(_), Transition::FinaliseSecondEntry(true)) => {
            if second_entry_correct {
                matches!(resulting_state, Ok(DataEntryStatus::Definitive(_)))
            } else {
                matches!(resulting_state, Ok(DataEntryStatus::EntriesDifferent(_)))
            }
        }
        // KeepFirstEntry
        (DataEntryStatus::EntriesDifferent(_), Transition::KeepFirstEntry) => {
            matches!(
                resulting_state,
                Ok(DataEntryStatus::FirstEntryFinalised(_))
            )
        }
        // KeepSecondEntry
        (DataEntryStatus::EntriesDifferent(_), Transition::KeepSecondEntry) => {
            if second_entry_correct {
                matches!(
                    resulting_state,
                    Ok(DataEntryStatus::FirstEntryFinalised(_))
                )
            } else {
                matches!(resulting_state, Ok(DataEntryStatus::FirstEntryHasErrors(_)))
            }
        }
        // DiscardBothEntries
        (DataEntryStatus::EntriesDifferent(_), Transition::DeleteBothEntries) => {
            matches!(resulting_state, Ok(DataEntryStatus::Empty))
        }
        // Expected error: SecondEntryNeedsDifferentUser
        (DataEntryStatus::FirstEntryFinalised(_), Transition::ClaimSecondEntry(false)) => {
            matches!(
                resulting_state,
                Err(DataEntryTransitionError::SecondEntryNeedsDifferentUser)
            )
        }
        // Expected error: SecondEntryAlreadyClaimed
        (DataEntryStatus::SecondEntryInProgress(_), Transition::ClaimSecondEntry(false)) => {
            matches!(
                resulting_state,
                Err(DataEntryTransitionError::SecondEntryAlreadyClaimed)
            )
        }
        // Expected error: CannotTransitionUsingDifferentUser for first entry
        (
            DataEntryStatus::FirstEntryInProgress(_),
            Transition::UpdateFirstEntry(false, _)
            | Transition::DeleteFirstEntry(false)
            | Transition::FinaliseFirstEntry(false),
        ) => {
            matches!(
                resulting_state,
                Err(DataEntryTransitionError::CannotTransitionUsingDifferentUser)
            )
        }
        // Expected error: CannotTransitionUsingDifferentUser for second entry
        (
            DataEntryStatus::SecondEntryInProgress(_),
            Transition::UpdateSecondEntry(false, _)
            | Transition::DeleteSecondEntry(false)
            | Transition::FinaliseSecondEntry(false),
        ) => {
            matches!(
                resulting_state,
                Err(DataEntryTransitionError::CannotTransitionUsingDifferentUser)
            )
        }
        // Expected error: FirstEntryAlreadyFinalised
        // oddity: SecondEntryInProgress --ClaimFirstEntry--> invalid instead of FirstEntryAlreadyFinalised
        (DataEntryStatus::SecondEntryInProgress(_), Transition::ClaimFirstEntry) => {
            matches!(resulting_state, Err(DataEntryTransitionError::Invalid))
        }
        (
            DataEntryStatus::FirstEntryFinalised(_) | DataEntryStatus::SecondEntryInProgress(_),
            Transition::FinaliseFirstEntry(_)
            | Transition::ClaimFirstEntry
            | Transition::UpdateFirstEntry(_, _)
            | Transition::DeleteFirstEntry(_),
        ) => matches!(
            resulting_state,
            Err(DataEntryTransitionError::FirstEntryAlreadyFinalised)
        ),
        // Expected error: SecondEntryAlreadyFinalised
        (
            DataEntryStatus::Definitive(_),
            Transition::FinaliseFirstEntry(_)
            | Transition::ClaimFirstEntry
            | Transition::UpdateFirstEntry(_, _)
            | Transition::DeleteFirstEntry(_)
            | Transition::FinaliseSecondEntry(_)
            | Transition::ClaimSecondEntry(_)
            | Transition::UpdateSecondEntry(_, _)
            | Transition::DeleteSecondEntry(_),
        ) => matches!(
            resulting_state,
            Err(DataEntryTransitionError::SecondEntryAlreadyFinalised)
        ),
        // All other state transitions should be invalid
        (_, _) => matches!(resulting_state, Err(DataEntryTransitionError::Invalid)),
    }
}

struct Users {
    first: u32,  // used for first entry
    second: u32, // used for second entry
}

impl Users {
    fn first(&self, correct_user: bool) -> u32 {
        if correct_user {
            self.first
        } else {
            self.second
        }
    }

    fn second(&self, correct_user: bool) -> u32 {
        if correct_user {
            self.second
        } else {
            self.first
        }
    }

    fn swap(&mut self) {
        let temp = self.first;
        self.first = self.second;
        self.second = temp;
    }
}

// This fuzz target randomly chooses a sequence of transitions to mutate the state, and checks that
// every step matches the expected state machine defined above
fuzz_target!(|transitions: Vec<Transition>| {
    let mut state = DataEntryStatus::default();

    // Fuzz state to keep track of whether entries are correct, because this influences what
    // happens when an entry is finalised
    let mut first_entry_correct = true;
    let mut second_entry_correct = true;

    let mut users = Users {
        first: 0,
        second: 1,
    };

    for transition in transitions {
        let prev_state = state.clone();

        // Apply transition
        let next_state = match transition {
            Transition::ClaimFirstEntry => {
                if prev_state == DataEntryStatus::Empty {
                    first_entry_correct = true;
                }
                state.claim_first_entry(get_cde(users.first, true))
            }
            Transition::UpdateFirstEntry(correct_user, correct_entry) => {
                let res =
                    state.update_first_entry(get_cde(users.first(correct_user), correct_entry));
                if res.is_ok() {
                    first_entry_correct = correct_entry
                };
                res
            }
            Transition::FinaliseFirstEntry(correct_user) => state.finalise_first_entry(
                &polling_station(),
                &election(),
                users.first(correct_user),
            ),
            Transition::DeleteFirstEntry(correct_user) => {
                state.delete_first_entry(users.first(correct_user))
            }
            Transition::DiscardFirstEntry => state.discard_first_entry(),
            Transition::ClaimSecondEntry(correct_user) => {
                if matches!(prev_state, DataEntryStatus::FirstEntryFinalised(_)) {
                    second_entry_correct = true;
                }
                state.claim_second_entry(get_cde(users.second(correct_user), true))
            }
            Transition::UpdateSecondEntry(correct_user, correct_entry) => {
                let res =
                    state.update_second_entry(get_cde(users.second(correct_user), correct_entry));
                if res.is_ok() {
                    second_entry_correct = correct_entry
                };
                res
            }
            Transition::DeleteSecondEntry(correct_user) => state.delete_second_entry(
                users.second(correct_user),
                &polling_station(),
                &election(),
            ),
            Transition::FinaliseSecondEntry(correct_user) => state
                .finalise_second_entry(&polling_station(), &election(), users.second(correct_user))
                .map(|r| r.0),
            Transition::ResumeFirstEntry => state.resume_first_entry(),
            Transition::DeleteBothEntries => state.delete_entries(),
            Transition::KeepFirstEntry => state.keep_first_entry(&polling_station(), &election()),
            Transition::KeepSecondEntry => {
                let res = state.keep_second_entry(&polling_station(), &election());
                if res.is_ok() {
                    users.swap(); // second user becomes first, because second entry becomes first entry
                    first_entry_correct = second_entry_correct;
                }
                res
            }
        };

        // Check that the applied transition matches what we expect from the state machine
        if !is_as_expected(
            &prev_state,
            &transition,
            &next_state,
            first_entry_correct,
            second_entry_correct,
        ) {
            panic!(
                "Prev: {:?}\n\nNext: {:?}\n\nInvalid transition: {} --{:?}--> {}\nfirst_entry_correct: {}\n",
                &prev_state,
                &next_state,
                prev_state.status_name().to_string(),
                &transition,
                next_state
                    .as_ref()
                    .map(|s| s.status_name().to_string())
                    .unwrap_or_else(|e| e.to_string()),
                first_entry_correct
            )
        }

        // State only updates if there was no error during the transition
        state = next_state.unwrap_or(prev_state)
    }
});
