CREATE TABLE users
(
    id                     INTEGER         PRIMARY KEY AUTOINCREMENT NOT NULL,
    username               TEXT            NOT NULL,
    fullname               TEXT            ,
    role                   TEXT            NOT NULL,
    password_hash          TEXT            NOT NULL,
    needs_password_change  INTEGER         NOT NULL DEFAULT TRUE,
    last_activity_at       TEXT            ,
    updated_at             TEXT            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at             TEXT            NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (username COLLATE NOCASE)
) STRICT;
