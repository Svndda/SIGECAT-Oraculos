-- =====================================================================
-- Migration: fix FK column types in JOB_POSITIONS
--
-- The original JOB_POSITIONS table defined department_id, section_id,
-- and unit_id as NUMBER (legacy numeric PKs), but the DEPARTMENTS,
-- SECTIONS, and UNITS tables now use CHAR(26) ULIDs as primary keys.
-- Inserting a ULID string into a NUMBER column causes ORA-01722.
--
-- area_id was already CHAR(26) so it is not touched here.
--
-- Steps per column:
--   1. Drop the FK constraint (if it exists).
--   2. Drop the old NUMBER column.
--   3. Re-add the column as CHAR(26).
--   4. Re-add the FK constraint pointing to the ULID PK.
--
-- Safe to run on an empty or NULL-only column; data loss only affects
-- any pre-migration rows that stored the old numeric IDs.
-- =====================================================================

-- department_id
DECLARE
  v_cnt NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_cnt
    FROM user_constraints
   WHERE table_name = 'JOB_POSITIONS'
     AND constraint_name = 'FK_JOB_POSITIONS_DEPT';
  IF v_cnt > 0 THEN
    EXECUTE IMMEDIATE 'ALTER TABLE JOB_POSITIONS DROP CONSTRAINT FK_JOB_POSITIONS_DEPT';
  END IF;
END;
/

DECLARE
  v_cnt NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_cnt
    FROM user_tab_columns
   WHERE table_name = 'JOB_POSITIONS'
     AND column_name = 'DEPARTMENT_ID';
  IF v_cnt > 0 THEN
    EXECUTE IMMEDIATE 'ALTER TABLE JOB_POSITIONS DROP COLUMN department_id';
  END IF;
END;
/

ALTER TABLE JOB_POSITIONS ADD (department_id CHAR(26));
ALTER TABLE JOB_POSITIONS ADD CONSTRAINT fk_job_positions_dept
  FOREIGN KEY (department_id) REFERENCES DEPARTMENTS(department_id);

-- section_id
DECLARE
  v_cnt NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_cnt
    FROM user_constraints
   WHERE table_name = 'JOB_POSITIONS'
     AND constraint_name = 'FK_JOB_POSITIONS_SECT';
  IF v_cnt > 0 THEN
    EXECUTE IMMEDIATE 'ALTER TABLE JOB_POSITIONS DROP CONSTRAINT FK_JOB_POSITIONS_SECT';
  END IF;
END;
/

DECLARE
  v_cnt NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_cnt
    FROM user_tab_columns
   WHERE table_name = 'JOB_POSITIONS'
     AND column_name = 'SECTION_ID';
  IF v_cnt > 0 THEN
    EXECUTE IMMEDIATE 'ALTER TABLE JOB_POSITIONS DROP COLUMN section_id';
  END IF;
END;
/

ALTER TABLE JOB_POSITIONS ADD (section_id CHAR(26));
ALTER TABLE JOB_POSITIONS ADD CONSTRAINT fk_job_positions_sect
  FOREIGN KEY (section_id) REFERENCES SECTIONS(section_id);

-- unit_id
DECLARE
  v_cnt NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_cnt
    FROM user_constraints
   WHERE table_name = 'JOB_POSITIONS'
     AND constraint_name = 'FK_JOB_POSITIONS_UNIT';
  IF v_cnt > 0 THEN
    EXECUTE IMMEDIATE 'ALTER TABLE JOB_POSITIONS DROP CONSTRAINT FK_JOB_POSITIONS_UNIT';
  END IF;
END;
/

DECLARE
  v_cnt NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_cnt
    FROM user_tab_columns
   WHERE table_name = 'JOB_POSITIONS'
     AND column_name = 'UNIT_ID';
  IF v_cnt > 0 THEN
    EXECUTE IMMEDIATE 'ALTER TABLE JOB_POSITIONS DROP COLUMN unit_id';
  END IF;
END;
/

ALTER TABLE JOB_POSITIONS ADD (unit_id CHAR(26));
ALTER TABLE JOB_POSITIONS ADD CONSTRAINT fk_job_positions_unit
  FOREIGN KEY (unit_id) REFERENCES UNITS(unit_id);
