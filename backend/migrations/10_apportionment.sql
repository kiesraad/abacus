CREATE TABLE apportionment
(
    committee_session_id INTEGER PRIMARY KEY NOT NULL,
    state                TEXT                NOT NULL,

    FOREIGN KEY (committee_session_id) REFERENCES committee_sessions (id),
    CONSTRAINT committee_session UNIQUE (committee_session_id)
) STRICT;
