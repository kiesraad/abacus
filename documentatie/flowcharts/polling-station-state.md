# Polling Station State

This document describes the states a polling station can have.   
The transition labels describe the endpoint that is used for performing the transition.
The "save" endpoint, used to for [First/Second]EntryInProgress states is kept out, because Mermaid doesn't render transitions to itself too well.

```mermaid
stateDiagram
NotStarted --> FirstEntryInProgress: claim
#FirstEntryInProgress --> FirstEntryInProgress: save
FirstEntryInProgress --> SecondEntry: finalise
FirstEntryInProgress --> NotStarted: abort
SecondEntry --> SecondEntryInProgress: claim
#SecondEntryInProgress --> SecondEntryInProgress: save
state is_equal <<choice>>
is_equal --> Result: equal? yes
is_equal --> FirstSecondEntryNotEqual: equal? no
SecondEntryInProgress --> is_equal: finalise
SecondEntryInProgress --> SecondEntry: abort
#FirstSecondEntryNotEqual --> FirstSecondEntryNotEqual: save
FirstSecondEntryNotEqual --> NotStarted: abort
FirstSecondEntryNotEqual --> Result: resolve
```
