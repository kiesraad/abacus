//! The certificate subject: the fields that identify the election and the
//! committee a keypair belongs to.

use crate::EmlSignatureError;

/// The value written into `C` (country).
const COUNTRY: &str = "NL";

/// The `UID` prefix of a GSB. PSB (plaatselijk stembureau) is the older name
/// for the GSB that OSV2020-U still uses.
const GSB_UID_PREFIX: &str = "PSB";

/// The software name written into `OU`, followed by the version.
const ORGANIZATIONAL_UNIT: &str = "Abacus";

/// The certificate subject.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CertificateSubject {
    /// Country `C`, e.g. `NL`.
    pub country: String,
    /// Organization `O`, the `Id` of the EML `ElectionIdentifier`, e.g.
    /// `AB2027_Aardenboezem`.
    pub election_identifier: String,
    /// Organizational Unit `OU`, the creator software, e.g. `Abacus 1.2.0` or
    /// `OSV2020-U`.
    pub organizational_unit: String,
    /// Common Name `CN`, `Gemeente <name>` or `Openbaar lichaam <name>`.
    pub common_name: String,
    /// The committee that owns the key, written as locality `L` and unique
    /// identifier `UID`.
    pub committee: Committee,
}

impl CertificateSubject {
    /// Build a new certificate subject for the given election and committee.
    pub fn new(
        election_identifier: impl Into<String>,
        abacus_version: &str,
        committee: Committee,
    ) -> Self {
        Self {
            country: COUNTRY.to_owned(),
            election_identifier: election_identifier.into(),
            organizational_unit: format!("{ORGANIZATIONAL_UNIT} {abacus_version}"),
            common_name: committee.common_name(),
            committee,
        }
    }
}

/// The committee the key belongs to, identified by the committee category and authority.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Committee {
    /// Gemeentelijk stembureau (GSB), e.g. `UID=PSB0123` and `L=Juinen`.
    Gsb {
        /// The four-digit `AuthorityIdentifier` `Id`, e.g. `0123`.
        authority_id: String,
        /// The municipality name, e.g. `Juinen`.
        authority_name: String,
    },
    // Hoofdstembureau (HSB) support will be added later.
}

/// Regions that are `Openbaar lichaam` rather than `Gemeente`.
///
/// The same list lives in `backend/templates/common/scripts.typ`
/// and `SPECIAL_MUNICIPALITIES` in the `eml-nl` crate.
const PUBLIC_BODIES: &[&str] = &["Bonaire", "Saba", "Sint Eustatius"];

impl Committee {
    /// `UID`: unique identifier for the committee.
    pub fn uid(&self) -> String {
        match self {
            Self::Gsb { authority_id, .. } => format!("{GSB_UID_PREFIX}{authority_id}"),
        }
    }

    /// `CN`: common name, the name of the municipality or public body.
    pub fn common_name(&self) -> String {
        match self {
            Self::Gsb { authority_name, .. } => {
                let kind = if PUBLIC_BODIES.contains(&authority_name.as_str()) {
                    "Openbaar lichaam"
                } else {
                    "Gemeente"
                };
                format!("{kind} {authority_name}")
            }
        }
    }

    /// `L`: the name of the region the committee is responsible for.
    pub fn locality(&self) -> &str {
        match self {
            Self::Gsb { authority_name, .. } => authority_name,
        }
    }

    /// The inverse of [`Self::uid`] and [`Self::locality`].
    pub(crate) fn from_uid_and_locality(
        uid: &str,
        locality: &str,
    ) -> Result<Self, EmlSignatureError> {
        match uid.strip_prefix(GSB_UID_PREFIX) {
            Some(authority_id) => Ok(Self::Gsb {
                authority_id: authority_id.to_owned(),
                authority_name: locality.to_owned(),
            }),
            None => Err(EmlSignatureError::InvalidSubject(format!(
                "unsupported UID {uid}"
            ))),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn gsb(authority_name: &str) -> Committee {
        Committee::Gsb {
            authority_id: "0000".to_owned(),
            authority_name: authority_name.to_owned(),
        }
    }

    #[test]
    fn common_name_covers_municipalities_and_public_bodies() {
        assert_eq!(gsb("Juinen").common_name(), "Gemeente Juinen");
        for name in ["Bonaire", "Saba", "Sint Eustatius"] {
            assert_eq!(gsb(name).common_name(), format!("Openbaar lichaam {name}"));
        }
    }

    #[test]
    fn new_builds_subject_from_committee() {
        let subject = CertificateSubject::new("GR2024_Juinen", "1.1.0", gsb("Juinen"));
        assert_eq!(subject.country, "NL");
        assert_eq!(subject.election_identifier, "GR2024_Juinen");
        assert_eq!(subject.organizational_unit, "Abacus 1.1.0");
        assert_eq!(subject.common_name, "Gemeente Juinen");
        assert_eq!(subject.committee, gsb("Juinen"));
    }
}
