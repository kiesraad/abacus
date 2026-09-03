//! The metadata certificate and the public key inside it, in the OSV2020-U
//! format described in README.md.

use chrono::{DateTime, Utc};
use const_oid::db::{rfc4519, rfc5912};
use der::{
    Decode, Encode, Sequence, Tag, Tagged,
    asn1::UintRef,
    pem::{self, LineEnding, PemLabel},
};
use x509_cert::{
    Certificate as X509Certificate, attr::AttributeTypeAndValue, name::Name,
    spki::SubjectPublicKeyInfoOwned, time::Time,
};

use crate::{CertificateSubject, Committee, EmlSignatureError};

/// The RSA modulus size, in bits.
pub const RSA_KEY_BITS: usize = 4096;

/// A parsed X.509 certificate.
///
/// The subject, validity and public key are checked when the certificate is
/// read, so a `Certificate` always holds DER that passed those checks.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Certificate {
    der: Vec<u8>,
    subject: CertificateSubject,
    not_before: DateTime<Utc>,
    not_after: DateTime<Utc>,
    public_key: PublicKey,
}

impl Certificate {
    /// Read a certificate from X.509 DER.
    pub fn from_der(der: &[u8]) -> Result<Self, EmlSignatureError> {
        let certificate = X509Certificate::from_der(der).map_err(invalid_certificate)?;
        let tbs = certificate.tbs_certificate();
        Ok(Self {
            der: der.to_vec(),
            subject: subject_attributes(tbs.subject())?,
            not_before: instant(tbs.validity().not_before)?,
            not_after: instant(tbs.validity().not_after)?,
            public_key: PublicKey::from_spki(tbs.subject_public_key_info())?,
        })
    }

    /// Read a certificate from PEM, the format of the `.crt` file that
    /// OSV2020-U exports.
    pub fn from_pem(pem: &[u8]) -> Result<Self, EmlSignatureError> {
        let (label, der) = pem::decode_vec(pem).map_err(|e| invalid_certificate(e.into()))?;
        X509Certificate::validate_pem_label(label).map_err(|e| invalid_certificate(e.into()))?;
        Self::from_der(&der)
    }

    /// The certificate as PEM (the same format as the `.crt` file from OSV2020-U).
    pub fn to_pem(&self) -> String {
        pem::encode_string(X509Certificate::PEM_LABEL, LineEnding::LF, &self.der)
            .expect("PEM encoding valid DER does not fail")
    }

    /// The certificate as X.509 DER, e.g. for storage.
    pub fn to_der(&self) -> Vec<u8> {
        self.der.clone()
    }

    /// The subject the certificate carries.
    pub fn subject(&self) -> &CertificateSubject {
        &self.subject
    }

    /// Start of the validity period (`notBefore`).
    pub fn not_before(&self) -> DateTime<Utc> {
        self.not_before
    }

    /// End of the validity period (`notAfter`).
    pub fn not_after(&self) -> DateTime<Utc> {
        self.not_after
    }

    /// The RSA public key the certificate carries.
    pub fn public_key(&self) -> &PublicKey {
        &self.public_key
    }
}

/// A validated RSA-4096 public key (the certificate's `SubjectPublicKeyInfo`).
///
/// Two `PublicKey`s are equal when their DER is identical.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PublicKey {
    spki_der: Vec<u8>,
}

impl PublicKey {
    /// Read a public key from `SubjectPublicKeyInfo` DER.
    ///
    /// The key must be `rsaEncryption` with a modulus of exactly
    /// [`RSA_KEY_BITS`].
    pub fn from_der(spki_der: &[u8]) -> Result<Self, EmlSignatureError> {
        let spki = SubjectPublicKeyInfoOwned::from_der(spki_der).map_err(|e| {
            EmlSignatureError::InvalidPublicKey(format!("not a SubjectPublicKeyInfo: {e}"))
        })?;
        Self::from_spki(&spki)
    }

    /// Validate an already parsed `SubjectPublicKeyInfo` and keep its DER.
    pub(crate) fn from_spki(spki: &SubjectPublicKeyInfoOwned) -> Result<Self, EmlSignatureError> {
        if spki.algorithm.oid != rfc5912::RSA_ENCRYPTION {
            return Err(EmlSignatureError::InvalidPublicKey(format!(
                "key algorithm is {}, not rsaEncryption",
                spki.algorithm.oid
            )));
        }
        let rsa_public_key = spki.subject_public_key.as_bytes().ok_or_else(|| {
            EmlSignatureError::InvalidPublicKey("the key BIT STRING has unused bits".to_owned())
        })?;
        let bits = modulus_bits(rsa_public_key)?;
        if bits != RSA_KEY_BITS {
            return Err(EmlSignatureError::InvalidPublicKey(format!(
                "the RSA modulus is {bits} bits, not {RSA_KEY_BITS}"
            )));
        }
        Ok(Self {
            spki_der: spki
                .to_der()
                .map_err(|e| EmlSignatureError::InvalidPublicKey(e.to_string()))?,
        })
    }

