use serde::{Deserialize, Serialize};

use super::{
    EMLBase, EMLDocument,
    common::{
        AffiliationIdentifier, Candidate, ContestIdentifier, ElectionIdentifier, ManagingAuthority,
    },
};

/// Results data for EML_NL 520
///
/// Use the `EMLDocument` methods to serialize to or deserialize from XML.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct EML520 {
    #[serde(flatten)]
    pub base: EMLBase,
    pub transaction_id: String,
    pub managing_authority: ManagingAuthority,
    #[serde(rename(serialize = "kr:CreationDateTime", deserialize = "CreationDateTime"))]
    pub creation_date_time: String,
    pub result: Result,
}

impl EMLDocument for EML520 {}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct Result {
    pub election: Election,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct Election {
    pub election_identifier: ElectionIdentifier,
    pub contest: Contest,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct Contest {
    pub contest_identifier: ContestIdentifier,
    #[serde(rename = "Selection")]
    pub selections: Vec<Selection>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct Selection {
    #[serde(with = "crate::eml::common::bool_yes_no")]
    elected: bool,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    ranking: Option<u64>,
    #[serde(rename = "$value")]
    selector: Selector,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub enum Selector {
    Candidate(Candidate),
    AffiliationIdentifier(AffiliationIdentifier),
}

#[cfg(test)]
mod tests {
    use crate::eml::{EML520, EMLDocument};

    #[test]
    fn test_deserialize_eml520() {
        let data = include_str!("./tests/eml520_test.eml.xml");
        let doc = EML520::from_str(data).unwrap();
        dbg!(&doc);
        assert_eq!(doc.base.id, "520");
    }
}
