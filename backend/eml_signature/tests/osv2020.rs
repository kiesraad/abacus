//! Compare this crate's output with OSV2020-U output: a created certificate
//! must match the OSV format, and the OSV fixture must parse and round-trip.

mod common;

use chrono::{DateTime, NaiveDate, TimeZone, Utc};
use common::*;
use const_oid::db::{rfc4519, rfc5912};
use der::{Decode, Encode, Tag};
use eml_signature::{RSA_KEY_BITS, SigningKeyPair};
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
