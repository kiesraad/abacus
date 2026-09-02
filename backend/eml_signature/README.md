# eml_signature

This crate supports RSA keypair generation for signing EML_NL election documents. Abacus signs its results files with a private key, and the HSB or CSB verifies the signature on import. The format is compatible with OSV2020-U, so an OSV2020-U installation at the HSB/CSB level accepts files signed by Abacus.

This crate currently only covers key and certificate generation and parsing.

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

## Example tools

The `examples` directory contains tools that can be run with `cargo run -p eml_signature --example <example>`:
- `create`: generate a keypair and write `<UID>.crt`/`<UID>.key`, for trying the public
  key import in OSV2020-U by hand.
- `inspect`: print the properties of a certificate file (PEM or DER), e.g. to compare a created `.crt` with an OSV-exported one.
