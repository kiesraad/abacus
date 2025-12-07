CREATE TABLE committee_sessions
(
    id               INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    number           INTEGER                           NOT NULL,
    election_id      INTEGER                           NOT NULL,
    location         TEXT                              NOT NULL,
    start_date_time  TEXT,
    status           TEXT                              NOT NULL DEFAULT 'created',
    results_eml      INTEGER                           ,
    results_pdf      INTEGER                           ,
    overview_pdf     INTEGER                           ,

    FOREIGN KEY (election_id)  REFERENCES elections (id),
    FOREIGN KEY (results_eml)  REFERENCES files (id),
    FOREIGN KEY (results_pdf)  REFERENCES files (id),
    FOREIGN KEY (overview_pdf) REFERENCES files (id)
) STRICT;
