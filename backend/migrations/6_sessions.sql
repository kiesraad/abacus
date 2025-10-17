CREATE TABLE sessions
(
    session_key        TEXT                 PRIMARY KEY NOT NULL,
    user_id            INTEGER              NOT NULL,
    user_agent         TEXT                 NOT NULL,
    ip_address         TEXT                 NOT NULL,
    expires_at         TEXT                 NOT NULL,
    created_at         TEXT                 NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) STRICT;
