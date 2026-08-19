use std::collections::HashMap;

use eml_nl::{
    EMLError,
    common::Region,
    documents::election_definition::ElectionDefinition,
    utils::{ContestId, RegionNode},
};

use crate::domain::election::{
    CommitteeCategory, CommitteeDistrict, RegionCategory, RegionDetails, RegionKey,
};

mod expected {
    // This is a module so that we can use these imports without conflicting
    // with the Abacus-specific definitions.
    use eml_nl::utils::{ElectionCategory, RegionCategory};

    /// We expect a certain region category to be at the top of the election tree
    /// for each different category of election. This maps those two together.
    pub const CSB_REGION_CATEGORY: &[(ElectionCategory, RegionCategory)] = &[
        (ElectionCategory::GR, RegionCategory::Municipality),
        (ElectionCategory::PS, RegionCategory::Province),
        (ElectionCategory::AB, RegionCategory::WaterAuthority),
    ];
}

impl TryFrom<eml_nl::utils::RegionCategory> for RegionCategory {
    type Error = EMLError;

    fn try_from(value: eml_nl::utils::RegionCategory) -> Result<Self, Self::Error> {
        Ok(match value {
            eml_nl::utils::RegionCategory::State => RegionCategory::State,
            eml_nl::utils::RegionCategory::WaterAuthority => RegionCategory::WaterAuthority,
            eml_nl::utils::RegionCategory::Province => RegionCategory::Province,
            eml_nl::utils::RegionCategory::ElectoralDistrict => RegionCategory::ElectoralDistrict,
            eml_nl::utils::RegionCategory::Municipality => RegionCategory::Municipality,
            eml_nl::utils::RegionCategory::PollingStation => RegionCategory::PollingStation,
            other => {
                return Err(EMLError::custom(format!(
                    "Region category '{}' should not appear in Abacus",
                    other.to_eml_value()
                )));
            }
        })
    }
}

impl TryFrom<eml_nl::common::RegionKey> for RegionKey {
    type Error = EMLError;

    fn try_from(value: eml_nl::common::RegionKey) -> Result<Self, Self::Error> {
        Ok(RegionKey {
            category: RegionCategory::try_from(value.category)?,
            number: value.number,
        })
    }
}

impl TryFrom<&Region> for RegionDetails {
    type Error = EMLError;

    fn try_from(region: &Region) -> Result<Self, Self::Error> {
        let key = RegionKey::try_from(region.key)?;

        Ok(RegionDetails {
            name: region.name.to_string(),
            key,
            roman_numerals: region.roman_numerals,
            frisian_export_allowed: region.frysian_export_allowed,
        })
    }
}

impl CommitteeDistrict {
    /// Convert the committee district to a contest identifier, used for
    /// EML_NL exports.
    pub fn as_contest_identifier(&self) -> Result<eml_nl::common::ContestIdentifier, EMLError> {
        eml_nl::common::ContestIdentifier::try_from(self)
    }
}

impl TryFrom<&CommitteeDistrict> for eml_nl::common::ContestIdentifier {
    type Error = EMLError;

    fn try_from(district: &CommitteeDistrict) -> Result<Self, Self::Error> {
        Ok(match district {
            CommitteeDistrict::None => eml_nl::common::ContestIdentifier::geen(),
            CommitteeDistrict::All => eml_nl::common::ContestIdentifier::alle(),
            CommitteeDistrict::Specific(region) => {
                let id_number = region
                    .key
                    .number
                    .ok_or(EMLError::custom("Missing region number"))?;

                let id_str = if region.roman_numerals {
                    to_roman_numeral(id_number)
                } else {
                    id_number.to_string()
                };
                eml_nl::common::ContestIdentifier::new(ContestId::new(id_str)?)
                    .with_name(region.name.clone())
            }
        })
    }
}

/// Convert a number to a roman numeral string. This is used for the contest
/// id in the Limburg provincial elections.
fn to_roman_numeral(mut num: u16) -> String {
    const MAPPING: &[(u16, &str)] = &[
        (1000, "M"),
        (900, "CM"),
        (500, "D"),
        (400, "CD"),
        (100, "C"),
        (90, "XC"),
        (50, "L"),
        (40, "XL"),
        (10, "X"),
        (9, "IX"),
        (5, "V"),
        (4, "IV"),
        (1, "I"),
    ];

    let mut result = String::new();
    for &(val, sym) in MAPPING {
        while num >= val {
            result.push_str(sym);
            num -= val;
        }
    }
    result
}

