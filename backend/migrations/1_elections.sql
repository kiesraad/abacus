CREATE TABLE elections
(
    id               INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    name             TEXT                              NOT NULL,
    category         TEXT                              NOT NULL,
    election_date    TEXT                              NOT NULL,
    nomination_date  TEXT                              NOT NULL,
    political_groups TEXT                              NOT NULL
);
