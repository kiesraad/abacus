# Apportionment state

This document describes the states election apportionment can have.
The transition labels describe the action that is used for performing the transition.

```mermaid
stateDiagram-v2
  [*] --> Uninitialised

  Uninitialised --> RegisteringDeceasedCandidates : register_deceased_candidates
  RegisteringDeceasedCandidates --> RegisteringDeceasedCandidates : add_deceased_candidate
  RegisteringDeceasedCandidates --> RegisteringDeceasedCandidates : delete_deceased_candidate

  state is_drawing_lots_required_for_seats <<choice>>
  Uninitialised --> is_drawing_lots_required_for_seats : skip_deceased_candidates
  RegisteringDeceasedCandidates --> is_drawing_lots_required_for_seats : finalise_deceased_candidates
  is_drawing_lots_required_for_seats --> DrawingLotsSeats : [drawing lots for seats required]
  DrawingLotsSeats --> is_drawing_lots_required_for_seats : save_seats_drawing_lots_result
  
  state is_drawing_lots_required_for_candidates <<choice>>
  is_drawing_lots_required_for_seats --> is_drawing_lots_required_for_candidates : [drawing lots for seats not required]
  is_drawing_lots_required_for_candidates --> DrawingLotsCandidates : [drawing lots for candidates required]
  is_drawing_lots_required_for_candidates --> Finalised : [drawing lots for candidates not required]
  DrawingLotsCandidates --> is_drawing_lots_required_for_candidates : save_candidates_drawing_lots_result

  RegisteringDeceasedCandidates --> Uninitialised : reset
  DrawingLots --> Uninitialised : reset
  Finalised --> Uninitialised : reset
  
  Finalised --> [*]
```
