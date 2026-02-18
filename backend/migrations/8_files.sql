CREATE TABLE files
(
    id               INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    data             BLOB                              NOT NULL,
    name             TEXT                              NOT NULL,
    mime_type        TEXT                              NOT NULL,
    created_at       TEXT                              NOT NULL
) STRICT;
