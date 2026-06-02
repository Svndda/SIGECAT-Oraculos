-- =====================================================================
-- Migration: rename JOB_POSITIONS.job_position_number -> name
--
-- The column was called job_position_number in the original schema.
-- The PHP code was later unified to use `name` (consistent with every
-- other entity). DBs created from the pre-rename script still carry the
-- old column name and fail with ORA-00904 when the API tries to INSERT
-- or SELECT `name`.
--
-- Idempotent: skips the rename when the column is already called NAME.
-- Run this once on any Oracle schema that still has job_position_number.
-- =====================================================================

DECLARE
  v_old NUMBER;
  v_new NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_old
    FROM user_tab_columns
   WHERE table_name  = 'JOB_POSITIONS'
     AND column_name = 'JOB_POSITION_NUMBER';

  SELECT COUNT(*) INTO v_new
    FROM user_tab_columns
   WHERE table_name  = 'JOB_POSITIONS'
     AND column_name = 'NAME';

  IF v_old = 1 AND v_new = 0 THEN
    EXECUTE IMMEDIATE 'ALTER TABLE JOB_POSITIONS RENAME COLUMN job_position_number TO name';
  END IF;
END;
/

-- =====================================================================
-- If the partial unique index still references the old column name,
-- recreate it using the new one.  The DROP is wrapped in an exception
-- handler so it is safe to run even when the old index is absent.
-- =====================================================================

DECLARE
  v_cnt NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_cnt
    FROM user_indexes
   WHERE index_name = 'UX_JOB_POSITION_NUMBER_ACTIVE';

  IF v_cnt = 1 THEN
    EXECUTE IMMEDIATE 'DROP INDEX ux_job_position_number_active';
    EXECUTE IMMEDIATE q'[CREATE UNIQUE INDEX ux_job_position_number_active
      ON JOB_POSITIONS (CASE WHEN is_deleted = 0 THEN name END)]';
  END IF;
END;
/