    /// The key as `SubjectPublicKeyInfo` DER. This is also what OSV2020-U
    /// stores when a `.crt` is imported.
    pub fn to_der(&self) -> Vec<u8> {
        self.spki_der.clone()
    }

    /// The contents of the SPKI BIT STRING, an RFC 8017 `RSAPublicKey`. This
    /// is the form in which rcgen and aws-lc-rs expose raw public keys.
    pub(crate) fn rsa_public_key_raw(&self) -> Vec<u8> {
        SubjectPublicKeyInfoOwned::from_der(&self.spki_der)
            .expect("the held DER was validated in from_der")
            .subject_public_key
            .as_bytes()
            .expect("unused bits were rejected in from_der")
            .to_vec()
    }
}

/// Read the six attributes from the subject DN. Each attribute must appear
/// exactly once; other attributes are ignored.
fn subject_attributes(name: &Name) -> Result<CertificateSubject, EmlSignatureError> {
    let mut country = None;
    let mut locality = None;
    let mut election_identifier = None;
    let mut organizational_unit = None;
    let mut common_name = None;
    let mut uid = None;

    for attribute in name.iter() {
        let slot = match attribute.oid {
            rfc4519::COUNTRY_NAME => &mut country,
            rfc4519::LOCALITY_NAME => &mut locality,
            rfc4519::ORGANIZATION_NAME => &mut election_identifier,
            rfc4519::ORGANIZATIONAL_UNIT_NAME => &mut organizational_unit,
            rfc4519::COMMON_NAME => &mut common_name,
            rfc4519::USER_ID => &mut uid,
            _ => continue,
        };
        if slot.replace(attribute_string(attribute)?).is_some() {
            return Err(EmlSignatureError::InvalidSubject(format!(
                "duplicate attribute {}",
                attribute.oid
            )));
        }
    }

    let required = |value: Option<String>, name: &str| {
        value.ok_or_else(|| EmlSignatureError::InvalidSubject(format!("missing attribute {name}")))
    };
    Ok(CertificateSubject {
        country: required(country, "C")?,
        election_identifier: required(election_identifier, "O")?,
        organizational_unit: required(organizational_unit, "OU")?,
        common_name: required(common_name, "CN")?,
        committee: Committee::from_uid_and_locality(
            &required(uid, "UID")?,
            &required(locality, "L")?,
        )?,
    })
}

/// Decode an attribute value, which must be an ASN.1 string type, to a `String`.
fn attribute_string(attribute: &AttributeTypeAndValue) -> Result<String, EmlSignatureError> {
    let tag = attribute.value.tag();
    if !matches!(tag, Tag::Utf8String | Tag::PrintableString | Tag::Ia5String) {
        return Err(EmlSignatureError::InvalidSubject(format!(
            "attribute {} is encoded as {tag}, not a string",
            attribute.oid
        )));
    }
    String::from_utf8(attribute.value.value().to_vec()).map_err(|_| {
        EmlSignatureError::InvalidSubject(format!("attribute {} is not UTF-8", attribute.oid))
    })
}

/// `RSAPublicKey ::= SEQUENCE { modulus INTEGER, publicExponent INTEGER }`
/// (RFC 8017), the value inside the SPKI BIT STRING. The `der` crate does not
/// provide this type.
#[derive(Sequence)]
struct RsaPublicKey<'a> {
    modulus: UintRef<'a>,
    public_exponent: UintRef<'a>,
}

/// The modulus size of an RSA public key in bits.
fn modulus_bits(rsa_public_key: &[u8]) -> Result<usize, EmlSignatureError> {
    RsaPublicKey::from_der(rsa_public_key)
        .map(|key| key.modulus.as_bytes().len() * 8)
        .map_err(|e| EmlSignatureError::InvalidPublicKey(format!("malformed RSAPublicKey: {e}")))
}

