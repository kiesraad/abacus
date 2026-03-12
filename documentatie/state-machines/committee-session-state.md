# Committee session state

This document describes the states a committee session can have.
The transition labels describe the action that is used for performing the transition.

Data entry can be linked to a polling station (GSB) or subcommittee (CSB).

**CSB**  
Follow the regular (uninterrupted) lines and use "data entry" (discard "investigation") for this flow.

**GSB**  
Follow the regular (uninterrupted) lines combined with the dotted lines.

In case of the first committee session, use "data entry" (discard "investigation") for this flow.  
For every next committee session, use "investigations" (discard "data entry") for this flow.

```mermaid
flowchart
  flow_start@{ shape: sm-circ }
  flow_end@{ shape: sm-circ }

  created(Created)
  in_preparation(InPreparation)
  data_entry(DataEntry)
  paused(Paused)
  completed(Completed)

  flow_start --> created
  in_preparation -->|click start| data_entry
  data_entry -->|click finish| completed
  data_entry -->|click pause| paused
  paused --->|click resume| data_entry
  paused -->|click finish| completed
  completed -->|click resume| data_entry
  completed --> flow_end

  paused -.->|delete last<br/>data entry or<br/>investigation| created
  data_entry -.->|delete last<br/>data entry or<br/>investigation| created
  in_preparation -.->|delete last<br/>data entry or<br/>investigation| created
  completed -.->|delete last<br/>data entry or<br/>investigation| created

  created -->|add<br/>data entry or<br/>investigation| in_preparation

  completed -.->|add/update<br/>data entry or<br/>investigation| data_entry

  completed -.->|delete polling<br/>station result or<br/>investigation| data_entry
```
