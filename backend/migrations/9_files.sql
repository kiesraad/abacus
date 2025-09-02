CREATE TABLE files
(
    id               INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    data             BLOB                              NOT NULL,
    filename         TEXT                              NOT NULL,
    mime_type        TEXT                              NOT NULL
) STRICT;
