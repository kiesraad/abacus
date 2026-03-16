# Committee session state

This document describes the states a committee session can have.
The transition labels describe the action that is used for performing the transition.

**CSB**  
Follow the regular (uninterrupted) lines and use `subcommittee` (ignore `polling station` and `investigation`) for this flow.

> **Note:** The subcommittee is automatically created when a CSB election is created.  
> Therefore the status will move directly from `Created` to `InPreparation`.

**GSB**  
Follow the regular (uninterrupted) lines combined with the dotted lines.

In case of the first committee session, use `polling station` (ignore `investigation` and `subcommittee`) for this flow.  
For every next committee session, use `investigation` (ignore `polling station` and `subcommittee`) for this flow.

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

  paused -.->|delete last<br/>polling station<br/>or investigation| created
  data_entry -.->|delete last<br/>polling station<br/>or investigation| created
  in_preparation -.->|delete last<br/>polling station<br/>or investigation| created
  completed -.->|delete last<br/>polling station<br/>or investigation| created

  created -->|add<br/>polling station,<br/>investigation or<br/>subcommittee*| in_preparation

  completed -.->|add/update<br/>polling station<br/>or investigation| data_entry

  completed -.->|delete<br/>data entry,</br> polling station<br/> or investigation| data_entry
```
