-- =====================================================================
-- Migration: add job_position_number and name to JOB_POSITIONS
--
-- The original schema had only job_position_number (the plaza code, e.g.
-- "01-2024"). A later refactor accidentally replaced it with `name` in
-- the base script instead of adding it as a separate column. The intended
-- design is:
--
--   job_position_number VARCHAR2(110) NOT NULL  — plaza code / número
--   name                VARCHAR2(110) NOT NULL  — descriptive name of the post
--
-- This migration is idempotent: it adds whichever column is still missing
-- and back-fills it from the other column so the NOT NULL constraint can
-- be applied without errors on existing rows.
-- =====================================================================

DECLARE
  PROCEDURE add_nullable(p_col IN VARCHAR2, p_ddl IN VARCHAR2) IS
    v_cnt NUMBER;
  BEGIN
    SELECT COUNT(*) INTO v_cnt
      FROM user_tab_columns
     WHERE table_name  = 'JOB_POSITIONS'
       AND column_name = p_col;
    IF v_cnt = 0 THEN
      EXECUTE IMMEDIATE p_ddl;
    END IF;
  END;
BEGIN
  -- Add missing columns as nullable first so existing rows don't violate NOT NULL.
  add_nullable(
    'JOB_POSITION_NUMBER',
    'ALTER TABLE JOB_POSITIONS ADD (job_position_number VARCHAR2(110))'
  );
  add_nullable(
    'NAME',
    'ALTER TABLE JOB_POSITIONS ADD (name VARCHAR2(110))'
  );
END;
/

-- Back-fill: if one column is populated and the other is NULL, copy across.
UPDATE JOB_POSITIONS SET job_position_number = name
 WHERE job_position_number IS NULL AND name IS NOT NULL;

UPDATE JOB_POSITIONS SET name = job_position_number
 WHERE name IS NULL AND job_position_number IS NOT NULL;

COMMIT;

-- Now enforce NOT NULL on both columns (safe because every row is populated).
DECLARE
  PROCEDURE set_not_null(p_col IN VARCHAR2, p_ddl IN VARCHAR2) IS
    v_nullable VARCHAR2(1);
  BEGIN
    SELECT nullable INTO v_nullable
      FROM user_tab_columns
     WHERE table_name  = 'JOB_POSITIONS'
       AND column_name = p_col;
    IF v_nullable = 'Y' THEN
      EXECUTE IMMEDIATE p_ddl;
    END IF;
  END;
BEGIN
  set_not_null(
    'JOB_POSITION_NUMBER',
    'ALTER TABLE JOB_POSITIONS MODIFY (job_position_number VARCHAR2(110) NOT NULL)'
  );
  set_not_null(
    'NAME',
    'ALTER TABLE JOB_POSITIONS MODIFY (name VARCHAR2(110) NOT NULL)'
  );
END;
/
