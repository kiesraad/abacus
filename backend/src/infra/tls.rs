//! TLS support
//!
//! Self-signed certificate authority for serving Abacus over HTTPS.
//! Certificates are generated with rcgen with the aws-lc-rs backend.

use std::{fs, path::Path, sync::Arc};

use chrono::{DateTime, Datelike, Duration, Utc};
use rcgen::{
    BasicConstraints, CertificateParams, DistinguishedName, DnType, ExtendedKeyUsagePurpose, IsCa,
    Issuer, KeyPair, KeyUsagePurpose, PKCS_ECDSA_P256_SHA256, date_time_ymd,
};
use rustls_pki_types::{CertificateDer, PrivateKeyDer, PrivatePkcs8KeyDer, pem::PemObject};

use crate::AppError;

const CA_CERT_PEM: &str = "ca.pem";
const CA_CERT_DER: &str = "ca.cer";
const CA_KEY_DER: &str = "ca-key.der";

fn tls_err<E: core::fmt::Debug>(e: E) -> AppError {
    AppError::Tls(format!("{e:?}"))
}

/// The local CA certificate, in the two encodings clients import:
/// PEM (Linux/macOS/Firefox) and DER (Windows `.cer`).
#[derive(Clone)]
pub struct CaCertificate {
    pub pem: String,
    pub der: Vec<u8>,
}

/// TLS certificates: the local CA and leaf certificate and the leaf private key
pub struct TlsCertificates {
    pub ca: CaCertificate,
    pub leaf_cert: CertificateDer<'static>,
    pub leaf_key: PrivateKeyDer<'static>,
}

impl TlsCertificates {
    /// Build the rustls server config with the leaf certificate.
    pub fn server_config(&self) -> Result<Arc<rustls::ServerConfig>, AppError> {
        let provider = Arc::new(rustls::crypto::aws_lc_rs::default_provider());
        let config = rustls::ServerConfig::builder_with_provider(provider)
            .with_safe_default_protocol_versions()
            .map_err(tls_err)?
            .with_no_client_auth()
            .with_single_cert(vec![self.leaf_cert.clone()], self.leaf_key.clone_key())
            .map_err(tls_err)?;
        Ok(Arc::new(config))
    }
}

/// Load or generate the CA and create a new leaf certificate
pub fn load_or_generate(tls_dir: &Path) -> Result<TlsCertificates, AppError> {
    fs::create_dir_all(tls_dir)?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(tls_dir, fs::Permissions::from_mode(0o700))?;
    }

    let (issuer, ca) = load_or_generate_ca(tls_dir)?;
    let (leaf_cert, leaf_key) = create_leaf(&issuer, &get_subjects())?;
    Ok(TlsCertificates {
        ca,
        leaf_cert,
        leaf_key,
    })
}

/// Load the persisted local CA or generate and persist a new one.
///
/// Returns an [Issuer] for signing leaves and the CA certificate in both
/// PEM and DER formats.
fn load_or_generate_ca(
    tls_dir: &Path,
) -> Result<(Issuer<'static, KeyPair>, CaCertificate), AppError> {
    let cert_pem_path = tls_dir.join(CA_CERT_PEM);
    let key_der_path = tls_dir.join(CA_KEY_DER);

    let (issuer, ca) = if cert_pem_path.exists() && key_der_path.exists() {
        load_ca(&cert_pem_path, &key_der_path)?
    } else {
        generate_ca(tls_dir, &cert_pem_path, &key_der_path)?
    };

    tracing::info!("Import ca.pem or ca.cer into client trust stores to trust this server.");

    Ok((issuer, ca))
}

/// Load a CA certificate and key from disk
fn load_ca(
    cert_pem_path: &Path,
    key_der_path: &Path,
) -> Result<(Issuer<'static, KeyPair>, CaCertificate), AppError> {
    let pem = fs::read_to_string(cert_pem_path)?;
    let cert_der = CertificateDer::from_pem_slice(pem.as_bytes()).map_err(tls_err)?;
    let der = cert_der.as_ref().to_vec();
    let key_der = fs::read(key_der_path)?;
    let ca_key = KeyPair::try_from(key_der.as_slice()).map_err(tls_err)?;
    let issuer = Issuer::from_ca_cert_der(&cert_der, ca_key).map_err(tls_err)?;
    tracing::info!(
        "Loaded the local CA from {:?} (SHA-256 fingerprint {})",
        cert_pem_path,
        fingerprint(&der),
    );
    Ok((issuer, CaCertificate { pem, der }))
}

