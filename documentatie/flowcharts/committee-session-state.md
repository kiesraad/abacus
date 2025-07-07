# Committee session state

This document describes the states a committee session can have.
The transition labels describe the action/situation that is used for performing the transition.

```mermaid
stateDiagram-v2
  [*] --> Created
  Created --> DataEntryNotStarted: add a polling station
  DataEntryNotStarted --> DataEntryInProgress: click start data entry
  DataEntryNotStarted --> Created: delete last polling station
  DataEntryInProgress --> Created: delete last polling station*
  DataEntryInProgress --> DataEntryFinished: all polling stations <br/> have a result
  DataEntryInProgress --> DataEntryPaused: click pause data entry
  DataEntryPaused --> DataEntryInProgress: click continue data entry
  DataEntryPaused --> Created: delete last polling station*
  DataEntryFinished --> DataEntryInProgress: add new polling station
  DataEntryFinished --> DataEntryInProgress: delete a <br/> polling station result
  DataEntryFinished --> [*]
```

*currently it's only possible to delete polling stations that do not have a data entry,
deleting data entries and results needs to be implemented after which the polling station can be deleted
