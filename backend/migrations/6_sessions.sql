CREATE TABLE sessions
(
    session_key         TEXT                 PRIMARY KEY NOT NULL,
    user_id            INTEGER              NOT NULL,
    expires_at         INTEGER              NOT NULL,
    created_at         INTEGER              NOT NULL,

    FOREIGN KEY (user_id) REFERENCES users (id),
    UNIQUE(session_key)
);