/// Details of a possible committee in this election
#[derive(Debug, Clone)]
pub struct CommitteeDetails {
    /// Details of the region this committee is responsible for
    pub responsible_region: RegionDetails,

    /// Details of the region where the electoral committee is seated.
    pub seat_region: RegionDetails,

    /// The district (i.e. contest) this committee operates within
    pub district: CommitteeDistrict,

    /// Category for the committee (i.e. GSB, HSB, CSB)
    pub category: CommitteeCategory,

    /// If this committee has a specific name, it will be set here.
    ///
    /// Note: most committees do not have specific names.
    pub name: Option<String>,

    /// Managing authority id for this committee (i.e. `CSB`, `HSB1` or `0123`)
    pub managing_authority_id: String,
}

impl CommitteeDetails {
    /// Create new committee details based on the information provided
    fn new(
        responsible_region: &Region,
        seat_region: &Region,
        district: CommitteeDistrict,
        category: CommitteeCategory,
        name: Option<String>,
    ) -> Result<CommitteeDetails, EMLError> {
        let responsible_region: RegionDetails = responsible_region.try_into()?;
        Ok(CommitteeDetails {
            managing_authority_id: managing_authority_id(category, responsible_region.key)?,
            responsible_region,
            seat_region: seat_region.try_into()?,
            district,
            category,
            name,
        })
    }

    /// Create a new committee details for a CSB
    fn new_csb(
        root_region: &RegionNode,
        has_districts: bool,
    ) -> Result<CommitteeDetails, EMLError> {
        // Find the CSB seat region
        let (csb_seat_region, csb_name) =
            find_committee(root_region, eml_nl::utils::CommitteeCategory::CSB);
        CommitteeDetails::new(
            root_region.region(),
            csb_seat_region,
            if has_districts {
                CommitteeDistrict::All
            } else {
                CommitteeDistrict::None
            },
            CommitteeCategory::CSB,
            csb_name,
        )
    }

    pub fn managing_authority_name(&self) -> String {
        self.name
            .clone()
            .unwrap_or_else(|| self.responsible_region.name.clone())
    }

    /// Get the location that the committee sessions will take place
    pub fn location(&self) -> String {
        self.seat_region.name.clone()
    }
}

/// Details of the election tree relevant to Abacus
#[derive(Debug, Clone)]
pub struct ElectionTreeDetails {
    /// Details of the CSB committee for this election.
    pub csb: CommitteeDetails,
    other_committees: HashMap<CommitteeCategory, Vec<CommitteeDetails>>,
}

impl ElectionTreeDetails {
    /// Splits out the committees into different sets for different categories.
    fn new(csb: CommitteeDetails, other_committees: Vec<CommitteeDetails>) -> ElectionTreeDetails {
        let mut map = HashMap::new();
        for c in other_committees {
            map.entry(c.category).or_insert(vec![]).push(c);
        }

        ElectionTreeDetails {
            csb,
            other_committees: map,
        }
    }

    /// Create election tree details given an election definition.
    pub fn from_definition(
        definition: &ElectionDefinition,
    ) -> Result<ElectionTreeDetails, EMLError> {
        ElectionTreeDetails::try_from(definition)
    }

    /// Which categories of committees are available. The returned categories
    /// are not sorted.
    ///
    /// Note this does not include the CSB.
    pub fn available_categories(&self) -> impl Iterator<Item = CommitteeCategory> {
        self.other_committees.keys().copied()
    }

    /// Get the possible committees for a given category of committee.
    /// This returns an empty list if there are no committees of the given
    /// category.
    ///
    /// Note: cannot be used to get the CSB, use [`Self::csb`] instead.
    pub fn get_committees(&self, category: CommitteeCategory) -> &[CommitteeDetails] {
        self.other_committees
            .get(&category)
            .map(|v| &v[..])
            .unwrap_or(&[])
    }

