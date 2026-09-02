//! RSA keypairs and certificates for signing EML documents in the OSV2020-U
//! signature format.
//!
//! [`SigningKeyPair::generate`] creates a keypair with its metadata
//! [`Certificate`]. [`SigningKeyPair::new`] rebuilds one from stored parts
//! (e.g. from a database row).
//!
//! [`Certificate::from_der`]/[`Certificate::from_pem`] read a certificate back,
//! and [`Certificate::to_pem`] encodes the `.crt` in the same PEM format as
//! OSV2020-U.

// This crate must only use safe Rust code.
#![forbid(unsafe_code)]
// All public items must be documented.
#![forbid(missing_docs)]

mod certificate;
mod error;
mod keypair;
mod subject;

pub use certificate::{Certificate, PublicKey, RSA_KEY_BITS};
pub use error::EmlSignatureError;
pub use keypair::SigningKeyPair;
pub use subject::{CertificateSubject, Committee};
