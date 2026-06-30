-- =====================================================================
-- Migration: extend USERS to the staging schema (soft-delete + name model)
--
-- Staging's code (UserRepository) queries columns that the original
-- schema (SIGECAT-DB-SCRIPT2.sql) never had:
--   - Extended name model: second_name, first_last_name, second_last_name
--   - Soft delete:         is_deleted, deleted_at, deleted_by
-- Without these columns login fails with ORA-00904 ("IS_DELETED": invalid identifier).
--
-- This migration is ADDITIVE and IDEMPOTENT: it only adds the missing
-- columns (each guarded by a user_tab_columns check) and never drops the
-- existing first_name / last_name columns, so older branches that select
-- explicit columns keep working.
-- =====================================================================

DECLARE
  PROCEDURE add_col_if_missing(p_col IN VARCHAR2, p_ddl IN VARCHAR2) IS
    v_cnt NUMBER;
  BEGIN
    SELECT COUNT(*) INTO v_cnt
      FROM user_tab_columns
     WHERE table_name = 'USERS'
       AND column_name = p_col;
    IF v_cnt = 0 THEN
      EXECUTE IMMEDIATE p_ddl;
    END IF;
  END;
BEGIN
  add_col_if_missing('SECOND_NAME',      'ALTER TABLE USERS ADD (second_name VARCHAR2(55))');
  add_col_if_missing('FIRST_LAST_NAME',  'ALTER TABLE USERS ADD (first_last_name VARCHAR2(55))');
  add_col_if_missing('SECOND_LAST_NAME', 'ALTER TABLE USERS ADD (second_last_name VARCHAR2(55))');
  add_col_if_missing('IS_DELETED',       'ALTER TABLE USERS ADD (is_deleted NUMBER(1) DEFAULT 0 NOT NULL)');
  add_col_if_missing('DELETED_AT',       'ALTER TABLE USERS ADD (deleted_at TIMESTAMP)');
  add_col_if_missing('DELETED_BY',       'ALTER TABLE USERS ADD (deleted_by CHAR(26))');
END;
/

-- Backfill the extended name model from the legacy last_name so existing
-- users keep a full display name (first_name + first_last_name).
UPDATE USERS
   SET first_last_name = last_name
 WHERE first_last_name IS NULL
   AND last_name IS NOT NULL;

COMMIT;

-- ---------------------------------------------------------------------
-- Soft-delete columns for the org tables (AREAS / DEPARTMENTS /
-- SECTIONS / UNITS). The same refactor that touched USERS made every
-- repository filter and mutate by is_deleted, but these tables never
-- got the columns either, which breaks the "Usuarios" / "Unidades"
-- (and area/department) listings with the same ORA-00904.
-- ---------------------------------------------------------------------
DECLARE
  TYPE t_tables IS TABLE OF VARCHAR2(30);
  v_tables t_tables := t_tables('AREAS', 'DEPARTMENTS', 'SECTIONS', 'UNITS');

  PROCEDURE add_col_if_missing(p_table IN VARCHAR2, p_col IN VARCHAR2, p_ddl IN VARCHAR2) IS
    v_cnt NUMBER;
  BEGIN
    SELECT COUNT(*) INTO v_cnt
      FROM user_tab_columns
     WHERE table_name = p_table
       AND column_name = p_col;
    IF v_cnt = 0 THEN
      EXECUTE IMMEDIATE p_ddl;
    END IF;
  END;
BEGIN
  FOR i IN 1 .. v_tables.COUNT LOOP
    add_col_if_missing(v_tables(i), 'IS_DELETED', 'ALTER TABLE ' || v_tables(i) || ' ADD (is_deleted NUMBER(1) DEFAULT 0 NOT NULL)');
    add_col_if_missing(v_tables(i), 'DELETED_AT', 'ALTER TABLE ' || v_tables(i) || ' ADD (deleted_at TIMESTAMP)');
    add_col_if_missing(v_tables(i), 'DELETED_BY', 'ALTER TABLE ' || v_tables(i) || ' ADD (deleted_by CHAR(26))');
  END LOOP;
END;
/
