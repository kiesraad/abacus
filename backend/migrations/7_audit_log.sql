CREATE TABLE audit_log
(
    id                 INTEGER         PRIMARY KEY AUTOINCREMENT NOT NULL,
    event              JSONB           NOT NULL,
    event_name         TEXT            NOT NULL,
    event_type         TEXT CHECK( event_type IN ('error','warning','info','success') ) NOT NULL DEFAULT 'info',
    message            TEXT            ,
    workstation        INTEGER         ,
    ip                 TEXT            ,
    user_id            INTEGER         NOT NULL,
    username           TEXT            NOT NULL,
    time               DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users (id),
    UNIQUE(id)
);
