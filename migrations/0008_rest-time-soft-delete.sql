-- =============================================================================
-- SIGECAT - Migration: soft delete support for REST_TIMES
-- =============================================================================
-- Adds the logical-deletion columns used across the schema (departments,
-- units, job_positions) so rest time entries are never physically removed.
--
-- is_deleted : 0 = active, 1 = deleted
-- deleted_at : timestamp of the deletion
-- deleted_by : ULID (CHAR(26)) of the user who performed the deletion
-- =============================================================================

ALTER TABLE rest_times ADD (
  is_deleted  NUMBER(1)    DEFAULT 0 NOT NULL,
  deleted_at  TIMESTAMP(6),
  deleted_by  CHAR(26)
);

-- Restrict is_deleted to 0/1.
ALTER TABLE rest_times ADD CONSTRAINT chk_rest_time_is_deleted
  CHECK (is_deleted IN (0, 1));

-- Auditing FK: who deleted the row.
ALTER TABLE rest_times ADD CONSTRAINT fk_rest_time_deleted_by
  FOREIGN KEY (deleted_by) REFERENCES users (user_id);

-- Keep "active rows only" reads fast.
CREATE INDEX idx_rest_times_is_deleted ON rest_times (is_deleted);
