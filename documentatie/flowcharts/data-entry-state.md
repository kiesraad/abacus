# Data entry state

This document describes the states a data entry can have.   
The transition labels describe the endpoint that is used for performing the transition.
The "save" endpoint, used to for [First/Second]EntryInProgress states is kept out, because Mermaid doesn't render transitions to itself too well.

```mermaid
stateDiagram
NotStarted --> FirstEntryInProgress: delete
#FirstEntryInProgress --> FirstEntryInProgress: save
FirstEntryInProgress --> SecondEntry: finalise
FirstEntryInProgress --> NotStarted: delete
SecondEntry --> SecondEntryInProgress: claim
#SecondEntryInProgress --> SecondEntryInProgress: save
state is_equal <<choice>>
is_equal --> Result: equal? yes
is_equal --> FirstSecondEntryNotEqual: equal? no
SecondEntryInProgress --> is_equal: finalise
SecondEntryInProgress --> SecondEntry: delete
#FirstSecondEntryNotEqual --> FirstSecondEntryNotEqual: save
# Will be Implemented in #130: FirstSecondEntryNotEqual --> NotStarted: delete
FirstSecondEntryNotEqual --> Result: resolve
```
