-- Note: we do not want a foreign key constraint on the user_id field, as we want to keep the audit log even if the user is deleted
CREATE TABLE audit_log
(
    id                 INTEGER         PRIMARY KEY AUTOINCREMENT NOT NULL,
    event              BLOB            NOT NULL,
    event_name         TEXT            NOT NULL,
    event_level        TEXT            CHECK( event_level IN ('error','warning','info','success') ) NOT NULL DEFAULT 'info',
    message            TEXT            ,
    ip                 TEXT            ,
    user_id            INTEGER         ,
    username           TEXT            ,
    user_fullname      TEXT            ,
    user_role          TEXT            ,
    time               TEXT            NOT NULL DEFAULT(STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW'))
) STRICT;
