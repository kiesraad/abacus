CREATE TABLE sub_committees
(
    id                    INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    committee_session_id  INTEGER                           NOT NULL,
    data_entry_id         INTEGER                           NOT NULL,
    number                INTEGER                           NOT NULL,
    name                  TEXT                              NOT NULL,
    category              TEXT                              NOT NULL,

    FOREIGN KEY (committee_session_id) REFERENCES committee_sessions (id),
    FOREIGN KEY (data_entry_id)        REFERENCES data_entries (id),
    CONSTRAINT number UNIQUE (committee_session_id, number),
    CONSTRAINT data_entry UNIQUE (data_entry_id)
) STRICT;
