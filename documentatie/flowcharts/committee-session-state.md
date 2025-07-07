# Committee session state

This document describes the states a committee session can have.
The transition labels describe the action/situation that is used for performing the transition.

```mermaid
stateDiagram-v2
  [*] --> Created
  Created --> DataEntryNotStarted: add a polling station
  DataEntryNotStarted --> Created: delete last polling station
  DataEntryNotStarted --> DataEntryInProgress: click start data entry
  DataEntryInProgress --> Created: delete last polling station*
  DataEntryInProgress --> DataEntryFinished: all polling station <br/> data entries are complete <br/> without errors or differences
  DataEntryInProgress --> DataEntryPaused: click pause data entry
  DataEntryPaused --> DataEntryInProgress: click continue data entry
  DataEntryFinished --> DataEntryInProgress: add new polling station
  DataEntryFinished --> [*]
```

* currently it's only possible to delete polling stations that do not have a data entry