use serde::{Deserialize, Serialize};

use super::{
    EMLBase, EMLDocument,
    common::{ElectionIdentifier, ManagingAuthority},
};

/// Candidate list (230b)
///
/// Use the `EMLDocument` methods to serialize to or deserialize from XML.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct EML230 {
    #[serde(flatten)]
    pub base: EMLBase,
    pub transaction_id: String,
    #[serde(rename(serialize = "kr:CreationDateTime", deserialize = "CreationDateTime"))]
    pub creation_date_time: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub issue_date: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub managing_authority: Option<ManagingAuthority>,
    pub candidate_list: CandidateList,
}

impl EMLDocument for EML230 {}

impl EML230 {
    #[cfg(test)]
    pub fn affiliations(&self) -> &[Affiliation] {
        &self.candidate_list.election.contest.affiliations
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct CandidateList {
    election: Election,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct Election {
    election_identifier: ElectionIdentifier,
    contest: Contest,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct Contest {
    contest_identifier: ContestIdentifier,
    #[serde(rename = "Affiliation")]
    affiliations: Vec<Affiliation>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct ContestIdentifier {
    #[serde(rename = "@Id")]
    id: String,
}

/// Political group and their candidates
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct Affiliation {
    affiliation_identifier: AffiliationIdentifier,
    #[serde(rename = "Type")]
    affiliation_type: AffiliationType,
    #[serde(rename(serialize = "kr:ListData", deserialize = "ListData"))]
    list_data: ListData,
    #[serde(rename = "Candidate")]
    candidates: Vec<Candidate>,
}

/// Identifier for the political group
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct AffiliationIdentifier {
    #[serde(rename = "@Id")]
    id: String,
    registered_name: String,
}

/// Type of the political group
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AffiliationType {
    #[serde(rename = "lijstengroep")]
    GroupOfLists,
    #[serde(rename = "stel gelijkluidende lijsten")]
    SetOfEqualLists,
    #[serde(rename = "op zichzelf staande lijst")]
    StandAloneList,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct ListData {
    #[serde(rename = "@PublicationLanguage")]
    publication_language: String,
    #[serde(rename = "@PublishGender")]
    publish_gender: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct Candidate {
    candidate_identifier: CandidateIdentifier,
    candidate_full_name: CandidateFullName,
    gender: Gender,
    qualifying_address: QualifyingAddress,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct CandidateIdentifier {
    #[serde(rename = "@Id")]
    id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct CandidateFullName {
    #[serde(rename(serialize = "xnl:PersonName", deserialize = "PersonName"))]
    person_name: PersonName,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct PersonName {
    #[serde(rename(serialize = "xnl:NameLine", deserialize = "NameLine"))]
    name_line: Option<NameLine>,
    #[serde(rename(serialize = "xnl:FirstName", deserialize = "FirstName"))]
    first_name: Option<String>,
    #[serde(
        rename(serialize = "xnl:NamePrefix", deserialize = "NamePrefix"),
        skip_serializing_if = "Option::is_none",
        default
    )]
    name_prefix: Option<String>,
    #[serde(rename(serialize = "xnl:LastName", deserialize = "LastName"))]
    last_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct NameLine {
    #[serde(rename = "@NameType")]
    name_type: String,
    #[serde(rename = "$text")]
    value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Gender {
    Male,
    Female,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct QualifyingAddress {
    #[serde(rename = "$value")]
    data: QualifyingAddressData,
}

impl QualifyingAddress {
    #[cfg(test)]
    pub fn locality_name(&self) -> &str {
        match &self.data {
            QualifyingAddressData::Locality(locality) => &locality.locality_name,
            QualifyingAddressData::Country(country) => &country.locality.locality_name,
        }
    }

    #[cfg(test)]
    pub fn country_name_code(&self) -> Option<&str> {
        match &self.data {
            QualifyingAddressData::Locality(_) => None,
            QualifyingAddressData::Country(country) => Some(&country.country_name_code),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub enum QualifyingAddressData {
    #[serde(rename(serialize = "xal:Locality", deserialize = "Locality"))]
    Locality(Locality),
    #[serde(rename(serialize = "xal:Country", deserialize = "Country"))]
    Country(Country),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Country {
    country_name_code: String,
    locality: Locality,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct Locality {
    #[serde(rename(serialize = "xal:LocalityName", deserialize = "LocalityName"))]
    locality_name: String,
}

#[cfg(test)]
mod tests {
    use crate::eml::{EML230, EMLDocument};

    #[test]
    fn test_deserialize_eml230b() {
        let data = include_str!("./tests/eml230b_test.eml.xml");
        let doc = EML230::from_str(data).unwrap();
        assert_eq!(doc.creation_date_time, "2022-02-03T15:16:47.122");
        let affiliations = doc.affiliations();
        assert_eq!(affiliations.len(), 3);
        let first_pg = affiliations.first().unwrap();
        assert_eq!(first_pg.candidates.len(), 12);
        let candidate = first_pg.candidates.first().unwrap();
        assert_eq!(
            candidate.qualifying_address.locality_name(),
            "Heemdamsebrug"
        );
        assert_eq!(candidate.qualifying_address.country_name_code(), None);

        let candidate = affiliations.get(1).unwrap().candidates.get(3).unwrap();
        assert_eq!(
            candidate.candidate_full_name.person_name.first_name,
            Some("Frédérique".into())
        );
    }
}
