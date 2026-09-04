use std::fmt;

/// Everything that can go wrong while generating a keypair and certificate,
/// or reading a certificate back.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum EmlSignatureError {
    /// RSA key generation failed.
    KeyGeneration(String),
    /// The self-signed certificate could not be built.
    CertificateGeneration(String),
    /// The validity period is impossible: a year outside 1970-9999, or
    /// `valid_from` past expiry (election date + 3 months).
    ValidityPeriod,
    /// The stored private key is not a parseable PKCS#8 key.
    InvalidPrivateKey(String),
    /// The private key does not match the certificate's public key.
    KeyCertificateMismatch,
    /// The certificate is not parseable.
    InvalidCertificate(String),
    /// The certificate public key is not a valid RSA key.
    InvalidPublicKey(String),
    /// The certificate subject is invalid: a required attribute is missing or
    /// duplicated, or the `UID` names an unsupported committee.
    InvalidSubject(String),
}

impl fmt::Display for EmlSignatureError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::KeyGeneration(e) => write!(f, "RSA key generation failed: {e}"),
            Self::CertificateGeneration(e) => write!(f, "certificate generation failed: {e}"),
            Self::ValidityPeriod => write!(f, "certificate validity period is invalid"),
            Self::InvalidPrivateKey(e) => write!(f, "invalid PKCS#8 private key: {e}"),
            Self::KeyCertificateMismatch => {
                write!(f, "the private key does not match the certificate")
            }
            Self::InvalidCertificate(e) => write!(f, "invalid X.509 certificate: {e}"),
            Self::InvalidPublicKey(e) => write!(f, "invalid RSA public key: {e}"),
            Self::InvalidSubject(e) => write!(f, "invalid certificate subject: {e}"),
        }
    }
}

impl std::error::Error for EmlSignatureError {}
