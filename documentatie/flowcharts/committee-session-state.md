# Committee session state

This document describes the states a committee session can have.
The transition labels describe the action that is used for performing the transition.

The label "PS/Inv" on several transitions indicates a "polling station" for the first
committee session, and an "investigation" in any subsequent committee session.

```mermaid
stateDiagram-v2
  [*] --> Created
  Created --> DataEntryNotStarted: add <br/> PS/Inv
  DataEntryNotStarted --> DataEntryInProgress: click start <br/> data entry
  DataEntryNotStarted --> Created: delete last <br/> PS/Inv
  DataEntryInProgress --> Created: delete last <br/> PS/Inv*
  DataEntryInProgress --> DataEntryFinished: click finish <br/> data entry
  DataEntryInProgress --> DataEntryPaused: click pause <br/> data entry
  DataEntryPaused --> DataEntryInProgress: click resume <br/> data entry
  DataEntryPaused --> Created: delete last <br/> PS/Inv*
  DataEntryPaused --> DataEntryFinished: click finish <br/> data entry
  DataEntryFinished --> DataEntryInProgress: add new <br/> PS/Inv
  DataEntryFinished --> DataEntryInProgress: click resume <br/> data entry
  DataEntryFinished --> DataEntryInProgress: delete polling <br/> station result
  DataEntryFinished --> [*]
```

*currently it's only possible to delete polling stations that do not have a data entry,
deleting data entries and results needs to be implemented
([#1812](https://github.com/kiesraad/abacus/issues/1812))
after which the polling station can be deleted
