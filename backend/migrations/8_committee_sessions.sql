CREATE TABLE committee_sessions
(
    id          INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    number      INTEGER                           NOT NULL,
    election_id INTEGER                           NOT NULL,
    started_at  DATETIME,
    status      TEXT                              NOT NULL,

    FOREIGN KEY (election_id) REFERENCES elections (id) ON DELETE CASCADE
);