/// Generate a fresh self-signed CA and and save it to disk
fn generate_ca(
    tls_dir: &Path,
    cert_pem_path: &Path,
    key_der_path: &Path,
) -> Result<(Issuer<'static, KeyPair>, CaCertificate), AppError> {
    let ca_key = KeyPair::generate_for(&PKCS_ECDSA_P256_SHA256).map_err(tls_err)?;
    let ca_cert = get_ca_params()?.self_signed(&ca_key).map_err(tls_err)?;
    let pem = ca_cert.pem();
    let der = ca_cert.der().as_ref().to_vec();
    let key_der = ca_key.serialize_der();

    write_file(cert_pem_path, pem.as_bytes(), 0o644)?;
    write_file(&tls_dir.join(CA_CERT_DER), &der, 0o644)?;
    write_file(key_der_path, &key_der, 0o600)?;

    tracing::warn!(
        "Generated a new local CA at {:?} (SHA-256 fingerprint {}).",
        cert_pem_path,
        fingerprint(&der),
    );

    let issuer = Issuer::from_ca_cert_der(ca_cert.der(), ca_key).map_err(tls_err)?;
    Ok((issuer, CaCertificate { pem, der }))
}

/// Parameters used for the self-signed CA certificate
fn get_ca_params() -> Result<CertificateParams, AppError> {
    let mut params = CertificateParams::new(Vec::new()).map_err(tls_err)?;
    let mut distinguished_name = DistinguishedName::new();
    distinguished_name.push(DnType::CommonName, "Abacus Local CA");
    params.distinguished_name = distinguished_name;
    params.is_ca = IsCa::Ca(BasicConstraints::Constrained(0));
    params.key_usages = vec![KeyUsagePurpose::KeyCertSign, KeyUsagePurpose::CrlSign];
    set_validity(&mut params, 90)?;
    Ok(params)
}

/// Create a fresh server (leaf) certificate signed by the CA
fn create_leaf(
    issuer: &Issuer<'_, KeyPair>,
    subjects: &[String],
) -> Result<(CertificateDer<'static>, PrivateKeyDer<'static>), AppError> {
    let leaf_key = KeyPair::generate_for(&PKCS_ECDSA_P256_SHA256).map_err(tls_err)?;
    let pkcs8 = leaf_key.serialize_der();

    let mut params = CertificateParams::new(subjects.to_vec()).map_err(tls_err)?;
    let mut distinguished_name = DistinguishedName::new();
    distinguished_name.push(DnType::CommonName, "Abacus");
    params.distinguished_name = distinguished_name;
    params.key_usages = vec![KeyUsagePurpose::DigitalSignature];
    params.extended_key_usages = vec![ExtendedKeyUsagePurpose::ServerAuth];
    // Write an AuthorityKeyIdentifier matching the CA's SubjectKeyIdentifier so
    // clients can chain the leaf to the CA.
    params.use_authority_key_identifier_extension = true;
    set_validity(&mut params, 90)?;

    let cert = params.signed_by(&leaf_key, issuer).map_err(tls_err)?;
    let cert_der = cert.der().clone();
    tracing::info!(
        "Created a new server certificate for {subjects:?} (SHA-256 fingerprint {})",
        fingerprint(&cert_der),
    );
    let key_der = PrivateKeyDer::Pkcs8(PrivatePkcs8KeyDer::from(pkcs8));
    Ok((cert_der, key_der))
}

