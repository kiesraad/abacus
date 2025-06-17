CREATE TABLE committee_sessions
(
    id          INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    number      INTEGER                           NOT NULL,
    election_id INTEGER                           NOT NULL,
    location    TEXT,
    start_date  TEXT,
    start_time  TEXT,
    status      TEXT                              NOT NULL DEFAULT 'Created',

    FOREIGN KEY (election_id) REFERENCES elections (id) ON DELETE CASCADE
);
