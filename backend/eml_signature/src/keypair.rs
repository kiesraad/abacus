//! The signing keypair: generate a private key with its self-signed metadata
//! certificate, or rebuild one from stored parts. The certificate follows the
//! OSV2020-U format described in README.md.

use chrono::{Datelike, Months, NaiveDate};
use const_oid::db::rfc4519;
use rcgen::{
    CertificateParams, DistinguishedName, DnType, DnValue, IsCa, KeyPair, PKCS_RSA_SHA256,
    RsaKeySize, date_time_ymd,
};
use zeroize::Zeroizing;

use crate::{Certificate, CertificateSubject, EmlSignatureError};

/// How long the certificate remains valid after the election date.
const CERTIFICATE_VALIDITY_MONTHS: u32 = 3;

/// An RSA-4096 signing key with its self-signed metadata certificate.
pub struct SigningKeyPair {
    private_key_der: Zeroizing<Vec<u8>>,
    certificate: Certificate,
}

impl SigningKeyPair {
    /// Generate a signing keypair and certificate for one election.
    ///
    /// Valid from `valid_from` until three months after the election.
    ///
    /// RSA-4096 key generation takes about a second, so call this from a
    /// blocking thread when in async code.
    pub fn generate(
        subject: &CertificateSubject,
        valid_from: NaiveDate,
        election_date: NaiveDate,
    ) -> Result<Self, EmlSignatureError> {
        let not_after = election_date
            .checked_add_months(Months::new(CERTIFICATE_VALIDITY_MONTHS))
            .ok_or(EmlSignatureError::ValidityPeriod)?;

        let params = certificate_params(subject, valid_from, not_after)?;
        let key_pair = generate_key_pair()?;
        let certificate_der = params
            .self_signed(&*key_pair)
            .map(|certificate| certificate.der().to_vec())
            .map_err(|e| EmlSignatureError::CertificateGeneration(e.to_string()))?;
        let certificate = Certificate::from_der(&certificate_der)?;

        Ok(Self {
            private_key_der: Zeroizing::new(key_pair.serialize_der()),
            certificate,
        })
    }

    /// Rebuild a keypair from stored parts, e.g. loaded from a database.
    ///
    /// Returns an error if the private key is not valid PKCS#8 or does not
    /// match the public key in the certificate.
    pub fn new(
        private_key_der: Zeroizing<Vec<u8>>,
        certificate: Certificate,
    ) -> Result<Self, EmlSignatureError> {
        // `Zeroizing` wipes rcgen's copy of the key material on drop.
        let key_pair = Zeroizing::new(
            KeyPair::try_from(&private_key_der[..])
                .map_err(|e| EmlSignatureError::InvalidPrivateKey(e.to_string()))?,
        );
        if key_pair.public_key_raw() != certificate.public_key().rsa_public_key_raw() {
            return Err(EmlSignatureError::KeyCertificateMismatch);
        }
        Ok(Self {
            private_key_der,
            certificate,
        })
    }

    /// The private key as PKCS#8 v1 DER.
    pub fn private_key_der(&self) -> &[u8] {
        &self.private_key_der
    }

    /// The metadata certificate. It is exported as the `.crt` file and, in the
    /// OSV2020-U format, embedded in every `.signature` file.
    pub fn certificate(&self) -> &Certificate {
        &self.certificate
    }
}

/// Generate a fresh RSA-4096 keypair ([`crate::RSA_KEY_BITS`]).
fn generate_key_pair() -> Result<Zeroizing<KeyPair>, EmlSignatureError> {
    // Key size needs to match [`crate::RSA_KEY_BITS`], validated by [`Certificate::from_der`].
    KeyPair::generate_rsa_for(&PKCS_RSA_SHA256, RsaKeySize::_4096)
        .map(Zeroizing::new)
        .map_err(|e| EmlSignatureError::KeyGeneration(e.to_string()))
}

/// Build the rcgen parameters for the certificate.
fn certificate_params(
    subject: &CertificateSubject,
    not_before: NaiveDate,
    not_after: NaiveDate,
) -> Result<CertificateParams, EmlSignatureError> {
    // rcgen's `date_time_ymd` panics for years the `time` crate cannot
    // represent, and `Certificate::from_der` cannot read validity instants
    // before 1970.
    if [not_before, not_after]
        .iter()
        .any(|date| !(1970..=9999).contains(&date.year()))
    {
        return Err(EmlSignatureError::ValidityPeriod);
    }
    if not_before > not_after {
        return Err(EmlSignatureError::ValidityPeriod);
    }

    let (year, month, day) = ymd(not_before);
    let mut params = CertificateParams::default();
    params.not_before = date_time_ymd(year, month, day);

    let (year, month, day) = ymd(not_after);
    params.not_after = date_time_ymd(year, month, day);
    params.distinguished_name = distinguished_name(subject)?;

    // OSV2020-U emits a v3 certificate without an extensions block. Clearing
    // these parameters makes rcgen omit the block.
    params.is_ca = IsCa::NoCa;
    params.key_usages = Vec::new();
    params.extended_key_usages = Vec::new();
    params.subject_alt_names = Vec::new();
    params.use_authority_key_identifier_extension = false;

    // Without an explicit serial number, rcgen uses the first 20 bytes of the
    // SHA-256 hash of the public key.

    Ok(params)
}

