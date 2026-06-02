-- ============================================================
-- Migration: SOFT DELETE
-- Purpose  : Adds logical-deletion support to USERS and the
--            organization tables (AREAS, DEPARTMENTS, SECTIONS,
--            UNITS) per the team's soft-delete policy.
--            See docs/soft-delete-design.md.
--
-- Notes    : Oracle DDL auto-commits each statement; there is no
--            transaction to wrap. Run top to bottom. Sections 3 and
--            4 depend on pending team decisions and are commented out.
-- ============================================================


-- ============================================================
-- Section 1 — Soft-delete columns (in-scope tables)
--   is_deleted : 0 = active, 1 = deleted
--   deleted_at : when it was deleted
--   deleted_by : ULID of the user who deleted it (mirrors created_by)
-- ============================================================

ALTER TABLE USERS ADD (
    is_deleted  NUMBER(1)  DEFAULT 0 NOT NULL,
    deleted_at  TIMESTAMP,
    deleted_by  CHAR(26)
);
ALTER TABLE USERS ADD CONSTRAINT chk_users_is_deleted   CHECK (is_deleted IN (0, 1));
ALTER TABLE USERS ADD CONSTRAINT fk_users_deleted_by    FOREIGN KEY (deleted_by) REFERENCES USERS(user_id);

ALTER TABLE AREAS ADD (
    is_deleted  NUMBER(1)  DEFAULT 0 NOT NULL,
    deleted_at  TIMESTAMP,
    deleted_by  CHAR(26)
);
ALTER TABLE AREAS ADD CONSTRAINT chk_areas_is_deleted   CHECK (is_deleted IN (0, 1));
ALTER TABLE AREAS ADD CONSTRAINT fk_areas_deleted_by    FOREIGN KEY (deleted_by) REFERENCES USERS(user_id);

ALTER TABLE DEPARTMENTS ADD (
    is_deleted  NUMBER(1)  DEFAULT 0 NOT NULL,
    deleted_at  TIMESTAMP,
    deleted_by  CHAR(26)
);
ALTER TABLE DEPARTMENTS ADD CONSTRAINT chk_departments_is_deleted CHECK (is_deleted IN (0, 1));
ALTER TABLE DEPARTMENTS ADD CONSTRAINT fk_departments_deleted_by  FOREIGN KEY (deleted_by) REFERENCES USERS(user_id);

ALTER TABLE SECTIONS ADD (
    is_deleted  NUMBER(1)  DEFAULT 0 NOT NULL,
    deleted_at  TIMESTAMP,
    deleted_by  CHAR(26)
);
ALTER TABLE SECTIONS ADD CONSTRAINT chk_sections_is_deleted CHECK (is_deleted IN (0, 1));
ALTER TABLE SECTIONS ADD CONSTRAINT fk_sections_deleted_by  FOREIGN KEY (deleted_by) REFERENCES USERS(user_id);

ALTER TABLE UNITS ADD (
    is_deleted  NUMBER(1)  DEFAULT 0 NOT NULL,
    deleted_at  TIMESTAMP,
    deleted_by  CHAR(26)
);
ALTER TABLE UNITS ADD CONSTRAINT chk_units_is_deleted CHECK (is_deleted IN (0, 1));
ALTER TABLE UNITS ADD CONSTRAINT fk_units_deleted_by  FOREIGN KEY (deleted_by) REFERENCES USERS(user_id);


-- ============================================================
-- Section 2 — Partial unique index on USERS.EMAIL  (REQUIRED)
--   The existing UK_USERS_EMAIL would block reusing the email of a
--   soft-deleted user. Replace it with a function-based unique index
--   that only covers active rows (Oracle does not index NULL keys, so
--   deleted rows fall out of the index).
--   Email is stored lowercased by the app, so an exact-match index
--   preserves the original UK semantics.
-- ============================================================

ALTER TABLE USERS DROP CONSTRAINT UK_USERS_EMAIL;

CREATE UNIQUE INDEX ux_users_email_active
    ON USERS (CASE WHEN is_deleted = 0 THEN EMAIL END);


-- ============================================================
-- Section 3 — Partial unique indexes on organization names  (OPTIONAL)
--   The org tables have NO DB-level unique constraint on NAME today;
--   uniqueness is enforced only in app code (existsByName). These
--   indexes enforce "name unique among active rows" at the DB level.
--
--   Uniqueness SCOPE is a best guess and must be confirmed by the team:
--     - Areas       : name unique globally (matches current app logic).
--     - Departments : name unique per area.
--     - Sections    : name unique per area.
--     - Units       : name unique per parent (section or department).
--   Adjust before enabling. Left commented out until confirmed.
-- ============================================================

