-- =============================================================================
-- SIGECAT - Migration: request rate limiting (RATE_LIMITS)
-- =============================================================================
-- Backs the application-level rate limiter used to throttle abuse-prone public
-- endpoints (login, password recovery). Each row is a fixed-window counter keyed
-- by a SHA-256 hash of "action|identifier" (identifier is usually the client IP),
-- so no raw IPs or emails are stored here.
--
-- rate_key     : SHA-256 hex of the bucket (action + identifier)
-- window_start : start of the current fixed window
-- hits         : attempts counted in the current window
-- =============================================================================

CREATE TABLE RATE_LIMITS (
  rate_key      VARCHAR2(64)  NOT NULL,
  window_start  TIMESTAMP(6)  DEFAULT CURRENT_TIMESTAMP NOT NULL,
  hits          NUMBER(10)    DEFAULT 0 NOT NULL,
  CONSTRAINT pk_rate_limits PRIMARY KEY (rate_key)
);

-- Lets a periodic job purge stale buckets without a full scan.
CREATE INDEX idx_rate_limits_window ON RATE_LIMITS (window_start);
