# eml_signature

This crate supports RSA keypair generation for signing EML_NL election documents. Abacus signs its results files with a private key, and the HSB or CSB verifies the signature on import. The format is compatible with OSV2020-U, so an OSV2020-U installation at the HSB/CSB level accepts files signed by Abacus.

## Keypair

The private key is an RSA-4096 key in PKCS#8 v1 DER format. One keypair is used per election committee within the election.

## Certificate

The certificate is a self-signed X.509 certificate that contains the public key. It has a number of subject fields that are used in both Abacus and OSV2020-U to verify to which election committee the certificate belongs. `openssl asn1parse` can be used to decode the certificate.

The certificate's fields are:

- Signature algorithm: `sha256WithRSAEncryption`
- 160-bit serial
- No X.509v3 extensions
- `notBefore`: date of creation
- `notAfter`: expiration date, three months after the election date
- The subject DN contains, in order:

| Field | Meaning | Example | Encoding |
|---|---|---|---|
| `C` | country, fixed | `NL` | `PrintableString` |
| `L` | region name: the EML `AuthorityIdentifier` name | `Nieuwstrand` | `UTF8String` |
| `O` | the EML `ElectionIdentifier` id | `AB2027_Aardenboezem` | `UTF8String` |
| `OU` | display only: `Abacus <official version>` (OSV writes `OSV2020-U`) | `Abacus 1.1.0` | `UTF8String` |
| `CN` | display only: `Gemeente <name>`, or `Openbaar lichaam <name>` | `Gemeente Nieuwstrand` | `UTF8String` |
| `UID` | `PSB` + the EML `AuthorityIdentifier` `Id` of the GSB | `PSB9998` | `UTF8String` |

OSV2020-U checks `O` and `UID` to verify that the certificate belongs to the correct election committee.

## Signature

OSV2020-U packages the `<name>.eml.xml` and its `<name>.eml.xml.signature` side by side in a ZIP. The `.signature` file is a PKCS#7/CMS `signedData` in DER, holding the signature and an embedded copy of the signing certificate. `openssl asn1parse -inform DER -in <signature file>` can be used to decode it.

The `.signature` file contains:

- `version`: 1
- `digestAlgorithms`: SHA-256 only, algorithm parameters are `NULL`
- Encapsulated content: `id-data` with an `OCTET STRING` that is present but empty
- Certificates: optional, same as the certificate above
- `signerInfos`:
  - `issuerAndSerialNumber` identifies the signing certificate, with `name` equal to the certificate DN
  - `signedAttrs` and `unsignedAttrs` are absent
  - `digestEncryptionAlgorithm` is `rsaEncryption` and algorithm parameters are `NULL`
  - `encryptedDigest` holds the signature bytes, `RSASSA-PKCS1-v1_5-SIGN(private_key, SHA-256(eml_bytes))` from [PKCS #1]. With RSA-4096 the signature is 512 bytes long.

[PKCS #1]: https://datatracker.ietf.org/doc/html/rfc8017#section-8.2.1

## Verification

The certificate embedded in the `.signature` file should never be used to verify, only the pre-imported key should be used. For Abacus and OSV2020-U this means that a certificate is imported first, and an EML document that is imported later has its `.signature` checked against that already-imported key. The trust decision therefore happens at certificate import, not at signature verification.

## Example tools

The `examples` directory contains tools that can be run with `cargo run -p eml_signature --example <example>`:
- `create`: generate a keypair and write `<UID>.crt`/`<UID>.key`, for trying the public
  key import in OSV2020-U by hand.
- `inspect`: print the properties of a certificate file (PEM or DER), e.g. to compare a created `.crt` with an OSV-exported one.
- `sign`: sign an EML file with a keypair from `create`, writing `<file>.signature` next to it.
- `verify`: check that a `.signature` file contains a valid signature for an EML file using the public key from a `.crt` file.
