# Data entry state

This document describes the states a data entry can have.
The transition labels describe the endpoint that is used for performing the transition.
The "save" endpoint, used to for [First/Second]EntryInProgress states is kept out, because Mermaid doesn't render self-loops too well.

```mermaid
stateDiagram-v2
  [*] --> FirstEntryNotStarted
  FirstEntryNotStarted --> FirstEntryInProgress: claim
  #FirstEntryInProgress --> FirstEntryInProgress: save
  FirstEntryInProgress --> SecondEntryNotStarted: finalise
  FirstEntryInProgress --> FirstEntryNotStarted: delete
  SecondEntryNotStarted --> SecondEntryInProgress: claim
  #SecondEntryInProgress --> SecondEntryInProgress: save
  state is_equal <<choice>>
  SecondEntryInProgress --> is_equal: finalise
  SecondEntryInProgress --> SecondEntryNotStarted: delete
  state resolve <<choice>>
  EntriesDifferent --> resolve: resolve
  resolve --> SecondEntryNotStarted: keep one entry
  resolve --> FirstEntryNotStarted: discard both entries
  is_equal --> Definitive: equal? yes
  is_equal --> EntriesDifferent: equal? no
  Definitive --> [*]
```
