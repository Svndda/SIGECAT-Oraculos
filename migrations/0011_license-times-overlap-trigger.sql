-- SIGECAT - Fix LICENSE_TIMES overlap trigger
--
-- The original TRG_LICENSE_TIMES_CHECK_OVERLAP was a BEFORE EACH ROW trigger
-- that SELECTed from its own table. This made it:
--   * a no-op on INSERT: the self-exclusion predicate
--       LICENSE_TIME_ID != NVL(:OLD.LICENSE_TIME_ID, '')
--     evaluates against NULL on INSERT (:OLD is null), so it matched no rows
--     and never detected an overlap; and
--   * a hard error on UPDATE: ORA-04091 (mutating table), because a row-level
--     trigger cannot read the table being modified during an UPDATE.
--
-- This rewrites it as a COMPOUND TRIGGER: the affected rows are captured in the
-- BEFORE EACH ROW section and the overlap check runs in AFTER STATEMENT, when
-- the table is no longer mutating. Self-exclusion uses LICENSE_TIME_ID, which is
-- correct for both INSERT (new id is not yet present) and UPDATE (excludes the
-- row itself, whose PK does not change).

CREATE OR REPLACE TRIGGER TRG_LICENSE_TIMES_CHECK_OVERLAP
  FOR INSERT OR UPDATE ON LICENSE_TIMES
  FOLLOWS TRG_LICENSE_TIMES_CHECK_RANGE
  COMPOUND TRIGGER

  TYPE t_row IS RECORD (
    user_id         LICENSE_TIMES.USER_ID%TYPE,
    license_time_id LICENSE_TIMES.LICENSE_TIME_ID%TYPE,
    starts_at       LICENSE_TIMES.STARTS_AT%TYPE,
    ends_at         LICENSE_TIMES.ENDS_AT%TYPE
  );
  TYPE t_rows IS TABLE OF t_row INDEX BY PLS_INTEGER;
  g_rows t_rows;

  BEFORE EACH ROW IS
    n PLS_INTEGER;
  BEGIN
    n := g_rows.COUNT + 1;
    g_rows(n).user_id         := :NEW.USER_ID;
    g_rows(n).license_time_id := :NEW.LICENSE_TIME_ID;
    g_rows(n).starts_at       := :NEW.STARTS_AT;
    g_rows(n).ends_at         := :NEW.ENDS_AT;
  END BEFORE EACH ROW;

  AFTER STATEMENT IS
    v_overlap NUMBER;
  BEGIN
    FOR i IN 1 .. g_rows.COUNT LOOP
      SELECT COUNT(*)
        INTO v_overlap
        FROM LICENSE_TIMES
       WHERE USER_ID = g_rows(i).user_id
         AND LICENSE_TIME_ID != g_rows(i).license_time_id
         AND STARTS_AT < g_rows(i).ends_at
         AND ENDS_AT   > g_rows(i).starts_at;

      IF v_overlap > 0 THEN
        RAISE_APPLICATION_ERROR(-20007,
          'El usuario ya tiene una licencia activa en el período especificado');
      END IF;
    END LOOP;
    g_rows.DELETE;
  END AFTER STATEMENT;

END TRG_LICENSE_TIMES_CHECK_OVERLAP;
/
