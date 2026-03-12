# Committee session state

This document describes the states a committee session can have.
The transition labels describe the action that is used for performing the transition.

The label "PS/Inv" on several transitions indicates a "polling station" for the first
committee session, and an "investigation" in any subsequent committee session.

```mermaid
graph TD
  classDef gsb_node fill:#bbf,color:#000,stroke:#333,stroke-width:4px;
    
  csb_created[Created]
  csb_in_preparation[InPreparation]
  csb_data_entry[DataEntry]
  csb_paused[Paused]
  csb_completed[Completed]
    
  csb_created --> csb_in_preparation
  csb_in_preparation -->|click start<br/>data entry| csb_data_entry
  csb_data_entry -->|click finish<br/>data entry| csb_completed
  csb_data_entry -->|click pause<br/>data entry| csb_paused
  csb_paused -->|click resume<br/>data entry| csb_data_entry
  csb_paused -->|click finish<br/>data entry| csb_completed
  csb_completed -->|click resume<br/>data entry| csb_data_entry
    
  gsb_ci_add["add <br/> PS/Inv"]
  gsb_delete["delete last <br/> PS/Inv"]
  gsb_cd_update["add/update<br/> PS/Inv"]
  gsb_cd_ps_result["delete polling<br/>station result/Inv"]

  csb_paused -..-> gsb_delete
  csb_data_entry -.-> gsb_delete
  csb_in_preparation -.-> gsb_delete
  csb_completed -.-> gsb_delete
  gsb_delete -.-> csb_created

  gsb_ci_add -.-> csb_in_preparation
  csb_created -.-> gsb_ci_add
    
  csb_completed -.-> gsb_cd_update
  gsb_cd_update -.-> csb_data_entry

  csb_completed ~~~ gsb_delete

  csb_completed -.-> gsb_cd_ps_result
  gsb_cd_ps_result -.-> csb_data_entry
```