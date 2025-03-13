use serde::{Deserialize, Serialize};

/// Managing authority for the EML document
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct ManagingAuthority {
    pub authority_identifier: AuthorityIdentifier,
    pub authority_address: AuthorityAddress,
}

/// Identifier for a managing authority
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct AuthorityIdentifier {
    #[serde(rename = "@Id")]
    pub id: String,
    #[serde(rename = "$text")]
    pub name: String,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        rename(
            serialize = "kr:CreatedByAuthority",
            deserialize = "CreatedByAuthority"
        )
    )]
    pub created_by_authority: Option<CreatedByAuthority>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct CreatedByAuthority {
    #[serde(rename = "@Id")]
    id: String,
    #[serde(rename = "$text")]
    name: String,
}

/// Address of a managing authority
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct AuthorityAddress {}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ElectionCategory {
    /// Eerste kamer - senate
    EK,
    /// Tweede kamer - house of representatives
    TK,
    /// Europees parlement - European Parliament
    EP,
    /// Provinciale staten - Provincial council
    PS,
    /// Waterschap - Water council
    AB,
    /// Gemeenteraad - Municipal council
    GR,
    /// Eilandsraad - Island council
    ER,
    BC,
    GC,
    NR,
    PR,
    LR,
    IR,
}

impl From<crate::election::ElectionCategory> for ElectionCategory {
    fn from(value: crate::election::ElectionCategory) -> Self {
        match value {
            crate::election::ElectionCategory::Municipal => ElectionCategory::GR,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ElectionSubcategory {
    /// Provinciale staten (provinicial council), single electoral district
    PS1,
    /// Provinciale staten (provincial council), multiple electoral districts
    PS2,
    /// Waterschap (water council), less than 19 seats
    AB1,
    /// Waterschap (water council), more than 19 seats
    AB2,
    /// Gemeenteraad (municipal council), less than 19 seats
    GR1,
    /// Gemeenteraad (municipal council), more than 19 seats
    GR2,
    /// Eilandsraad (island council), less than 19 seats
    ER1,
    /// Eerste kamer - senate
    EK,
    /// Tweede kamer - house of representatives
    TK,
    /// Europees parlement - European parliament
    EP,
    BC,
    GC,
    NR,
    PR,
    LR,
    IR,
}

/// Identifier for a specific election
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct ElectionIdentifier {
    #[serde(rename = "@Id")]
    pub id: String,
    pub election_name: String,
    pub election_category: ElectionCategory,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        rename(
            serialize = "kr:ElectionSubcategory",
            deserialize = "ElectionSubcategory"
        )
    )]
    pub election_subcategory: Option<ElectionSubcategory>,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        rename(serialize = "kr:ElectionDomain", deserialize = "ElectionDomain")
    )]
    pub election_domain: Option<ElectionDomain>,
    #[serde(rename(serialize = "kr:ElectionDate", deserialize = "ElectionDate"))]
    pub election_date: String,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        rename(serialize = "kr:NominationDate", deserialize = "NominationDate")
    )]
    pub nomination_date: Option<String>,
}

/// Election domain part of election identifier
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct ElectionDomain {
    #[serde(rename = "@Id")]
    pub id: String,
    #[serde(rename = "$text")]
    pub name: String,
}
