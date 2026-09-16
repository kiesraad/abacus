//! Verify a `.signature` file against an EML file under the public key of a
//! `.crt`. Works on the contents of an OSV2020-U ZIP:
//!
//! ```sh
//! cd eml_signature/tests/fixtures
//! cargo run -p eml_signature --example verify -- osv2020_nieuwstrand.crt osv2020_nieuwstrand.eml.xml osv2020_nieuwstrand.eml.xml.signature
//! ```
//!
//! and on the output of the `sign` example with the `.crt` from `create`:
//!
//! ```sh
//! cargo run -p eml_signature --example verify -- PSB9977.crt Telling_AB2027_Aardenboezem.eml.xml Telling_AB2027_Aardenboezem.eml.xml.signature
//! ```
//!
//! Exits with a failure status when the signature does not verify.

use std::{env, fs, process::ExitCode};

use eml_signature::{Certificate, Signature};

fn main() -> ExitCode {
    let args: Vec<String> = env::args().skip(1).collect();
    let Ok([crt_path, eml_path, signature_path]) = <[String; 3]>::try_from(args) else {
        eprintln!(
            "usage: verify <trusted certificate .crt (PEM)> <file.eml.xml> <file.eml.xml.signature>"
        );
        return ExitCode::FAILURE;
    };

    match verify(&crt_path, &eml_path, &signature_path) {
        Ok(()) => {
            println!("{signature_path}: valid for {eml_path} under {crt_path}");
            ExitCode::SUCCESS
        }
        Err(e) => {
            eprintln!("{e}");
            ExitCode::FAILURE
        }
    }
}

fn verify(crt_path: &str, eml_path: &str, signature_path: &str) -> Result<(), String> {
    let crt = fs::read(crt_path).map_err(|e| format!("{crt_path}: {e}"))?;
    let certificate = Certificate::from_pem(&crt).map_err(|e| format!("{crt_path}: {e}"))?;
    let eml = fs::read(eml_path).map_err(|e| format!("{eml_path}: {e}"))?;
    let signature = fs::read(signature_path).map_err(|e| format!("{signature_path}: {e}"))?;
    let signature =
        Signature::from_der(&signature).map_err(|e| format!("{signature_path}: {e}"))?;

    certificate
        .public_key()
        .verify(&eml, &signature)
        .map_err(|e| format!("{signature_path}: {e}"))
}
