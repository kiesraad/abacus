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

When resolving differences between the first and second entry (`EntriesDifferent` state), the coordinator can choose to
keep one of the entries or discard both. If one of the entries is kept, the other entry is deleted. The remaining entry
will from then on be the first entry, and the data entry is open for a new second entry.
