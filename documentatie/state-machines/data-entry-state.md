# Data entry state

This document describes the states a data entry can have.
The transition labels describe the endpoint that is used for performing the transition.
The "save" endpoint which is used for [First/Second]EntryInProgress states is kept out, because Mermaid doesn't render self-loops too well.

Note the difference between `discard` and `reset`:
- `discard` is a typist removing their own _in-progress_ entry (the `data_entry_discard` endpoint). Discarding an in-progress second entry keeps the finalised first entry. 
- `reset` is a coordinator clearing the whole data entry back to `Empty` (the `data_entry_reset` endpoint). It always removes _both_ entries.

```mermaid
stateDiagram-v2
  [*] --> Empty
  Empty --> FirstEntryInProgress: claim
  %% FirstEntryInProgress --> FirstEntryInProgress: save

  state first_has_errors <<choice>>
  FirstEntryInProgress --> first_has_errors: finalise
  FirstEntryInProgress --> Empty: discard
  
  first_has_errors --> FirstEntryFinalised: errors? no
  first_has_errors --> FirstEntryHasErrors: errors? yes

  FirstEntryFinalised --> SecondEntryInProgress: claim
  %% SecondEntryInProgress --> SecondEntryInProgress: save
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
  resolve --> first_has_errors: keep one entry
  resolve --> Empty: discard both entries
  FirstEntryInProgress --> Empty: reset
  FirstEntryFinalised --> Empty: reset
  SecondEntryInProgress --> Empty: reset
  Definitive --> Empty: reset

  Definitive --> [*]
```

When resolving differences between the first and second entry (`EntriesDifferent` state), the coordinator can choose to
keep one of the entries or discard both. If one of the entries is kept, the other entry is discarded. The remaining entry
will from then on be the first entry, and the data entry is open for a new second entry.

When the coordinator resets the data entry while there's a second entry (`SecondEntryInProgress` &
`Definitive` state), both entries will be deleted.
