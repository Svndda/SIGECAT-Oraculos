-- SIGECAT - Indexes to speed up admin CRUD list pages
--
-- Every admin list page filters with UPPER(name/email) LIKE '%...%' and
-- orders by CREATED_AT (or NAME for license types). Most of the filtered/
-- sorted columns on these catalogue tables had no supporting index, forcing
-- a full table scan + sort on every page load. Oracle Cloud's network
-- round-trip latency already dominates these requests, so this mainly helps
-- as data volume grows, but costs nothing today.
--
-- Function-based indexes are used for the UPPER(...) LIKE filters so Oracle
-- can use them directly without rewriting the predicate.
--
-- Each CREATE INDEX is wrapped so ORA-01408 (an equivalent index already
-- exists) and ORA-00955 (name already used) are swallowed: OFFICIAL_FUNCTIONS
-- already has a base-schema index covering JOB_ID (IDX_OFF_FUNC_POSITION_TYPE),
-- and this makes the migration safe to re-run if it ever partially applies.

BEGIN
  EXECUTE IMMEDIATE 'CREATE INDEX idx_areas_upper_name ON AREAS (UPPER(name))';
EXCEPTION WHEN OTHERS THEN IF SQLCODE NOT IN (-1408, -955) THEN RAISE; END IF;
END;
/

BEGIN
  EXECUTE IMMEDIATE 'CREATE INDEX idx_areas_created_at ON AREAS (created_at DESC)';
EXCEPTION WHEN OTHERS THEN IF SQLCODE NOT IN (-1408, -955) THEN RAISE; END IF;
END;
/

BEGIN
  EXECUTE IMMEDIATE 'CREATE INDEX idx_departments_upper_name ON DEPARTMENTS (UPPER(name))';
EXCEPTION WHEN OTHERS THEN IF SQLCODE NOT IN (-1408, -955) THEN RAISE; END IF;
END;
/

BEGIN
  EXECUTE IMMEDIATE 'CREATE INDEX idx_departments_created_at ON DEPARTMENTS (created_at DESC)';
EXCEPTION WHEN OTHERS THEN IF SQLCODE NOT IN (-1408, -955) THEN RAISE; END IF;
END;
/

BEGIN
  EXECUTE IMMEDIATE 'CREATE INDEX idx_sections_upper_name ON SECTIONS (UPPER(name))';
EXCEPTION WHEN OTHERS THEN IF SQLCODE NOT IN (-1408, -955) THEN RAISE; END IF;
END;
/

BEGIN
  EXECUTE IMMEDIATE 'CREATE INDEX idx_sections_created_at ON SECTIONS (created_at DESC)';
EXCEPTION WHEN OTHERS THEN IF SQLCODE NOT IN (-1408, -955) THEN RAISE; END IF;
END;
/

BEGIN
  EXECUTE IMMEDIATE 'CREATE INDEX idx_units_upper_name ON UNITS (UPPER(name))';
EXCEPTION WHEN OTHERS THEN IF SQLCODE NOT IN (-1408, -955) THEN RAISE; END IF;
END;
/

BEGIN
  EXECUTE IMMEDIATE 'CREATE INDEX idx_units_created_at ON UNITS (created_at DESC)';
EXCEPTION WHEN OTHERS THEN IF SQLCODE NOT IN (-1408, -955) THEN RAISE; END IF;
END;
/

BEGIN
  EXECUTE IMMEDIATE 'CREATE INDEX idx_users_upper_email ON USERS (UPPER(email))';
EXCEPTION WHEN OTHERS THEN IF SQLCODE NOT IN (-1408, -955) THEN RAISE; END IF;
END;
/

BEGIN
  EXECUTE IMMEDIATE 'CREATE INDEX idx_users_upper_name ON USERS (UPPER(first_name))';
EXCEPTION WHEN OTHERS THEN IF SQLCODE NOT IN (-1408, -955) THEN RAISE; END IF;
END;
/

BEGIN
  EXECUTE IMMEDIATE 'CREATE INDEX idx_users_created_at ON USERS (created_at DESC)';
EXCEPTION WHEN OTHERS THEN IF SQLCODE NOT IN (-1408, -955) THEN RAISE; END IF;
END;
/

BEGIN
  EXECUTE IMMEDIATE 'CREATE INDEX idx_official_functions_upper_name ON OFFICIAL_FUNCTIONS (UPPER(name))';
EXCEPTION WHEN OTHERS THEN IF SQLCODE NOT IN (-1408, -955) THEN RAISE; END IF;
END;
/

BEGIN
  EXECUTE IMMEDIATE 'CREATE INDEX idx_official_functions_created_at ON OFFICIAL_FUNCTIONS (created_at DESC)';
EXCEPTION WHEN OTHERS THEN IF SQLCODE NOT IN (-1408, -955) THEN RAISE; END IF;
END;
/

BEGIN
  EXECUTE IMMEDIATE 'CREATE INDEX idx_license_types_upper_name ON LICENSE_TYPES (UPPER(name))';
EXCEPTION WHEN OTHERS THEN IF SQLCODE NOT IN (-1408, -955) THEN RAISE; END IF;
END;
/

BEGIN
  EXECUTE IMMEDIATE 'CREATE INDEX idx_rest_times_user_id ON REST_TIMES (user_id)';
EXCEPTION WHEN OTHERS THEN IF SQLCODE NOT IN (-1408, -955) THEN RAISE; END IF;
END;
/

BEGIN
  EXECUTE IMMEDIATE 'CREATE INDEX idx_license_times_user_id ON LICENSE_TIMES (user_id)';
EXCEPTION WHEN OTHERS THEN IF SQLCODE NOT IN (-1408, -955) THEN RAISE; END IF;
END;
/
