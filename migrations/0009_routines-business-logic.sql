-- ============================================================
-- Migration: BUSINESS-LOGIC ROUTINES
-- Purpose  : First stored business-logic routines for SIGECAT.
--            Moves two pieces of AREA business logic out of the PHP
--            repositories and into the database so the rules live in a
--            single authoritative, atomic place:
--
--   1. SP_DELETE_AREA_CASCADE       (PROCEDURE) — soft-deletes an area
--      and everything hanging off it (departments, sections, units and
--      the job positions anchored anywhere in that subtree), per
--      docs/soft-delete-design.md §6/§7 ("no job position left floating").
--
--   2. FN_AREA_HAS_ACTIVE_CHILDREN  (FUNCTION)  — returns 1 when an area
--      still has active departments or sections, otherwise 0.
--
-- Conventions
--   * CREATE OR REPLACE → re-runnable / idempotent.
--   * Parameters are VARCHAR2 to mirror how pdo_oci binds the CHAR(26)
--     ULIDs (avoids CHAR blank-padding surprises in comparisons).
--   * The PROCEDURE does NOT COMMIT or ROLLBACK: it runs inside the
--     transaction the PHP repository already opens
--     (beginTransaction/commit), so the caller keeps control of the
--     unit of work.
-- ============================================================


-- ============================================================
-- FN_AREA_HAS_ACTIVE_CHILDREN
--   Returns 1 if the area has at least one active (is_deleted = 0)
--   department or section, otherwise 0.
--   Mirrors the old AreaRepository::hasChildEntities() check.
-- ============================================================
CREATE OR REPLACE FUNCTION FN_AREA_HAS_ACTIVE_CHILDREN (
  p_area_id IN VARCHAR2
) RETURN NUMBER
IS
  v_has NUMBER := 0;
BEGIN
  SELECT CASE
           WHEN EXISTS (SELECT 1 FROM DEPARTMENTS
                         WHERE area_id = p_area_id AND is_deleted = 0)
             OR EXISTS (SELECT 1 FROM SECTIONS
                         WHERE area_id = p_area_id AND is_deleted = 0)
           THEN 1 ELSE 0
         END
    INTO v_has
    FROM dual;

  RETURN v_has;
END FN_AREA_HAS_ACTIVE_CHILDREN;
/


-- ============================================================
-- SP_DELETE_AREA_CASCADE
--   Soft-deletes an area and cascades the soft-delete to its whole
--   subtree, in one call. Marking order (deepest dependents first):
--     1. job positions anchored anywhere in the subtree
--     2. units under the area's departments/sections
--     3. the area's departments
--     4. the area's sections
--     5. the area itself
--   Every UPDATE is guarded by is_deleted = 0, so re-running is a no-op.
--   Existence / 404 checks stay in the PHP service layer.
-- ============================================================
CREATE OR REPLACE PROCEDURE SP_DELETE_AREA_CASCADE (
  p_area_id    IN VARCHAR2,
  p_deleted_by IN VARCHAR2
)
IS
BEGIN
  -- 1. Job positions anchored anywhere in the area's subtree.
  --    CHECK_JOB_POSITION_PARENT enforces exactly one parent, so a job
  --    position hangs off the area OR one of its departments, sections
  --    or units. All four cases must be swept up; otherwise a position
  --    would be left pointing at a soft-deleted parent (a "floating"
  --    position — see docs/soft-delete-design.md §7).
  UPDATE JOB_POSITIONS
     SET is_deleted = 1,
         deleted_at = CURRENT_TIMESTAMP,
         deleted_by = p_deleted_by
   WHERE is_deleted = 0
     AND ( area_id = p_area_id
        OR department_id IN (SELECT department_id FROM DEPARTMENTS WHERE area_id = p_area_id)
        OR section_id    IN (SELECT section_id    FROM SECTIONS    WHERE area_id = p_area_id)
        OR unit_id IN (
             SELECT unit_id FROM UNITS
              WHERE department_id IN (SELECT department_id FROM DEPARTMENTS WHERE area_id = p_area_id)
                 OR section_id    IN (SELECT section_id    FROM SECTIONS    WHERE area_id = p_area_id)
           ) );

  -- 2. Units under the area's departments or sections.
  UPDATE UNITS
     SET is_deleted = 1,
         deleted_at = CURRENT_TIMESTAMP,
         deleted_by = p_deleted_by
   WHERE is_deleted = 0
     AND ( department_id IN (SELECT department_id FROM DEPARTMENTS WHERE area_id = p_area_id)
        OR section_id    IN (SELECT section_id    FROM SECTIONS    WHERE area_id = p_area_id) );

  -- 3. Departments of the area.
  UPDATE DEPARTMENTS
     SET is_deleted = 1,
         deleted_at = CURRENT_TIMESTAMP,
         deleted_by = p_deleted_by
   WHERE area_id = p_area_id AND is_deleted = 0;

  -- 4. Sections of the area.
  UPDATE SECTIONS
     SET is_deleted = 1,
         deleted_at = CURRENT_TIMESTAMP,
         deleted_by = p_deleted_by
   WHERE area_id = p_area_id AND is_deleted = 0;

  -- 5. The area itself.
  UPDATE AREAS
     SET is_deleted = 1,
         deleted_at = CURRENT_TIMESTAMP,
         deleted_by = p_deleted_by
   WHERE area_id = p_area_id AND is_deleted = 0;

  -- No COMMIT here on purpose: the calling PHP repository owns the
  -- transaction (beginTransaction/commit). See the header note.
END SP_DELETE_AREA_CASCADE;
/


-- ============================================================
-- Rollback (manual reference)
-- ============================================================
-- DROP PROCEDURE SP_DELETE_AREA_CASCADE;
-- DROP FUNCTION  FN_AREA_HAS_ACTIVE_CHILDREN;
