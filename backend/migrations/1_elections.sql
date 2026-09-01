CREATE TABLE elections
(
    id                  INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    name                TEXT                              NOT NULL,
    eml_name            TEXT                              NOT NULL,
    committee_category  TEXT                              NOT NULL,
    counting_method     TEXT,
    election_id         TEXT                              NOT NULL,
    location            TEXT                              NOT NULL,
    authority_id        TEXT                              NOT NULL,
    authority_name      TEXT                              NOT NULL,
    authority_region    TEXT                              NOT NULL,
    district            TEXT                              NOT NULL,
    domain              TEXT,
    category            TEXT                              NOT NULL,
    sub_category        TEXT                              NOT NULL,
    number_of_seats     INTEGER                           NOT NULL,
    number_of_voters    INTEGER                           NOT NULL,
    election_date       TEXT                              NOT NULL,
    nomination_date     TEXT                              NOT NULL,
    political_groups    TEXT                              NOT NULL
) STRICT;
