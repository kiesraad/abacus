# Committee session state

This document describes the states a committee session can have.
The transition labels describe the action that is used for performing the transition.

The label PI on several transitions indicates a "polling station" for the first committee session, whereas this is an "investigation" in any subsequent committee session. The transitions with dotted lines for setting investigation findings do not occur in the first committee session.

```mermaid
---
config:
  theme: default
---
%% We use the label PI to indicate either a polling station in the first committee session, or an investigation
%% in any subsequent committee session.
flowchart TD
    %% Start and stop nodes
    Start@{ shape: start, label: " "}
    Stop@{ shape: stop, label: " " }

    %% All regular nodes
    Created(Created)
    Preparing(DataEntryNotStarted)
    InProgress(DataEntryInProgress)
    Paused(DataEntryPaused)
    Finished(DataEntryFinished)

    %% Decision node when deleting a PI during the Preparing state
    PreparingDelete@{ shape: decision, label: " " }
    %% Decision node when deleting a PI during the InProgress state
    InProgressDelete@{ shape: decision, label: " " }

    %%%%
    %%%% Happy flow
    %%%%
    %% Finish data entry is only possible if all PIs have a result
    Start --> Created --add PI--> Preparing --start data entry--> InProgress --finish data entry--> Finished --> Stop

    %%%%
    %%%% Add additional Polling stations/Investigations
    %%%%
    Preparing --add PI--> Preparing
    Paused --add PI--> Paused
    Finished --add PI--> InProgress

    %%%%
    %%%% Pausing
    %%%%
    InProgress --pause data entry--> Paused
    Paused --resume data entry--> InProgress
    %% Only if all PIs have a result
    Paused --finish data entry--> Finished
    Finished --resume data entry--> InProgress

    %%%%
    %%%% Deletes while still preparing
    %%%%
    Preparing --delete PI--> PreparingDelete
    PreparingDelete --not last PI--> Preparing
    PreparingDelete --last PI--> Created

    %%%%
    %%%% Deletes while data entry is in progress
    %%%%
    InProgress --delete PI--> InProgressDelete
    InProgressDelete --not last PI--> InProgress
    InProgressDelete --last PI--> Created

    %%%%
    %%%% Delete PI result while session is finished
    %%%%
    Finished --delete PI result--> InProgress

    %%%%
    %%%% Set investigation result (not in first session)
    %%%%
    InProgress -.set investigation findings.-> InProgress
    Paused -.set investigation findings.-> Paused
```

*currently it's only possible to delete polling stations that do not have a data entry,
deleting data entries and results needs to be implemented (see https://github.com/kiesraad/abacus-internal/issues/296) 
after which the polling station can be deleted