    /// Iterate over all committees, including the CSB.
    pub fn all_committees(&self) -> impl Iterator<Item = &CommitteeDetails> {
        std::iter::once(&self.csb).chain(self.other_committees.values().flatten())
    }

    /// Find a specific committee based on the committee category and a region
    /// key. For the CSB category you do not need to pass a region key, for
    /// all other categories if you pass no region key and there is not exactly
    /// one region of that category, this returns an error. If no committee is
    /// found that matches the given criteria, `None` is returned.
    pub fn get_committee(
        &self,
        category: CommitteeCategory,
        region_key: Option<RegionKey>,
    ) -> Option<&CommitteeDetails> {
        // For the CSB we don't need a region key, just return it immediately
        if category == CommitteeCategory::CSB {
            return Some(&self.csb);
        }

        if let Some(region_key) = region_key {
            // Find the committee with the given key, if it exists
            self.get_committees(category)
                .iter()
                .find(|c| c.responsible_region.key == region_key)
        } else {
            // If no region key is provided, we can only return a committee if
            // there is exactly one committee of the given category.
            let committees = self.get_committees(category);
            if committees.len() == 1 {
                Some(&committees[0])
            } else {
                None
            }
        }
    }
}

impl TryFrom<&ElectionDefinition> for ElectionTreeDetails {
    type Error = EMLError;

    fn try_from(definition: &ElectionDefinition) -> Result<Self, Self::Error> {
        use eml_nl::utils::{ElectionCategory, ElectionSubcategory};

        let election_identifier = &definition.election_event.election.identifier;
        let election_hierarchy = definition
            .election_event
            .election
            .election_tree
            .hierarchy()?;
        let election_category = election_identifier.category.copied_value()?;
        let election_sub_category = election_identifier.subcategory.copied_value()?;
        let root_region = election_hierarchy.root();

        // Check if the root region is of the exepected category
        if !expected::CSB_REGION_CATEGORY
            .iter()
            .any(|(ec, rc)| *ec == election_category && *rc == root_region.key.category)
        {
            return Err(EMLError::custom(format!(
                "The root region does not match an election of category '{}'",
                election_category.to_eml_value()
            )));
        }

        let (committees, has_districts) = match (election_category, election_sub_category) {
            // election within a municipality
            (ElectionCategory::GR, _) => (
                vec![CommitteeDetails::new(
                    root_region.region(),
                    root_region.region(),
                    CommitteeDistrict::None,
                    CommitteeCategory::GSB,
                    None,
                )?],
                false,
            ),
            // elections without a HSB, but larger than a municipality
            (ElectionCategory::AB, _) | (ElectionCategory::PS, ElectionSubcategory::PS1) => {
                (committees_single_electoral_district(root_region)?, false)
            }

            // Elections with HSBs
            (ElectionCategory::PS, ElectionSubcategory::PS2) => {
                (committees_multiple_electoral_districts(root_region)?, true)
            }

            _ => return Err(EMLError::custom("Unsupported election type")),
        };
        let csb = CommitteeDetails::new_csb(root_region, has_districts)?;

        Ok(ElectionTreeDetails::new(csb, committees))
    }
}

fn committees_single_electoral_district(
    root_region: &RegionNode,
) -> Result<Vec<CommitteeDetails>, EMLError> {
    let mut committees = vec![];

    // there should be only a single child under the root region
    if root_region.children().len() != 1 {
        return Err(EMLError::custom("Election should have exactly one HSB"));
    }

    // technically not a HSB, but we will find all our GSBs under this region
    let hsb_region = &root_region.children()[0];
    if hsb_region.key.category != eml_nl::utils::RegionCategory::ElectoralDistrict {
        return Err(EMLError::custom("Expected to find an electoral district"));
    }

    // Add all the GSBs
    for gsb_region in hsb_region.children() {
        if gsb_region.key.category != eml_nl::utils::RegionCategory::Municipality {
            return Err(EMLError::custom("GSB on a non-municipal region"));
        }
        committees.push(CommitteeDetails::new(
            gsb_region.region(),
            gsb_region.region(),
            CommitteeDistrict::None,
            CommitteeCategory::GSB,
            None,
        )?);
    }

    Ok(committees)
}

