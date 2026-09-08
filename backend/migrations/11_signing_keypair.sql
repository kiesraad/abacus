CREATE TABLE signing_keypair
(
    election_id   INTEGER PRIMARY KEY NOT NULL,
    certificate   TEXT                NOT NULL,              -- PEM-encoded certificate (contains public key)
    private_key   BLOB                NOT NULL,              -- DER-encoded private key
    show_reminder INTEGER             NOT NULL DEFAULT TRUE, -- show upload reminder

    FOREIGN KEY (election_id) REFERENCES elections (id)
) STRICT;
