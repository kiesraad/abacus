//! Compare this crate's output with OSV2020-U output: a created certificate
//! and `.signature` must match the OSV format, and the OSV fixtures must
//! parse, verify and round-trip.

mod common;

use chrono::{DateTime, NaiveDate, TimeZone, Utc};
use cms::{
    content_info::{CmsVersion, ContentInfo},
    signed_data::{SignerIdentifier, SignerInfos},
};
use common::*;
use const_oid::db::{rfc4519, rfc5911, rfc5912};
use der::{Any, Decode, Encode, Tag, Tagged};
use eml_signature::{EmlSignatureError, RSA_KEY_BITS, Signature, SigningKeyPair};
use x509_cert::{Certificate as X509Certificate, Version, spki::SubjectPublicKeyInfoOwned};
use zeroize::Zeroizing;

/// Assert that the shape of the certificate matches OSV2020-U.
fn assert_osv_shape(certificate: &X509Certificate) {
    let tbs = certificate.tbs_certificate();
    assert_eq!(tbs.version(), Version::V3);
    assert!(
        tbs.extensions().is_none(),
        "OSV2020-U emits no extensions block"
    );
    assert_eq!(
        tbs.issuer(),
        tbs.subject(),
        "the certificate is self-signed"
    );
    assert_eq!(
        certificate.signature_algorithm().oid,
        rfc5912::SHA_256_WITH_RSA_ENCRYPTION
    );
    assert_eq!(
        certificate.signature_algorithm(),
        tbs.signature(),
        "the inner and outer algorithm identifiers must agree"
    );
    assert_eq!(
        certificate.signature().as_bytes().map(<[u8]>::len),
        Some(RSA_KEY_BITS / 8),
        "an RSA-4096 self-signature is 512 bytes"
    );
}

/// Assert the OSV2020-U attribute order and string types: `C` is a
/// `PrintableString` and the rest are `UTF8String`.
fn assert_subject_encoding(certificate: &X509Certificate) {
    let expected = [
        (rfc4519::COUNTRY_NAME, Tag::PrintableString),
        (rfc4519::LOCALITY_NAME, Tag::Utf8String),
        (rfc4519::ORGANIZATION_NAME, Tag::Utf8String),
        (rfc4519::ORGANIZATIONAL_UNIT_NAME, Tag::Utf8String),
        (rfc4519::COMMON_NAME, Tag::Utf8String),
        (rfc4519::USER_ID, Tag::Utf8String),
    ];
    assert_eq!(subject_encoding(certificate), expected);
}

fn midnight(date: NaiveDate) -> DateTime<Utc> {
    date.and_hms_opt(0, 0, 0).expect("valid time").and_utc()
}

/// All assertions on the generated certificate, in a single test so that the
/// slow key generation runs only once.
#[test]
fn created_certificate_matches_osv2020() {
    let keypair = keypair();
    assert!(!keypair.private_key_der().is_empty());
    let certificate = keypair.certificate();
    let pem = certificate.to_pem();
    assert!(pem.starts_with("-----BEGIN CERTIFICATE-----\n"));

    let ours = raw_certificate(&certificate.to_der());
    let osv = raw_certificate(&osv_certificate().to_der());
    assert_osv_shape(&osv);
    assert_osv_shape(&ours);
    assert_eq!(
        ours.signature_algorithm(),
        osv.signature_algorithm(),
        "same signature algorithm identifier, parameters included"
    );
    assert_eq!(
        ours.tbs_certificate().subject_public_key_info().algorithm,
        osv.tbs_certificate().subject_public_key_info().algorithm,
        "same key algorithm identifier, parameters included"
    );

    let serial = ours.tbs_certificate().serial_number().as_bytes();
    assert!((1..=20).contains(&serial.len()), "serial was {serial:?}");
    assert_eq!(serial[0] & 0x80, 0, "the serial must encode as positive");

    assert_subject_encoding(&ours);
    assert_subject_encoding(&osv);

    assert_eq!(certificate.subject(), &test_subject());
    assert_eq!(
        certificate.subject().common_name,
        certificate.subject().committee.common_name(),
        "the CN in the certificate matches what Committee::common_name derives"
    );
    SubjectPublicKeyInfoOwned::from_der(&certificate.public_key().to_der()).expect("SPKI DER");
    assert_eq!(
        certificate.public_key().to_der(),
        ours.tbs_certificate()
            .subject_public_key_info()
            .to_der()
            .unwrap(),
        "the public key is the certificate's SPKI"
    );

    assert_eq!(certificate.not_before(), midnight(ISSUE_DATE));
    assert_eq!(
        certificate.not_after(),
        midnight(NaiveDate::from_ymd_opt(2025, 2, 28).unwrap())
    );

    // The storage round trip: the stored parts rebuild the keypair.
    SigningKeyPair::new(
        Zeroizing::new(keypair.private_key_der().to_vec()),
        certificate.clone(),
    )
    .expect("the key matches its own certificate");
}

