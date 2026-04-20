CREATE TABLE files
(
    id                   INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    data                 BLOB                              NOT NULL,
    name                 TEXT                              NOT NULL,
    mime_type            TEXT                              NOT NULL,
    created_at           TEXT                              NOT NULL,
    committee_session_id INTEGER                           NOT NULL,
    file_type            TEXT                              NOT NULL,

    FOREIGN KEY (committee_session_id) REFERENCES committee_sessions (id),
    UNIQUE (committee_session_id, file_type)
) STRICT;