/// The subject DN with the attributes in the order `C, L, O, OU, CN, UID`.
///
/// OSV2020-U encodes `C` as `PrintableString` and the rest as `UTF8String`.
fn distinguished_name(
    subject: &CertificateSubject,
) -> Result<DistinguishedName, EmlSignatureError> {
    let country = subject.country.as_str().try_into().map_err(|_| {
        EmlSignatureError::InvalidSubject(format!(
            "C must be a PrintableString, {:?} is not",
            subject.country
        ))
    })?;
    let committee = &subject.committee;

    let mut dn = DistinguishedName::new();
    dn.push(DnType::CountryName, DnValue::PrintableString(country));
    dn.push(DnType::LocalityName, committee.locality());
    dn.push(
        DnType::OrganizationName,
        subject.election_identifier.as_str(),
    );
    dn.push(
        DnType::OrganizationalUnitName,
        subject.organizational_unit.as_str(),
    );
    dn.push(DnType::CommonName, subject.common_name.as_str());
    dn.push(
        DnType::CustomDnType(rfc4519::USER_ID.arcs().map(u64::from).collect()),
        committee.uid(),
    );
    Ok(dn)
}

/// Split a chrono [`NaiveDate`] into the year, month and day that
/// [`date_time_ymd`] takes.
fn ymd(date: NaiveDate) -> (i32, u8, u8) {
    let month = u8::try_from(date.month()).expect("chrono months fit in a u8");
    let day = u8::try_from(date.day()).expect("chrono days fit in a u8");
    (date.year(), month, day)
}

#[cfg(test)]
mod tests {
    use crate::Committee;

    use super::*;

    /// A valid RSA-4096 certificate, loaded from the OSV2020-U fixture because
    /// generating one is slow.
    fn osv_certificate() -> Certificate {
        Certificate::from_pem(include_bytes!("../tests/fixtures/osv2020_nieuwstrand.crt"))
            .expect("fixture is a valid certificate")
    }

    fn test_subject() -> CertificateSubject {
        CertificateSubject::new(
            "AB2027_Aardenboezem",
            "1.1.0",
            Committee::Gsb {
                authority_id: "9998".to_owned(),
                authority_name: "Nieuwstrand".to_owned(),
            },
        )
    }

    #[test]
    fn rejects_impossible_validity_period() {
        let election_date = NaiveDate::from_ymd_opt(2024, 11, 30).unwrap();
        let issued = NaiveDate::from_ymd_opt(2024, 11, 1).unwrap();
        // Created more than three months after the election: never valid.
        let late = NaiveDate::from_ymd_opt(2025, 3, 1).unwrap();
        assert_eq!(
            SigningKeyPair::generate(&test_subject(), late, election_date).err(),
            Some(EmlSignatureError::ValidityPeriod)
        );
        // `notAfter` in year 10000: not representable in a certificate.
        let far_election = NaiveDate::from_ymd_opt(9999, 11, 30).unwrap();
        assert_eq!(
            SigningKeyPair::generate(&test_subject(), issued, far_election).err(),
            Some(EmlSignatureError::ValidityPeriod)
        );
        // `notBefore` before 1970: not readable back.
        let before_epoch = NaiveDate::from_ymd_opt(1969, 12, 31).unwrap();
        assert_eq!(
            SigningKeyPair::generate(&test_subject(), before_epoch, election_date).err(),
            Some(EmlSignatureError::ValidityPeriod)
        );
    }

    #[test]
    fn rejects_corrupt_private_key() {
        assert!(matches!(
            SigningKeyPair::new(Zeroizing::new(vec![0xff; 128]), osv_certificate()),
            Err(EmlSignatureError::InvalidPrivateKey(_))
        ));
    }

    #[test]
    fn rejects_key_not_matching_certificate() {
        // An ECDSA P-256 key (fast to generate). Certificates are RSA-only, so
        // any non-RSA key is a mismatch.
        let other_key = KeyPair::generate().expect("ECDSA key generation succeeds");
        assert_eq!(
            SigningKeyPair::new(Zeroizing::new(other_key.serialize_der()), osv_certificate()).err(),
            Some(EmlSignatureError::KeyCertificateMismatch)
        );
    }
}
