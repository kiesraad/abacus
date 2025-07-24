# Committee session state

This document describes the states a committee session can have.
The transition labels describe the action that is used for performing the transition.

```mermaid
stateDiagram-v2
  [*] --> Created
  Created --> DataEntryNotStarted: add <br/> polling station
  DataEntryNotStarted --> DataEntryInProgress: click start <br/> data entry
  DataEntryNotStarted --> Created: delete last <br/> polling station
  DataEntryInProgress --> Created: delete last <br/> polling station*
  DataEntryInProgress --> DataEntryFinished: click finish <br/> data entry
  DataEntryInProgress --> DataEntryPaused: click pause <br/> data entry
  DataEntryPaused --> DataEntryInProgress: click resume <br/> data entry
  DataEntryPaused --> Created: delete last <br/> polling station*
  DataEntryPaused --> DataEntryFinished: click finish <br/> data entry
  DataEntryFinished --> DataEntryInProgress: add new <br/> polling station
  DataEntryFinished --> DataEntryInProgress: click resume <br/> data entry
  DataEntryFinished --> DataEntryInProgress: delete polling <br/> station result
  DataEntryFinished --> [*]
```

*currently it's only possible to delete polling stations that do not have a data entry,
deleting data entries and results needs to be implemented (see https://github.com/kiesraad/abacus-internal/issues/296) 
after which the polling station can be deleted
