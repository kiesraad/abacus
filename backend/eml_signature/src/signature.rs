//! Signing and verifying signatures of an EML_NL document using a RSA keypair.
//! The signature file (`.signature`) follows the OSV2020-U format described in
//! README.md.

use aws_lc_rs::{
    rand::SystemRandom,
    signature::{RSA_PKCS1_2048_8192_SHA256, RSA_PKCS1_SHA256, RsaKeyPair, UnparsedPublicKey},
};
use cms::{
    cert::{CertificateChoices, IssuerAndSerialNumber},
    content_info::{CmsVersion, ContentInfo},
    signed_data::{
        CertificateSet, DigestAlgorithmIdentifiers, EncapsulatedContentInfo, SignedData,
        SignerIdentifier, SignerInfo, SignerInfos,
    },
};
use const_oid::{
    ObjectIdentifier,
    db::{
        rfc5911::{ID_DATA, ID_SIGNED_DATA},
        rfc5912::{ID_SHA_256, RSA_ENCRYPTION},
    },
};
use der::{Any, Decode, Encode, Tag, asn1::OctetString};
use x509_cert::{Certificate as X509Certificate, spki::AlgorithmIdentifierOwned};

use crate::{EmlSignatureError, PublicKey, SigningKeyPair};

/// A parsed `.signature` file.
///
/// The embedded certificate is not exposed because verification should use a separate
/// trusted key.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Signature {
    /// The raw DER-encoded content of the `.signature` file.
    der: Vec<u8>,
    /// The RSA signature over the EML bytes.
    rsa_signature: Vec<u8>,
}

impl Signature {
    /// Read a `.signature` file.
    pub fn from_der(der: &[u8]) -> Result<Self, EmlSignatureError> {
        let content_info = ContentInfo::from_der(der).map_err(invalid_signature_file)?;
        if content_info.content_type != ID_SIGNED_DATA {
            return Err(EmlSignatureError::InvalidSignatureFile(format!(
                "expected signedData content, found {}",
                content_info.content_type
            )));
        }
        let signed_data: SignedData = content_info
            .content
            .decode_as()
            .map_err(invalid_signature_file)?;

        let rsa_signature = signed_data
            .signer_infos
            .0
            .as_slice()
            .first()
            .map(|signer_info| signer_info.signature.as_bytes().to_vec())
            .ok_or_else(|| EmlSignatureError::InvalidSignatureFile("no signerInfo".to_owned()))?;

        Ok(Self {
            der: der.to_vec(),
            rsa_signature,
        })
    }

    /// The `.signature` file bytes, e.g. for the ZIP or for storage.
    pub fn to_der(&self) -> Vec<u8> {
        self.der.clone()
    }
}

impl SigningKeyPair {
    /// Sign the exact bytes of an EML document.
    ///
    /// The signature covers the bytes as given: no canonicalisation or
    /// re-serialisation. Signing is deterministic (RSASSA PKCS#1 v1.5), so the
    /// same document and key always give the same file.
    pub fn sign(&self, eml_bytes: &[u8]) -> Result<Signature, EmlSignatureError> {
        let certificate = X509Certificate::from_der(self.certificate().der())
            .expect("the held DER was validated in Certificate::from_der");
        let key_pair = RsaKeyPair::from_pkcs8(self.private_key_der())
            .map_err(|e| EmlSignatureError::InvalidPrivateKey(e.to_string()))?;

        let mut rsa_signature = vec![0u8; key_pair.public_modulus_len()];
        key_pair
            .sign(
                &RSA_PKCS1_SHA256,
                &SystemRandom::new(),
                eml_bytes,
                &mut rsa_signature,
            )
            .map_err(|e| {
                EmlSignatureError::InvalidPrivateKey(format!("RSA signing failed: {e}"))
            })?;

        Ok(Signature {
            der: signature_file(certificate, &rsa_signature),
            rsa_signature,
        })
    }
}

impl PublicKey {
    /// Verify an RSA signature against the exact bytes of its EML document.
    ///
    /// This reads only `signerInfos[0].encryptedDigest`, the embedded
    /// certificate and the encapsulated content are ignored.
    pub fn verify(&self, eml_bytes: &[u8], signature: &Signature) -> Result<(), EmlSignatureError> {
        UnparsedPublicKey::new(&RSA_PKCS1_2048_8192_SHA256, self.der())
            .verify(eml_bytes, &signature.rsa_signature)
            .map_err(|_| EmlSignatureError::SignatureInvalid)
    }
}

/// Build the DER `ContentInfo` for a `.signature` file.
fn signature_file(certificate: X509Certificate, rsa_signature: &[u8]) -> Vec<u8> {
    let signer_info = signer_info(&certificate, rsa_signature);

    let signed_data = SignedData {
        version: CmsVersion::V1,
        digest_algorithms: DigestAlgorithmIdentifiers::try_from(vec![algorithm_id(ID_SHA_256)])
            .expect("one element cannot duplicate"),
        encap_content_info: EncapsulatedContentInfo {
            econtent_type: ID_DATA,
            econtent: Some(Any::new(Tag::OctetString, []).expect("empty is encodable")),
        },
        certificates: Some(
            CertificateSet::try_from(vec![CertificateChoices::Certificate(certificate)])
                .expect("one element cannot duplicate"),
        ),
        crls: None,
        signer_infos: SignerInfos::try_from(vec![signer_info])
            .expect("one element cannot duplicate"),
    };

    ContentInfo {
        content_type: ID_SIGNED_DATA,
        content: Any::encode_from(&signed_data).expect("SignedData is encodable"),
    }
    .to_der()
    .expect("ContentInfo is encodable")
}

fn signer_info(certificate: &X509Certificate, rsa_signature: &[u8]) -> SignerInfo {
    let tbs = certificate.tbs_certificate();
    SignerInfo {
        version: CmsVersion::V1,
        sid: SignerIdentifier::IssuerAndSerialNumber(IssuerAndSerialNumber {
            issuer: tbs.subject().clone(),
            serial_number: tbs.serial_number().clone(),
        }),
        digest_alg: algorithm_id(ID_SHA_256),
        signed_attrs: None,
        signature_algorithm: algorithm_id(RSA_ENCRYPTION),
        signature: OctetString::new(rsa_signature).expect("a signature fits an OCTET STRING"),
        unsigned_attrs: None,
    }
}

/// An algorithm identifier with the explicit `NULL` parameters.
fn algorithm_id(oid: ObjectIdentifier) -> AlgorithmIdentifierOwned {
    AlgorithmIdentifierOwned {
        oid,
        parameters: Some(Any::null()),
    }
}

/// Wrap a `der` error as [`EmlSignatureError::InvalidSignatureFile`].
fn invalid_signature_file(e: der::Error) -> EmlSignatureError {
    EmlSignatureError::InvalidSignatureFile(e.to_string())
}
