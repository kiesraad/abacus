CREATE TABLE data_entries
(
    id         INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    state      TEXT                              NOT NULL,
    updated_at TEXT                              NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;
