-- matches election_9_csb subcommittee
--
-- public key generated with:
-- eml_signature% cargo run --example create GR2026_TestLocation 9101 "Test Location" 2026-03-18
-- eml_signature% openssl rsa -in PSB9101.key -pubin

UPDATE sub_committees
SET certificates = json('[{"election_identifier":"GR2026_TestLocation","organizational_unit":"Abacus 1.2.0","common_name":"Test Location","not_before":"1970-01-01T00:00:00Z","not_after":"1970-01-01T00:00:00Z","signature_algorithm":"RSA 4096-bit","public_key":"-----BEGIN PUBLIC KEY-----\nMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA6Xpf3ManR9ot+IEgWOa/\nxwBi0BelTxhWhBMTCZdXrrNs4YFAzErXncKhU1avIrz8PXkqjgDTSu/4/+XYDap3\nkMrCyjK9/2gAZY1Cy1uz29md9o+NPx2UqgKsP/w0idUpTbTL9pLdr3T2pGU985yD\nw/LnPFm9+kFxOTkvZclEb0/N0RVWY+rd9cP5442SX52VUqTPX4zqOfk4x4Z2V4t/\nPu8DOuQxOU3v5iBRvCKc2NrTp4dtEIqMRO4a39ELF8BSy6tH8jVIHCXV1x8XPI7P\nzH4b+jWhlCvXAcdOShDS1HGVvNagnZ74peCNkJDmuLdDJh+BD8H20WLQLEyEdunY\nFIeV2TYf8MpL9xcM6g94hB7XL0Viz71TSLY+xbiQcK8ajovrBYeEY2gM7NdZQoXk\nhn3SqgVhzMtVdgowwjEQQZ4hHu1EnWMMwYcmMMwRPvVWqeRFg3IO/kEX9XchM2z1\nK67Gja6Vkc3PMxyQ/6BOAKvgOEnKj8Zfrm6kTs66PBer3VvnHaVnTloow+tZ9D6J\nQR8Tm+ntd0VTd2QcDpWHsq100wYY3ytCYH0Sv5oKv5tpxCzp/SqOhA7slPpOLRL1\nRA1GmXn1h7fYLCZoDIP8mLGDc2DZWAi6Wx1vnPiV4HcZ8XB7tOSRBd9KIC/eL12Z\nuwSpfNdQfxC/hNyALTsyXk0CAwEAAQ==\n-----END PUBLIC KEY-----\n"}]')
WHERE id = 911;