fn committees_multiple_electoral_districts(
    root_region: &RegionNode,
) -> Result<Vec<CommitteeDetails>, EMLError> {
    let mut committees = vec![];
    for hsb_region in root_region.children() {
        if hsb_region.key.category != eml_nl::utils::RegionCategory::ElectoralDistrict {
            return Err(EMLError::custom("Expected to find an electoral district"));
        }

        let hsb_region_details: RegionDetails = hsb_region.region().try_into()?;
        let district = CommitteeDistrict::Specific(hsb_region_details.clone());
        // TODO: rest of Abacus needs to support HSB first
        // let (hsb_seat_region, hsb_name) =
        //     find_committee(hsb_region, eml_nl::utils::CommitteeCategory::HSB);
        // committees.push(CommitteeDetails::new(
        //     hsb_region.region(),
        //     hsb_seat_region,
        //     district,
        //     CommitteeCategory::HSB,
        //     hsb_name,
        // )?);

        for gsb_region in hsb_region.children() {
            if gsb_region.key.category != eml_nl::utils::RegionCategory::Municipality {
                return Err(EMLError::custom("GSB on a non-municipal region"));
            }
            committees.push(CommitteeDetails::new(
                gsb_region.region(),
                gsb_region.region(),
                district.clone(),
                CommitteeCategory::GSB,
                None,
            )?);
        }
    }

    Ok(committees)
}

/// Find a specific committee within a (sub)tree of the election tree. This is
/// either the first region encountered that thas the committee category
/// specified. If none of those exist, the highest region in the (sub)tree is
/// returned instead.
fn find_committee(
    tree: &RegionNode,
    category: eml_nl::utils::CommitteeCategory,
) -> (&Region, Option<String>) {
    // this checks descendants but also the node itself
    for node in tree.iter() {
        let committees = &node.region().committees;
        if let Some(committee) = committees.iter().find(|c| c.category == category) {
            let committee_name = committee.name.as_ref().map(|n| n.to_string());
            return (node.region(), committee_name);
        }
    }

    (tree.region(), None)
}

fn managing_authority_id(category: CommitteeCategory, key: RegionKey) -> Result<String, EMLError> {
    Ok(match category {
        CommitteeCategory::CSB => "CSB".to_string(),
        // TODO: rest of Abacus first needs to support HSB
        // CommitteeCategory::HSB => format!(
        //     "HSB{}",
        //     key.id
        //         .ok_or(EMLError::custom("Missing region id for HSB"))?
        // ),
        CommitteeCategory::GSB => format!(
            "{:04}",
            key.number
                .ok_or(EMLError::custom("Missing region id for GSB"))?
        ),
    })
}

#[cfg(test)]
mod tests {
    use eml_nl::io::{EMLParsingMode, EMLRead as _};

    use super::*;

    #[test]
    fn test_convert_managing_authority() {
        assert_eq!(
            managing_authority_id(
                CommitteeCategory::CSB,
                RegionKey {
                    category: RegionCategory::Municipality,
                    number: Some(10)
                }
            )
            .unwrap(),
            "CSB"
        );
        assert_eq!(
            managing_authority_id(
                CommitteeCategory::CSB,
                RegionKey {
                    category: RegionCategory::WaterAuthority,
                    number: Some(11)
                }
            )
            .unwrap(),
            "CSB"
        );
        assert_eq!(
            managing_authority_id(
                CommitteeCategory::GSB,
                RegionKey {
                    category: RegionCategory::Municipality,
                    number: Some(12)
                }
            )
            .unwrap(),
            "0012"
        );

        assert!(
            managing_authority_id(
                CommitteeCategory::GSB,
                RegionKey {
                    category: RegionCategory::State,
                    number: None
                }
            )
            .is_err()
        );
    }

    #[test]
    fn test_to_roman_numeral() {
        assert_eq!(to_roman_numeral(99), "XCIX");
        assert_eq!(to_roman_numeral(1), "I");
        assert_eq!(to_roman_numeral(2), "II");
        assert_eq!(to_roman_numeral(55), "LV");
        assert_eq!(to_roman_numeral(21), "XXI");
        assert_eq!(to_roman_numeral(1999), "MCMXCIX");
    }

