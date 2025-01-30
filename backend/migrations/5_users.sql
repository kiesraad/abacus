CREATE TABLE users
(
    id                 INTEGER              PRIMARY KEY AUTOINCREMENT NOT NULL,
    username           TEXT                 NOT NULL,
    fullname           TEXT                 ,
    role               TEXT                 NOT NULL,
    password_hash      TEXT                 NOT NULL,
    updated_at         DATETIME             NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at         DATETIME             NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(username)
);
