CREATE TABLE committee_sessions
(
    id          INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    number      INTEGER                           NOT NULL,
    election_id INTEGER                           NOT NULL,
    location    TEXT                              NOT NULL,
    start_date  TEXT                              NOT NULL,
    start_time  TEXT                              NOT NULL,
    status      TEXT                              NOT NULL DEFAULT 'created',

    FOREIGN KEY (election_id) REFERENCES elections (id) ON DELETE CASCADE
) STRICT;
