//! Parse and print the properties of a certificate.
//!
//! ```sh
//! cargo run -p eml_signature --example inspect -- PSB9977.crt
//! ```
//!
//! Accepts PEM (OSV2020-U `.crt` files) or DER encoded certificates.

use std::{env, fs, process::ExitCode};

use eml_signature::{Certificate, RSA_KEY_BITS};

fn main() -> ExitCode {
    let args: Vec<String> = env::args().skip(1).collect();
    let [path] = args.as_slice() else {
        eprintln!("usage: inspect <certificate file, PEM or DER>");
        return ExitCode::FAILURE;
    };
    let certificate = match load(path) {
        Ok(certificate) => certificate,
        Err(e) => {
            eprintln!("{path}: {e}");
            return ExitCode::FAILURE;
        }
    };

    let subject = certificate.subject();
    println!("C   (country)              {}", subject.country);
    println!(
        "L   (locality)             {}",
        subject.committee.locality()
    );
    println!("O   (election identifier)  {}", subject.election_identifier);
    println!("OU  (creator software)     {}", subject.organizational_unit);
    println!("CN  (common name)          {}", subject.common_name);
    println!("UID                        {}", subject.committee.uid());
    println!(
        "valid                      {} until {}",
        certificate.not_before(),
        certificate.not_after()
    );
    println!(
        "public key                 RSA-{RSA_KEY_BITS}, SPKI of {} DER bytes",
        certificate.public_key().to_der().len()
    );
    ExitCode::SUCCESS
}

fn load(path: &str) -> Result<Certificate, String> {
    let bytes = fs::read(path).map_err(|e| e.to_string())?;
    if bytes.starts_with(b"-----BEGIN") {
        Certificate::from_pem(&bytes).map_err(|e| e.to_string())
    } else {
        Certificate::from_der(&bytes).map_err(|e| e.to_string())
    }
}
