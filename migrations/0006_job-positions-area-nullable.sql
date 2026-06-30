-- =====================================================================
-- Migration: make AREA_ID nullable in JOB_POSITIONS
--
-- The original table defined AREA_ID as NOT NULL, assuming every plaza
-- always belongs to an area. The system now supports plazas attached
-- directly to a department, section, or unit instead, so AREA_ID must
-- allow NULL. The CHECK_JOB_POSITION_PARENT constraint already enforces
-- that exactly one of the four FK columns is set.
-- =====================================================================

ALTER TABLE JOB_POSITIONS MODIFY (area_id NULL);
