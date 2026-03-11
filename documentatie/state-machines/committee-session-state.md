# Committee session state

This document describes the states a committee session can have.
The transition labels describe the action that is used for performing the transition.

The label "PS/Inv" on several transitions indicates a "polling station" for the first
committee session, and an "investigation" in any subsequent committee session.

```mermaid
graph TD
  subgraph Standaard flow voor CSB/GSB
    csb_created[Created]
    csb_inpreparation[InPreparation]
    csb_dataentry[DataEntry]
    csb_paused[Paused]
    csb_completed[Completed]

    csb_created --> csb_inpreparation
    csb_inpreparation -->|click start<br/>data entry| csb_dataentry
    csb_dataentry -->|click finish<br/>data entry| csb_completed
    csb_dataentry -->|click pause<br/>data entry| csb_paused
    csb_paused -->|click resume<br/>data entry| csb_dataentry
    csb_paused -->|click finish<br/>data entry| csb_completed
    csb_completed -->|click resume<br/>data entry| csb_dataentry
  end

  classDef gsb_node fill:#bbf,color:#000,stroke:#333,stroke-width:4px;
    
  gsb{"GSB specifiek"}
    
  gsb_ci_add{"add <br/> PS/Inv"}
  gsb_delete{"delete last <br/> PS/Inv"}
  gsb_cd_update{"add/update<br/> PS/Inv"}
  gsb_cd_psresult{"delete polling<br/>station result/Inv"}

  csb_paused -..-> gsb_delete
  csb_dataentry -.-> gsb_delete
  csb_inpreparation -.-> gsb_delete
  csb_completed -.-> gsb_delete
  gsb_delete -.-> csb_created

  gsb_ci_add -.-> csb_inpreparation
  csb_created -.-> gsb_ci_add
    
  csb_completed -.-> gsb_cd_update
  gsb_cd_update -.-> csb_dataentry

  csb_completed ~~~ gsb_delete

  csb_completed -.-> gsb_cd_psresult
  gsb_cd_psresult -.-> csb_dataentry
```