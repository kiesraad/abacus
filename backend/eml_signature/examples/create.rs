//! Create a keypair and write `<UID>.crt` (PEM) and `<UID>.key` (PKCS#8 DER).
//! The `.crt` can then be imported into OSV2020-U by hand.
//!
//! ```sh
//! cargo run -p eml_signature --example create -- AB2027_Aardenboezem 9977 Duinkerveld 2027-03-17
//! ```
//!
//! Arguments:
//! - the EML_NL `ElectionIdentifier` (e.g. `AB2027_Aardenboezem`)
//! - the GSB `AuthorityIdentifier` id (e.g. `9977`)
//! - the GSB `AuthorityIdentifier` name (e.g. `Duinkerveld`)
//! - the election date as YYYY-MM-DD (e.g. `2027-03-17`)

use std::{env, fs, process::ExitCode};

use chrono::{NaiveDate, Utc};
use eml_signature::{CertificateSubject, Committee, SigningKeyPair};

fn main() -> ExitCode {
    let args: Vec<String> = env::args().skip(1).collect();
    let Ok(
        [
            election_identifier,
            authority_id,
            authority_name,
            election_date,
        ],
    ) = <[String; 4]>::try_from(args)
    else {
        eprintln!(
            "usage: create <election_identifier> <authority_id> <authority_name> <election_date YYYY-MM-DD>"
        );
        return ExitCode::FAILURE;
    };
    let election_date: NaiveDate = election_date.parse().expect("election date as YYYY-MM-DD");

    let committee = Committee::Gsb {
        authority_id,
        authority_name,
    };
    let uid = committee.uid();
    // Abacus itself can use the version from the git tag in
    // `ABACUS_GIT_VERSION`. This example uses the crate version.
    let subject =
        CertificateSubject::new(election_identifier, env!("CARGO_PKG_VERSION"), committee);
    let keypair = SigningKeyPair::generate(&subject, Utc::now().date_naive(), election_date)
        .expect("generate");

    fs::write(format!("{uid}.crt"), keypair.certificate().to_pem()).expect("write .crt");
    fs::write(format!("{uid}.key"), keypair.private_key_der()).expect("write .key");
    println!("wrote {uid}.crt and {uid}.key");
    ExitCode::SUCCESS
}
