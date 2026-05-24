-- ============================================================
-- Migration: PASSWORD_RESET_TOKENS
-- Purpose  : Supports the password recovery flow.
--            Stores SHA-256 hashes of single-use reset tokens
--            with a 1-hour TTL.
-- ============================================================

CREATE TABLE PASSWORD_RESET_TOKENS (
    token_id    CHAR(26)       NOT NULL,
    user_id     CHAR(26)       NOT NULL,
    token_hash  VARCHAR2(64)   NOT NULL,
    expires_at  TIMESTAMP      NOT NULL,
    used_at     TIMESTAMP,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pk_password_reset_token PRIMARY KEY (token_id),
    CONSTRAINT uq_password_reset_hash  UNIQUE (token_hash),
    CONSTRAINT fk_prt_user FOREIGN KEY (user_id) REFERENCES USERS(user_id)
);

CREATE INDEX idx_prt_user       ON PASSWORD_RESET_TOKENS(user_id);
CREATE INDEX idx_prt_token_hash ON PASSWORD_RESET_TOKENS(token_hash);
CREATE INDEX idx_prt_expires    ON PASSWORD_RESET_TOKENS(expires_at);
