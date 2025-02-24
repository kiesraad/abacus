CREATE TABLE audit_log_events
(
    id                 INTEGER         PRIMARY KEY AUTOINCREMENT NOT NULL,
    event_type         TEXT CHECK( event_type IN ('error','warning','info','success') ) NOT NULL DEFAULT 'info',
    event              TEXT            NOT NULL,
    message            TEXT            ,
    metadata           JSONB           ,
    workstation_number TEXT            ,
    ip                 TEXT            NOT NULL,
    user_id            INTEGER         NOT NULL,
    username           TEXT            NOT NULL,
    created_at         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users (id),
    UNIQUE(id)
);
