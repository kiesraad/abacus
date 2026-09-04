//! Fixtures and helpers shared by the integration tests.

use chrono::NaiveDate;
use der::{Decode, Tagged, oid::ObjectIdentifier};
use eml_signature::{Certificate, CertificateSubject, Committee, SigningKeyPair};
use x509_cert::Certificate as X509Certificate;

/// Certificate from OSV2020-U for the fictitious municipality Nieuwstrand in
/// `AB2027_Aardenboezem`.
pub const OSV_CRT: &[u8] = include_bytes!("../fixtures/osv2020_nieuwstrand.crt");

/// The fixture election date.
pub const ELECTION_DATE: NaiveDate = NaiveDate::from_ymd_opt(2024, 11, 30).expect("valid date");

/// The fixture issue date.
pub const ISSUE_DATE: NaiveDate = NaiveDate::from_ymd_opt(2024, 11, 1).expect("valid date");

/// A freshly generated keypair. RSA-4096 generation takes about a second, so
/// the tests call this only once.
pub fn keypair() -> SigningKeyPair {
    SigningKeyPair::generate(&test_subject(), ISSUE_DATE, ELECTION_DATE)
        .expect("key generation succeeds")
}

/// A subject built from the same inputs as the OSV fixture certificate, but
/// with Abacus as the creator software.
pub fn test_subject() -> CertificateSubject {
    CertificateSubject::new(
        "AB2027_Aardenboezem",
        "1.1.0",
        Committee::Gsb {
            authority_id: "9998".to_owned(),
            authority_name: "Nieuwstrand".to_owned(),
        },
    )
}

/// The subject of the certificate fixture, with OSV2020-U as the creator software.
pub fn osv_subject() -> CertificateSubject {
    CertificateSubject {
        organizational_unit: "OSV2020-U".to_owned(),
        ..test_subject()
    }
}

/// Get the OSV certificate fixture as a [`Certificate`].
pub fn osv_certificate() -> Certificate {
    Certificate::from_pem(OSV_CRT).expect("fixture is a PEM certificate")
}

/// Get a [`X509Certificate`] from a raw DER-encoded certificate.
pub fn raw_certificate(der: &[u8]) -> X509Certificate {
    X509Certificate::from_der(der).expect("valid certificate")
}

/// The subject attributes as `(attribute OID, ASN.1 string tag)`, in the
/// order they are encoded.
pub fn subject_encoding(certificate: &X509Certificate) -> Vec<(ObjectIdentifier, der::Tag)> {
    certificate
        .tbs_certificate()
        .subject()
        .iter()
        .map(|atv| (atv.oid, atv.value.tag()))
        .collect()
}
