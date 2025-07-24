CREATE TABLE committee_sessions
(
    id               INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    number           INTEGER                           NOT NULL,
    election_id      INTEGER                           NOT NULL,
    location         TEXT                              NOT NULL,
    start_date       TEXT                              NOT NULL,
    start_time       TEXT                              NOT NULL,
    status           TEXT                              NOT NULL DEFAULT 'created',
    number_of_voters INTEGER                           NOT NULL DEFAULT 0,

    FOREIGN KEY (election_id) REFERENCES elections (id) ON DELETE CASCADE
) STRICT;
