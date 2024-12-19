# Data entry state

This document describes the states a data entry can have.
The transition labels describe the endpoint that is used for performing the transition.
The "save" endpoint, used to for [First/Second]EntryInProgress states is kept out, because Mermaid doesn't render transitions to itself too well.

```mermaid
stateDiagram
FirstEntryNotStarted --> FirstEntryInProgress: claim
#FirstEntryInProgress --> FirstEntryInProgress: save
FirstEntryInProgress --> SecondEntryNotStarted: finalise
FirstEntryInProgress --> FirstEntryNotStarted: delete
SecondEntryNotStarted --> SecondEntryInProgress: claim
#SecondEntryInProgress --> SecondEntryInProgress: save
state is_equal <<choice>>
is_equal --> Definitive: equal? yes
is_equal --> EntriesNotEqual: equal? no
SecondEntryInProgress --> is_equal: finalise
SecondEntryInProgress --> SecondEntryNotStarted: delete
#EntriesNotEqual --> EntriesNotEqual: save
# Will be Implemented in #130: EntriesNotEqual --> NotStarted: delete
EntriesNotEqual --> Definitive: resolve
```
