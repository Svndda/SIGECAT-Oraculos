-- =====================================================================
-- Migration: soft-delete columns for JOB_POSITIONS (plazas)
--
-- AreaRepository::deleteArea cascades a soft-delete to the area's plazas
-- (`UPDATE JOB_POSITIONS SET is_deleted = 1 ...`), but JOB_POSITIONS never
-- got the soft-delete columns, so deleting an area fails with
-- ORA-00904 ("IS_DELETED": invalid identifier).
--
-- Additive and idempotent: only adds the missing columns.
-- =====================================================================

DECLARE
  PROCEDURE add_col_if_missing(p_col IN VARCHAR2, p_ddl IN VARCHAR2) IS
    v_cnt NUMBER;
  BEGIN
    SELECT COUNT(*) INTO v_cnt
      FROM user_tab_columns
     WHERE table_name = 'JOB_POSITIONS'
       AND column_name = p_col;
    IF v_cnt = 0 THEN
      EXECUTE IMMEDIATE p_ddl;
    END IF;
  END;
BEGIN
  add_col_if_missing('IS_DELETED', 'ALTER TABLE JOB_POSITIONS ADD (is_deleted NUMBER(1) DEFAULT 0 NOT NULL)');
  add_col_if_missing('DELETED_AT', 'ALTER TABLE JOB_POSITIONS ADD (deleted_at TIMESTAMP)');
  add_col_if_missing('DELETED_BY', 'ALTER TABLE JOB_POSITIONS ADD (deleted_by CHAR(26))');
END;
/
