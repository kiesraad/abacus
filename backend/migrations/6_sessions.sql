CREATE TABLE sessions
(
    session_key        TEXT                 PRIMARY KEY NOT NULL,
    user_id            INTEGER              NOT NULL,
    expires_at         DATETIME             NOT NULL,
    created_at         DATETIME             NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    UNIQUE(session_key)
);
