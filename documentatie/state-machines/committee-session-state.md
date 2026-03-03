# Committee session state

This document describes the states a committee session can have.
The transition labels describe the action that is used for performing the transition.

The label "PS/Inv" on several transitions indicates a "polling station" for the first
committee session, and an "investigation" in any subsequent committee session.

```mermaid
stateDiagram-v2
  [*] --> Created
  Created --> InPreparation: add <br/> PS/Inv
  InPreparation --> DataEntry: click start <br/> data entry
  InPreparation --> Created: delete last <br/> PS/Inv
  DataEntry --> Created: delete last <br/> PS/Inv
  DataEntry --> Completed: click finish <br/> data entry
  DataEntry --> Paused: click pause <br/> data entry
  Paused --> DataEntry: click resume <br/> data entry
  Paused --> Created: delete last <br/> PS/Inv
  Paused --> Completed: click finish <br/> data entry
  Completed --> DataEntry: add/update <br/> PS/Inv
  Completed --> DataEntry: delete polling <br/> station result/Inv
  Completed --> DataEntry: click resume <br/> data entry
  Completed --> Created: delete last <br/> PS/Inv
  Completed --> [*]
```
