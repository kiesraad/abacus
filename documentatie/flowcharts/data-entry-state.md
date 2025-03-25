# Data entry state

This document describes the states a data entry can have.
The transition labels describe the endpoint that is used for performing the transition.
The "save" endpoint, used to for [First/Second]EntryInProgress states is kept out, because Mermaid doesn't render self-loops too well.

```mermaid
stateDiagram
  direction LR
  state is_equal <<choice>>
  FirstEntryNotStarted --> FirstEntryInProgress:claim
  #FirstEntryInProgress --> FirstEntryInProgress:save
  FirstEntryInProgress --> SecondEntryNotStarted:finalise
  FirstEntryInProgress --> FirstEntryNotStarted:delete
  SecondEntryNotStarted --> SecondEntryInProgress:claim
  is_equal --> Definitive:equal? yes
  is_equal --> EntriesDifferent:equal? no
  #SecondEntryInProgress --> SecondEntryInProgress:save
  SecondEntryInProgress --> is_equal:finalise
  SecondEntryInProgress --> SecondEntryNotStarted:delete
  EntriesDifferent --> FirstEntryInProgress: discard both entries
  EntriesDifferent --> SecondEntryInProgress:keep one entry
```