-- CREATE UNIQUE INDEX ux_areas_name_active
--     ON AREAS (CASE WHEN is_deleted = 0 THEN UPPER(name) END);

-- CREATE UNIQUE INDEX ux_departments_name_active
--     ON DEPARTMENTS (CASE WHEN is_deleted = 0 THEN area_id END,
--                     CASE WHEN is_deleted = 0 THEN UPPER(name) END);

-- CREATE UNIQUE INDEX ux_sections_name_active
--     ON SECTIONS (CASE WHEN is_deleted = 0 THEN area_id END,
--                  CASE WHEN is_deleted = 0 THEN UPPER(name) END);

-- CREATE UNIQUE INDEX ux_units_name_active
--     ON UNITS (CASE WHEN is_deleted = 0 THEN COALESCE(section_id, department_id) END,
--               CASE WHEN is_deleted = 0 THEN UPPER(name) END);


-- ============================================================
-- Section 4 — JOB_POSITIONS (plazas)
--   Decided: plazas enter the soft-delete scope so that deleting an
--   AREA can cascade-soft-delete its plazas (AREA_ID is NOT NULL and
--   cannot be de-referenced). Same column set as the rest, plus the
--   partial unique index replacing UK_JOB_POSITION_NUMBER.
-- ============================================================

ALTER TABLE JOB_POSITIONS ADD (
    is_deleted  NUMBER(1)  DEFAULT 0 NOT NULL,
    deleted_at  TIMESTAMP,
    deleted_by  CHAR(26)
);
ALTER TABLE JOB_POSITIONS ADD CONSTRAINT chk_job_positions_is_deleted CHECK (is_deleted IN (0, 1));
ALTER TABLE JOB_POSITIONS ADD CONSTRAINT fk_job_positions_deleted_by  FOREIGN KEY (deleted_by) REFERENCES USERS(user_id);

-- Note: the column was renamed from job_position_number to name in
-- SIGECAT-DB-MIGRATION-job-position-rename-number-to-name.sql.
-- Run that migration before this block if UK_JOB_POSITION_NUMBER exists.
ALTER TABLE JOB_POSITIONS DROP CONSTRAINT UK_JOB_POSITION_NUMBER;

CREATE UNIQUE INDEX ux_job_position_number_active
    ON JOB_POSITIONS (CASE WHEN is_deleted = 0 THEN name END);


-- ============================================================
-- Rollback (manual reference)
-- ============================================================
-- DROP INDEX ux_users_email_active;
-- ALTER TABLE USERS ADD CONSTRAINT UK_USERS_EMAIL UNIQUE (email);
-- ALTER TABLE USERS       DROP CONSTRAINT fk_users_deleted_by;
-- ALTER TABLE USERS       DROP CONSTRAINT chk_users_is_deleted;
-- ALTER TABLE USERS       DROP (is_deleted, deleted_at, deleted_by);
-- ALTER TABLE AREAS       DROP CONSTRAINT fk_areas_deleted_by;
-- ALTER TABLE AREAS       DROP CONSTRAINT chk_areas_is_deleted;
-- ALTER TABLE AREAS       DROP (is_deleted, deleted_at, deleted_by);
-- ALTER TABLE DEPARTMENTS DROP CONSTRAINT fk_departments_deleted_by;
-- ALTER TABLE DEPARTMENTS DROP CONSTRAINT chk_departments_is_deleted;
-- ALTER TABLE DEPARTMENTS DROP (is_deleted, deleted_at, deleted_by);
-- ALTER TABLE SECTIONS    DROP CONSTRAINT fk_sections_deleted_by;
-- ALTER TABLE SECTIONS    DROP CONSTRAINT chk_sections_is_deleted;
-- ALTER TABLE SECTIONS    DROP (is_deleted, deleted_at, deleted_by);
-- ALTER TABLE UNITS       DROP CONSTRAINT fk_units_deleted_by;
-- ALTER TABLE UNITS       DROP CONSTRAINT chk_units_is_deleted;
-- ALTER TABLE UNITS       DROP (is_deleted, deleted_at, deleted_by);
-- DROP INDEX ux_job_position_number_active;
-- ALTER TABLE JOB_POSITIONS ADD CONSTRAINT UK_JOB_POSITION_NUMBER UNIQUE (name);
-- ALTER TABLE JOB_POSITIONS DROP CONSTRAINT fk_job_positions_deleted_by;
-- ALTER TABLE JOB_POSITIONS DROP CONSTRAINT chk_job_positions_is_deleted;
-- ALTER TABLE JOB_POSITIONS DROP (is_deleted, deleted_at, deleted_by);