    #[test]
    fn test_water_authority_election_tree() {
        let definition_str =
            include_str!("tests/definitions/Verkiezingsdefinitie_AB2023_Limburg.eml.xml");
        let definition =
            ElectionDefinition::parse_eml(definition_str, EMLParsingMode::Strict).unwrap();

        let details = ElectionTreeDetails::from_definition(&definition).unwrap();
        assert_eq!(details.csb.responsible_region.name, "Limburg");
        assert_eq!(details.csb.managing_authority_id, "CSB");
        assert_eq!(details.csb.managing_authority_name(), "Limburg");
        assert_eq!(details.csb.location(), "Limburg");
        assert_eq!(details.csb.district, CommitteeDistrict::None);

        assert_eq!(details.get_committees(CommitteeCategory::GSB).len(), 31);

        let gsb_beek = details
            .get_committees(CommitteeCategory::GSB)
            .get(1)
            .expect("Missing GSB");
        assert_eq!(gsb_beek.responsible_region.name, "Beek");
        assert_eq!(gsb_beek.managing_authority_id, "0888");
        assert_eq!(gsb_beek.managing_authority_name(), "Beek");
        assert_eq!(gsb_beek.location(), "Beek");
        assert_eq!(gsb_beek.district, CommitteeDistrict::None);
    }

    #[test]
    fn test_municipal_election_tree() {
        let definition_str =
            include_str!("tests/definitions/Verkiezingsdefinitie_GR2026_Stadskanaal.eml.xml");
        let definition =
            ElectionDefinition::parse_eml(definition_str, EMLParsingMode::Strict).unwrap();
        let details = ElectionTreeDetails::from_definition(&definition).unwrap();

        let csb = details
            .get_committee(CommitteeCategory::CSB, None)
            .expect("Missing CSB");
        assert_eq!(csb.responsible_region.name, "Stadskanaal");
        assert_eq!(csb.managing_authority_id, "CSB");
        assert_eq!(csb.managing_authority_name(), "Stadskanaal");
        assert_eq!(csb.location(), "Stadskanaal");
        assert_eq!(csb.district, CommitteeDistrict::None);

        assert_eq!(details.get_committees(CommitteeCategory::GSB).len(), 1);
        let gsb = details
            .get_committee(CommitteeCategory::GSB, None)
            .expect("Missing GSB");
        assert_eq!(gsb.responsible_region.name, "Stadskanaal");
        assert_eq!(gsb.managing_authority_id, "0037");
        assert_eq!(gsb.managing_authority_name(), "Stadskanaal");
        assert_eq!(gsb.location(), "Stadskanaal");
        assert_eq!(gsb.district, CommitteeDistrict::None);
    }

    #[test]
    fn test_provincial_council_election_tree_single_district() {
        let definition_str =
            include_str!("tests/definitions/Verkiezingsdefinitie_PS2023_Drenthe.eml.xml");
        let definition =
            ElectionDefinition::parse_eml(definition_str, EMLParsingMode::Strict).unwrap();
        let details = ElectionTreeDetails::from_definition(&definition).unwrap();

        assert_eq!(details.csb.responsible_region.name, "Drenthe");
        assert_eq!(details.csb.managing_authority_id, "CSB");
        assert_eq!(details.csb.managing_authority_name(), "Drenthe");
        assert_eq!(details.csb.location(), "Assen");
        assert_eq!(details.csb.district, CommitteeDistrict::None);

        assert_eq!(details.get_committees(CommitteeCategory::GSB).len(), 12);

        let gsb_coev = details
            .get_committees(CommitteeCategory::GSB)
            .get(1)
            .expect("Missing GSB");
        assert_eq!(gsb_coev.responsible_region.name, "Coevorden");
        assert_eq!(gsb_coev.managing_authority_id, "0109");
        assert_eq!(gsb_coev.managing_authority_name(), "Coevorden");
        assert_eq!(gsb_coev.location(), "Coevorden");
        assert_eq!(gsb_coev.district, CommitteeDistrict::None);

        assert!(
            details
                .get_committee(CommitteeCategory::GSB, None)
                .is_none()
        );

        let gsb_tyn = details
            .get_committee(
                CommitteeCategory::GSB,
                Some(RegionKey {
                    category: RegionCategory::Municipality,
                    number: Some(1730),
                }),
            )
            .unwrap();
        assert_eq!(gsb_tyn.managing_authority_name(), "Tynaarlo");
    }

