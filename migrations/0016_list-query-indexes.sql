-- =============================================================================
-- SIGECAT - Migration: indexes for declaration detail/list queries
-- =============================================================================
-- Confirmed against the live schema (user_ind_columns) that these foreign-key
-- columns had no supporting index, unlike JOB_FUNCTIONS and SYSTEM_LOGS which
-- already cover their equivalent lookups.
--
-- DECLARATIONS_STATUS.DECLARATION_ID is the hottest gap: every declaration
-- detail view runs "WHERE DECLARATION_ID = :id ORDER BY CREATED_AT DESC"
-- (DeclarationsRepository::getStatusHistory), and the paginated declarations
-- list runs a correlated "MAX(CREATED_AT) WHERE DECLARATION_ID = d.DECLARATION_ID"
-- subquery per row (findAllPaginated) — both were full-scanning this table.
-- The composite index covers both the equality filter and the DESC sort/MAX.
--
-- LICENSE_TIMES.DECLARATION_ID and REST_TIMES.DECLARATION_ID back the same
-- "load everything for this declaration" lookups
-- (LicenseRepository/RestTimeRepository filter by declaration_id).
-- =============================================================================

CREATE INDEX idx_declarations_status_decl ON DECLARATIONS_STATUS (DECLARATION_ID, CREATED_AT DESC);

CREATE INDEX idx_license_times_declaration ON LICENSE_TIMES (DECLARATION_ID);

CREATE INDEX idx_rest_times_declaration ON REST_TIMES (DECLARATION_ID);
