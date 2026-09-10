//! Fixtures and helpers shared by the integration tests.

use chrono::NaiveDate;
use cms::{cert::CertificateChoices, content_info::ContentInfo, signed_data::SignedData};
use const_oid::db::rfc5911::ID_SIGNED_DATA;
use der::{Any, Decode, Encode, Tagged, oid::ObjectIdentifier};
use eml_signature::{
    Certificate, CertificateSubject, Committee, PublicKey, Signature, SigningKeyPair,
};
use x509_cert::Certificate as X509Certificate;

/// Certificate from OSV2020-U for the fictitious municipality Nieuwstrand in
/// `AB2027_Aardenboezem`.
pub const OSV_CRT: &[u8] = include_bytes!("../fixtures/osv2020_nieuwstrand.crt");

/// The EML and signature from OSV2020-U, extracted from
/// `Telling_AB2027_Aardenboezem_gemeente_Nieuwstrand.zip`.
pub const OSV_EML: &[u8] = include_bytes!("../fixtures/osv2020_nieuwstrand.eml.xml");
pub const OSV_SIGNATURE: &[u8] =
    include_bytes!("../fixtures/osv2020_nieuwstrand.eml.xml.signature");

/// The fixture election date.
pub const ELECTION_DATE: NaiveDate = NaiveDate::from_ymd_opt(2024, 11, 30).expect("valid date");

/// The fixture issue date.
pub const ISSUE_DATE: NaiveDate = NaiveDate::from_ymd_opt(2024, 11, 1).expect("valid date");

/// The public key from the OSV2020-U certificate fixture.
pub fn osv_public_key() -> PublicKey {
    osv_certificate().public_key().clone()
}

/// A freshly generated keypair. RSA-4096 generation takes about a second, so
/// the tests call this as few times as possible.
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

/// The OSV `.signature` fixture as a [`Signature`].
pub fn osv_signature() -> Signature {
    Signature::from_der(OSV_SIGNATURE).expect("fixture is an OSV2020-U signature file")
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

/// The raw `SignedData` of a `.signature` file, for assertions on the
/// signature file structure.
pub fn parse_signed_data(signature: &[u8]) -> SignedData {
    ContentInfo::from_der(signature)
        .expect("valid ContentInfo")
        .content
        .decode_as()
        .expect("valid SignedData")
}

/// Re-encode a `SignedData` as a `.signature` file, the inverse of
/// [`parse_signed_data`].
pub fn signature_file(signed_data: &SignedData) -> Vec<u8> {
    ContentInfo {
        content_type: ID_SIGNED_DATA,
        content: Any::encode_from(signed_data).expect("SignedData encodes"),
    }
    .to_der()
    .expect("ContentInfo encodes")
}

/// The certificate embedded in a `.signature` file, as raw DER.
pub fn embedded_certificate_der(signature: &[u8]) -> Vec<u8> {
    match parse_signed_data(signature)
        .certificates
        .expect("certificates present")
        .0
        .as_slice()
    {
        [CertificateChoices::Certificate(certificate)] => {
            certificate.to_der().expect("certificate encodes")
        }
        _ => panic!("expected exactly one embedded certificate"),
    }
}