/// Parse the OSV2020-U certificate fixture.
#[test]
fn parses_osv_certificate() {
    let certificate = osv_certificate();
    assert_eq!(certificate.subject(), &osv_subject());
    assert_eq!(
        certificate.not_before(),
        Utc.with_ymd_and_hms(2026, 8, 28, 13, 53, 7).unwrap()
    );
    assert_eq!(
        certificate.not_after(),
        Utc.with_ymd_and_hms(2027, 6, 16, 22, 0, 0).unwrap()
    );
}

/// Round-trip the fixture through `Certificate::from_pem` and
/// `Certificate::to_pem`.
#[test]
fn certificate_to_pem_round_trips_the_osv_file() {
    let pem = osv_certificate().to_pem();

    assert!(pem.starts_with("-----BEGIN CERTIFICATE-----\n"));
    assert!(pem.trim_end().ends_with("-----END CERTIFICATE-----"));
    assert!(
        pem.lines().nth(1).is_some_and(|l| l.len() <= 64),
        "OSV serves 64-character base64 lines"
    );
    assert_eq!(
        pem.trim_end(),
        std::str::from_utf8(OSV_CRT).unwrap().trim_end(),
        "PEM -> DER -> PEM reproduces the file OSV served"
    );
}

/// Assert that the shape of the signature file matches OSV2020-U.
fn assert_osv_signature_file_shape(name: &str, signature: &[u8]) {
    let signed_data = parse_signed_data(signature);

    assert_eq!(signed_data.version, CmsVersion::V1, "{name}");
    assert!(signed_data.crls.is_none(), "{name}");

    let [digest_algorithm] = signed_data.digest_algorithms.as_slice() else {
        panic!("{name}: expected one digestAlgorithm");
    };
    assert_eq!(digest_algorithm.oid, rfc5912::ID_SHA_256, "{name}");
    assert_eq!(
        digest_algorithm.parameters,
        Some(Any::null()),
        "{name}: sha256 with explicit NULL parameters"
    );

    // Present but empty
    assert_eq!(
        signed_data.encap_content_info.econtent_type,
        rfc5911::ID_DATA,
        "{name}"
    );
    let econtent = signed_data.encap_content_info.econtent.expect("present");
    assert_eq!(econtent.tag(), Tag::OctetString, "{name}");
    assert!(econtent.value().is_empty(), "{name}");

    assert_eq!(
        signed_data.certificates.expect("present").0.len(),
        1,
        "{name}: exactly one embedded certificate"
    );
    assert_eq!(signed_data.signer_infos.0.len(), 1, "{name}");
}

/// The `signerInfo` carries no attributes, uses `rsaEncryption`, and
/// identifies the embedded certificate.
fn assert_signer_info_matches_the_certificate(keypair: &SigningKeyPair, signature: &Signature) {
    let signed_data = parse_signed_data(&signature.to_der());
    let certificate = raw_certificate(&keypair.certificate().to_der());

    let [signer_info] = signed_data.signer_infos.0.as_slice() else {
        panic!("expected one signerInfo");
    };

    assert_eq!(signer_info.version, CmsVersion::V1);
    assert!(
        signer_info.signed_attrs.is_none(),
        "signedAttrs change what is signed"
    );
    assert!(signer_info.unsigned_attrs.is_none());
    assert_eq!(
        signer_info.signature.as_bytes().len(),
        RSA_KEY_BITS / 8,
        "an RSA-4096 signature is 512 bytes"
    );

    assert_eq!(
        signer_info.signature_algorithm.oid,
        rfc5912::RSA_ENCRYPTION,
        "rsaEncryption, not sha256WithRSAEncryption"
    );
    assert_eq!(
        signer_info.signature_algorithm.parameters,
        Some(Any::null()),
        "explicit NULL parameters"
    );

    let SignerIdentifier::IssuerAndSerialNumber(sid) = &signer_info.sid else {
        panic!("expected issuerAndSerialNumber");
    };
    let tbs = certificate.tbs_certificate();
    assert_eq!(
        sid.issuer.to_der().expect("issuer encodes"),
        tbs.subject().to_der().expect("subject encodes"),
        "the sid issuer and subject are equal"
    );
    assert_eq!(&sid.serial_number, tbs.serial_number());
}