/// Get the Subject Alternative Names for the leaf certificate:
/// localhost, `abacus.local`, and every routable LAN address
fn get_subjects() -> Vec<String> {
    let mut subjects = vec![
        "localhost".to_owned(),
        "127.0.0.1".to_owned(),
        "::1".to_owned(),
        "abacus.local".to_owned(),
    ];
    if let Ok(interfaces) = if_addrs::get_if_addrs() {
        for iface in interfaces {
            if iface.is_loopback() || iface.is_link_local() {
                continue;
            }
            let ip = iface.ip().to_string();
            if !subjects.contains(&ip) {
                subjects.push(ip);
            }
        }
    }
    subjects
}

/// Set a certificate's validity window
fn set_validity(params: &mut CertificateParams, valid_days: i64) -> Result<(), AppError> {
    let now = Utc::now();
    // Backdate by one day to avoid clock skew issues
    let (year, month, day) = ymd(now - Duration::days(1))?;
    params.not_before = date_time_ymd(year, month, day);
    let (year, month, day) = ymd(now + Duration::days(valid_days))?;
    params.not_after = date_time_ymd(year, month, day);
    Ok(())
}

/// Split a chrono UTC timestamp into (year, month, day) for
/// rcgen's [date_time_ymd].
fn ymd(dt: DateTime<Utc>) -> Result<(i32, u8, u8), AppError> {
    Ok((
        dt.year(),
        u8::try_from(dt.month()).map_err(tls_err)?,
        u8::try_from(dt.day()).map_err(tls_err)?,
    ))
}
/// SHA-256 fingerprint of a DER-encoded certificate
/// Uppercase colon-separated hex is used by most browsers and the OpenSSL CLI.
fn fingerprint(der: &[u8]) -> String {
    use sha2::{Digest, Sha256};

    Sha256::digest(der)
        .iter()
        .map(|b| format!("{b:02X}"))
        .collect::<Vec<_>>()
        .join(":")
}

/// Write `bytes` to `path` with mode permission bits (only on Unix).
fn write_file(path: &Path, bytes: &[u8], mode: u32) -> Result<(), AppError> {
    fs::write(path, bytes)?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(path, fs::Permissions::from_mode(mode))?;
    }
    #[cfg(not(unix))]
    let _ = mode;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::assert_matches;

    /// Test that the CA persists across restarts and that a fresh leaf is created every time
    #[test]
    fn ca_persists_leaf_rotates() {
        let dir = tempfile::tempdir().unwrap();
        let tls_dir = dir.path().join("tls");

        let first = load_or_generate(&tls_dir).unwrap();
        for file in [CA_CERT_PEM, CA_CERT_DER, CA_KEY_DER] {
            assert!(tls_dir.join(file).exists(), "{file} should be persisted");
        }
        assert_matches!(
            first.leaf_key,
            PrivateKeyDer::Pkcs8(_),
            "leaf key should be PKCS#8"
        );

        // the leaf certificate and key build a valid rustls server config
        first
            .server_config()
            .expect("server config should build from the leaf certificate");

        // check that ca.cer is equal to the returned DER
        assert_eq!(fs::read(tls_dir.join(CA_CERT_DER)).unwrap(), first.ca.der);
        // and check that the PEM representation matches the DER
        let pem = fs::read_to_string(tls_dir.join(CA_CERT_PEM)).unwrap();
        let pem_der = CertificateDer::from_pem_slice(pem.as_bytes()).unwrap();
        assert_eq!(pem_der.as_ref(), first.ca.der.as_slice());

        // check file permissions
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let key_mode = fs::metadata(tls_dir.join(CA_KEY_DER))
                .unwrap()
                .permissions()
                .mode()
                & 0o777;
            assert_eq!(key_mode, 0o600, "the CA private key must be private");
            let dir_mode = fs::metadata(&tls_dir).unwrap().permissions().mode() & 0o777;
            assert_eq!(dir_mode, 0o700, "the tls directory must be private");
        }

        // verify that a second run reuses the same persisted CA but creates a distinct leaf
        let second = load_or_generate(&tls_dir).unwrap();
        assert_eq!(first.ca.der, second.ca.der, "CA persists across runs");
        assert_ne!(
            first.leaf_cert.as_ref(),
            second.leaf_cert.as_ref(),
            "each call creates a fresh leaf"
        );

        // clean up
        dir.close().expect("temporary directory is cleaned up");
    }
}
