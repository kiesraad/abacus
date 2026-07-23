# Data entry state

This document describes the states a data entry can have.
The transition labels describe the endpoint that is used for performing the transition.

The `save` endpoint which is used for [First/Second]EntryInProgress states is kept out, because Mermaid doesn't render self-loops too well.

All states except for `FirstEntryHasErrors` and `EntriesDifferent` also have a `reset` endpoint which transitions to the `Empty` state. 

Note the difference between `discard` and `reset`:
- `discard` is a typist removing their own _in-progress_ entry (the `data_entry_discard` endpoint). Discarding an in-progress second entry keeps the finalised first entry. 
- `reset` is a coordinator clearing the whole data entry back to `Empty` (the `data_entry_reset` endpoint). It always removes _both_ entries.

When resolving differences between the first and second entry (`EntriesDifferent` state), the coordinator can choose to
discard one of the two data entries. The remaining entry will from then on be the first entry, and the data entry is open for a new second entry.

```mermaid
stateDiagram-v2
  [*] --> Empty
  Empty --> FirstEntryInProgress: claim

  state first_has_errors <<choice>>
  FirstEntryInProgress --> first_has_errors: finalise
  FirstEntryInProgress --> Empty: discard
  first_has_errors --> FirstEntryFinalised: errors? no
  first_has_errors --> FirstEntryHasErrors: errors? yes

  FirstEntryFinalised --> SecondEntryInProgress: claim
  SecondEntryInProgress --> FirstEntryFinalised: discard

  state first_resolve_errors <<choice>>
  FirstEntryHasErrors --> first_resolve_errors: resolve errors
  first_resolve_errors --> FirstEntryInProgress: resume first entry
  first_resolve_errors --> Empty: discard first entry
  
  state is_different <<choice>>
  SecondEntryInProgress --> is_different: finalise
  is_different --> EntriesDifferent: different? yes
  is_different --> Definitive: different? no
  
  state resolve <<choice>>
  EntriesDifferent --> resolve: resolve differences
  resolve --> Empty: discard both entries
  resolve --> first_has_errors: keep one entry
  resolve --> FirstEntryCorrection: correct first entry
  resolve --> SecondEntryCorrection: correct second entry

  FirstEntryCorrection --> is_different: finalise
  FirstEntryCorrection --> FirstEntryFinalised: discard
  SecondEntryCorrection --> FirstEntryFinalised: discard
  SecondEntryCorrection --> is_different: finalise

  Definitive --> [*]
```