    #[test]
    fn test_provincial_council_election_tree_multiple_districts() {
        let definition_str =
            include_str!("tests/definitions/Verkiezingsdefinitie_PS2023_Gelderland.eml.xml");
        let definition =
            ElectionDefinition::parse_eml(definition_str, EMLParsingMode::Strict).unwrap();
        let details = ElectionTreeDetails::from_definition(&definition).unwrap();

        assert_eq!(details.csb.responsible_region.name, "Gelderland");
        assert_eq!(details.csb.managing_authority_id, "CSB");
        assert_eq!(details.csb.managing_authority_name(), "Gelderland");
        assert_eq!(details.csb.location(), "Arnhem");
        assert_eq!(details.csb.district, CommitteeDistrict::All);

        // assert_eq!(details.get_committees(CommitteeCategory::HSB).len(), 2);
        // let hsb_arnhem = details
        //     .get_committees(CommitteeCategory::HSB)
        //     .get(0)
        //     .expect("Missing HSB");
        // assert_eq!(hsb_arnhem.responsible_region.name, "Arnhem");
        // assert_eq!(hsb_arnhem.managing_authority_id, "HSB1");
        // assert_eq!(hsb_arnhem.managing_authority_name(), "Arnhem");
        // assert_eq!(hsb_arnhem.location(), "Arnhem");
        // assert_eq!(hsb_arnhem.district.region_details().unwrap().name, "Arnhem");

        assert_eq!(details.get_committees(CommitteeCategory::GSB).len(), 51);

        let gsb_apel = details
            .get_committees(CommitteeCategory::GSB)
            .get(1)
            .expect("Missing GSB");
        assert_eq!(gsb_apel.responsible_region.name, "Apeldoorn");
        assert_eq!(gsb_apel.managing_authority_id, "0200");
        assert_eq!(gsb_apel.managing_authority_name(), "Apeldoorn");
        assert_eq!(gsb_apel.location(), "Apeldoorn");
        assert_eq!(gsb_apel.district.region_details().unwrap().name, "Arnhem");
    }

    #[test]
    fn test_provincial_council_election_tree_limburg() {
        let definition_str =
            include_str!("tests/definitions/Verkiezingsdefinitie_PS2023_Limburg.eml.xml");
        let definition =
            ElectionDefinition::parse_eml(definition_str, EMLParsingMode::Strict).unwrap();
        let details = ElectionTreeDetails::from_definition(&definition).unwrap();

        assert_eq!(details.csb.responsible_region.name, "Limburg");
        assert_eq!(details.csb.managing_authority_id, "CSB");
        assert_eq!(details.csb.managing_authority_name(), "Limburg");
        assert_eq!(details.csb.location(), "Maastricht");
        assert_eq!(details.csb.district, CommitteeDistrict::All);

        // assert_eq!(details.get_committees(CommitteeCategory::HSB).len(), 2);
        // let hsb_venlo = details
        //     .get_committees(CommitteeCategory::HSB)
        //     .get(1)
        //     .expect("Missing HSB");
        // assert_eq!(hsb_venlo.responsible_region.name, "Venlo");
        // assert_eq!(hsb_venlo.managing_authority_id, "HSB2");
        // assert_eq!(hsb_venlo.managing_authority_name(), "Venlo");
        // assert_eq!(hsb_venlo.location(), "Venlo");
        // assert_eq!(hsb_venlo.district.region_details().unwrap().name, "Venlo");
        // assert_eq!(
        //     hsb_venlo
        //         .district
        //         .as_contest_identifier()
        //         .unwrap()
        //         .id
        //         .raw()
        //         .to_string(),
        //     "II"
        // );
        assert_eq!(details.get_committees(CommitteeCategory::GSB).len(), 31);
    }
}
