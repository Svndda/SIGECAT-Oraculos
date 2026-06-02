-- =====================================================================
-- Migration: add NAME column to JOB_POSITIONS
--
-- The real schema has both:
--   JOB_POSITION_NUMBER  NUMBER(10)      -- the plaza number (integer)
--   NAME                 VARCHAR2(110)   -- descriptive name of the post
--
-- DBs created from an older export may be missing the NAME column,
-- causing ORA-00904: "NAME" invalid identifier on any INSERT or SELECT.
--
-- Idempotent: only adds the column when it is absent.
-- After adding it, back-fills existing rows with a placeholder so the
-- NOT NULL constraint can be applied without errors.
-- =====================================================================

DECLARE
  v_cnt NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_cnt
    FROM user_tab_columns
   WHERE table_name  = 'JOB_POSITIONS'
     AND column_name = 'NAME';

  IF v_cnt = 0 THEN
    -- Add nullable first so existing rows do not violate NOT NULL.
    EXECUTE IMMEDIATE 'ALTER TABLE JOB_POSITIONS ADD (name VARCHAR2(110))';

    -- Back-fill: use the number cast to string as a temporary placeholder.
    EXECUTE IMMEDIATE
      'UPDATE JOB_POSITIONS SET name = TO_CHAR(job_position_number) WHERE name IS NULL';

    EXECUTE IMMEDIATE 'COMMIT';

    -- Now enforce NOT NULL.
    EXECUTE IMMEDIATE
      'ALTER TABLE JOB_POSITIONS MODIFY (name VARCHAR2(110) NOT NULL)';
  END IF;
END;
/
