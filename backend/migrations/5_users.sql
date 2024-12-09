CREATE TABLE users
(
    id                 INTEGER              PRIMARY KEY AUTOINCREMENT NOT NULL,
    username           TEXT                 NOT NULL,
    password_hash      TEXT                 NOT NULL,
    updated_at         INTEGER              NOT NULL DEFAULT (unixepoch()),
    created_at         INTEGER              NOT NULL DEFAULT (unixepoch())
);