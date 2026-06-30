-- =============================================================================
-- SIGECAT - Migration: time-boxed login lockout (USERS.last_failed_attempt_at)
-- =============================================================================
-- Records when the most recent failed login happened so the account lockout can
-- expire automatically after a cool-down window, instead of being permanent.
-- Without this an attacker could lock any known account indefinitely with a few
-- bad attempts (a denial-of-service); with it the lock self-clears once the
-- window elapses and the failed-attempt counter is reset on the next try.
--
-- last_failed_attempt_at : timestamp of the last failed login, NULL when none.
-- =============================================================================

ALTER TABLE USERS ADD (
  last_failed_attempt_at TIMESTAMP(6)
);
