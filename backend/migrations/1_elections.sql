CREATE TABLE elections
(
    id               INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    name             TEXT                              NOT NULL,
    election_id      TEXT                              NOT NULL,
    location         TEXT                              NOT NULL,
    domain_id        TEXT                              NOT NULL,
    number_of_voters INTEGER                           NOT NULL,
    category         TEXT                              NOT NULL,
    number_of_seats  INTEGER                           NOT NULL,
    election_date    TEXT                              NOT NULL,
    nomination_date  TEXT                              NOT NULL,
    status           TEXT                              NOT NULL,
    political_groups TEXT                              NOT NULL
);