/// Convert an X.509 `Time` to a chrono `DateTime<Utc>`.
fn instant(time: Time) -> Result<DateTime<Utc>, EmlSignatureError> {
    i64::try_from(time.to_unix_duration().as_secs())
        .ok()
        .and_then(|seconds| DateTime::from_timestamp(seconds, 0))
        .ok_or_else(|| {
            EmlSignatureError::InvalidCertificate(
                "validity is not a representable instant".to_owned(),
            )
        })
}

/// Wrap a `der` error as [`EmlSignatureError::InvalidCertificate`].
pub(crate) fn invalid_certificate(e: der::Error) -> EmlSignatureError {
    EmlSignatureError::InvalidCertificate(e.to_string())
}

#[cfg(test)]
mod tests {
    use der::{Any, asn1::BitString};
    use x509_cert::spki::AlgorithmIdentifierOwned;

    use super::*;

    /// A throwaway self-signed certificate for the rejection tests.
    fn rejection_test_certificate(uid: Option<&str>) -> Vec<u8> {
        use rcgen::DnType;
        let mut dn = rcgen::DistinguishedName::new();
        dn.push(DnType::CountryName, "NL");
        dn.push(DnType::LocalityName, "Nieuwstrand");
        dn.push(DnType::OrganizationName, "AB2027_Aardenboezem");
        dn.push(DnType::OrganizationalUnitName, "test");
        dn.push(DnType::CommonName, "Gemeente Nieuwstrand");
        if let Some(uid) = uid {
            dn.push(
                DnType::CustomDnType(rfc4519::USER_ID.arcs().map(u64::from).collect()),
                uid,
            );
        }

        let mut params = rcgen::CertificateParams::default();
        params.distinguished_name = dn;
        // An ECDSA P-256 key is much faster to generate than an RSA key.
        let key_pair = rcgen::KeyPair::generate().expect("ECDSA key generation succeeds");
        params
            .self_signed(&key_pair)
            .expect("self-signing succeeds")
            .der()
            .to_vec()
    }

    #[test]
    fn rejects_subject_without_uid() {
        assert!(matches!(
            Certificate::from_der(&rejection_test_certificate(None)),
            Err(EmlSignatureError::InvalidSubject(_))
        ));
    }

    #[test]
    fn rejects_unsupported_uid_prefix() {
        // HSB subject, not supported by Abacus yet.
        assert!(matches!(
            Certificate::from_der(&rejection_test_certificate(Some("HSB1"))),
            Err(EmlSignatureError::InvalidSubject(_))
        ));
    }

    #[test]
    fn rejects_key_not_rsa() {
        // Valid subject, but an ECDSA P-256 key.
        assert!(matches!(
            Certificate::from_der(&rejection_test_certificate(Some("PSB9998"))),
            Err(EmlSignatureError::InvalidPublicKey(_))
        ));
    }

    #[test]
    fn rejects_garbage_input() {
        assert!(matches!(
            Certificate::from_der(&[0xff; 8]),
            Err(EmlSignatureError::InvalidCertificate(_))
        ));
        assert!(matches!(
            Certificate::from_pem(b"not a pem"),
            Err(EmlSignatureError::InvalidCertificate(_))
        ));
        assert!(matches!(
            PublicKey::from_der(&[0xff; 8]),
            Err(EmlSignatureError::InvalidPublicKey(_))
        ));
    }

    #[test]
    fn rejects_pem_with_wrong_label() {
        let pem = include_str!("../tests/fixtures/osv2020_nieuwstrand.crt")
            .replace("CERTIFICATE", "PRIVATE KEY");
        assert!(matches!(
            Certificate::from_pem(pem.as_bytes()),
            Err(EmlSignatureError::InvalidCertificate(_))
        ));
    }

    #[test]
    fn rejects_undersized_rsa_key() {
        let rsa_public_key = RsaPublicKey {
            modulus: UintRef::new(&[0x01; 64]).expect("valid 512-bit modulus"),
            public_exponent: UintRef::new(&[0x01, 0x00, 0x01]).expect("valid exponent"),
        };
        let spki = SubjectPublicKeyInfoOwned {
            algorithm: AlgorithmIdentifierOwned {
                oid: rfc5912::RSA_ENCRYPTION,
                parameters: Some(Any::null()),
            },
            subject_public_key: BitString::from_bytes(&rsa_public_key.to_der().expect("encodes"))
                .expect("byte-aligned"),
        };
        assert!(matches!(
            PublicKey::from_der(&spki.to_der().expect("encodes")),
            Err(EmlSignatureError::InvalidPublicKey(_))
        ));
    }
}
