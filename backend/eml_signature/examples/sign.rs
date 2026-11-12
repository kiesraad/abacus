//! Sign an EML file with a keypair from the `create` example, writing
//! `<file>.signature` next to it. Check the result with the `verify` example.
//!
//! ```sh
//! cargo run -p eml_signature --example sign -- PSB9977.key PSB9977.crt Telling_AB2027_Aardenboezem.eml.xml
//! ```

use std::{env, fs, path::Path, process::ExitCode};

use eml_signature::{Certificate, SigningKeyPair};
use zeroize::Zeroizing;

fn main() -> ExitCode {
    let args: Vec<String> = env::args().skip(1).collect();
    let Ok([key_path, crt_path, eml_path]) = <[String; 3]>::try_from(args) else {
        eprintln!(
            "usage: sign <private key .key (PKCS#8 DER)> <certificate .crt (PEM)> <file.eml.xml>"
        );
        return ExitCode::FAILURE;
    };

    let signature_path = format!("{eml_path}.signature");
    if Path::new(&signature_path).exists() {
        eprintln!("{signature_path}: already exists, not overwriting");
        return ExitCode::FAILURE;
    }

    let signature = match sign(&key_path, &crt_path, &eml_path) {
        Ok(signature) => signature,
        Err(e) => {
            eprintln!("{e}");
            return ExitCode::FAILURE;
        }
    };
    if let Err(e) = fs::write(&signature_path, &signature) {
        eprintln!("{signature_path}: {e}");
        return ExitCode::FAILURE;
    }
    println!("wrote {signature_path} ({} bytes)", signature.len());
    ExitCode::SUCCESS
}

/// The `.signature` file contents for the EML at `eml_path`.
fn sign(key_path: &str, crt_path: &str, eml_path: &str) -> Result<Vec<u8>, String> {
    let crt = fs::read(crt_path).map_err(|e| format!("{crt_path}: {e}"))?;
    let certificate = Certificate::from_pem(&crt).map_err(|e| format!("{crt_path}: {e}"))?;
    let key = Zeroizing::new(fs::read(key_path).map_err(|e| format!("{key_path}: {e}"))?);
    let keypair = SigningKeyPair::new(key, certificate).map_err(|e| format!("{key_path}: {e}"))?;

    let eml = fs::read(eml_path).map_err(|e| format!("{eml_path}: {e}"))?;
    let signature = keypair.sign(&eml).map_err(|e| e.to_string())?;
    Ok(signature.to_der())
}