/// All assertions on a `.signature` made with a generated keypair, in a
/// single test so that the slow key generation runs only once.
#[test]
fn signature_file_matches_osv2020() {
    let keypair = keypair();
    let signature = keypair.sign(OSV_EML).unwrap();

    assert_osv_signature_file_shape("ours", &signature.to_der());
    assert_osv_signature_file_shape("OSV", OSV_SIGNATURE);
    assert_signer_info_matches_the_certificate(&keypair, &signature);

    assert_eq!(
        embedded_certificate_der(&signature.to_der()),
        keypair.certificate().to_der(),
        "the certificate DER survives the round trip through cms/x509-cert unchanged"
    );

    // PKCS#1 v1.5 is deterministic: signing the same bytes again reproduces
    // the same file.
    assert_eq!(keypair.sign(OSV_EML).unwrap().to_der(), signature.to_der());

    // An empty document signs and verifies, and its signature covers nothing
    // else.
    let public_key = keypair.certificate().public_key();
    let empty = keypair.sign(b"").unwrap();
    public_key.verify(b"", &empty).unwrap();
    assert_eq!(
        public_key.verify(b" ", &empty),
        Err(EmlSignatureError::SignatureInvalid)
    );
}

/// Generate, sign and verify with a new keypair, and test that
/// verification depends on the key alone.
#[test]
fn generate_sign_verify_round_trip() {
    let keypair = keypair();
    let eml = b"<EML xmlns=\"urn:oasis:names:tc:evs:schema:eml\">test</EML>";

    let signature = keypair.sign(eml).unwrap();
    let public_key = keypair.certificate().public_key();

    public_key
        .verify(eml, &signature)
        .expect("round trip verifies");
    assert_eq!(
        public_key.verify(b"<EML>other</EML>", &signature),
        Err(EmlSignatureError::SignatureInvalid)
    );

    // A signature that is valid under one key is invalid under the other,
    // and vice versa.
    assert_eq!(
        public_key.verify(OSV_EML, &osv_signature()),
        Err(EmlSignatureError::SignatureInvalid)
    );
    assert_eq!(
        osv_public_key().verify(eml, &signature),
        Err(EmlSignatureError::SignatureInvalid)
    );
}

#[test]
fn parses_and_round_trips_osv_output() {
    let signature = osv_signature();

    assert_eq!(signature.to_der(), OSV_SIGNATURE);
}

#[test]
fn verifies_osv_output() {
    osv_public_key()
        .verify(OSV_EML, &osv_signature())
        .expect("OSV output verifies");
}

#[test]
fn rejects_a_single_flipped_byte_in_the_eml() {
    let mut tampered = OSV_EML.to_vec();
    tampered[5000] ^= 0x01;

    assert_eq!(
        osv_public_key().verify(&tampered, &osv_signature()),
        Err(EmlSignatureError::SignatureInvalid)
    );
}

/// The embedded certificate is not required.
#[test]
fn accepts_a_signature_without_a_certificate() {
    let mut signed_data = parse_signed_data(OSV_SIGNATURE);
    signed_data.certificates = None;

    let signature = Signature::from_der(&signature_file(&signed_data)).expect("parses");

    osv_public_key()
        .verify(OSV_EML, &signature)
        .expect("verifies: the certificate was never used");
}

/// Malformed `.signature` files fixture.
fn malformed_signature_files() -> Vec<(&'static str, Vec<u8>)> {
    vec![
        ("empty", Vec::new()),
        ("garbage", vec![0xff; 64]),
        (
            "truncated",
            OSV_SIGNATURE[..OSV_SIGNATURE.len() / 2].to_vec(),
        ),
        ("one trailing byte", [OSV_SIGNATURE, &[0x00]].concat()),
        (
            "a certificate instead of a signature",
            osv_certificate().to_der(),
        ),
        (
            "wrong content type",
            ContentInfo {
                content_type: rfc5911::ID_DATA,
                content: Any::encode_from(&parse_signed_data(OSV_SIGNATURE))
                    .expect("SignedData encodes"),
            }
            .to_der()
            .expect("ContentInfo encodes"),
        ),
        ("no signerInfo", {
            // OSV signature fixture with empty `signerInfos`.
            let mut signed_data = parse_signed_data(OSV_SIGNATURE);
            signed_data.signer_infos = SignerInfos::try_from(Vec::new()).expect("empty set");
            signature_file(&signed_data)
        }),
    ]
}

/// Malformed `.signature` files are rejected without panicking.
#[test]
fn rejects_malformed_signature_files_without_panicking() {
    for (name, bytes) in malformed_signature_files() {
        assert!(
            matches!(
                Signature::from_der(&bytes),
                Err(EmlSignatureError::InvalidSignatureFile(_))
            ),
            "{name} should be rejected"
        );
    }
}
