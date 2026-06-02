-- Tables

CREATE TABLE AREAS (
    area_id CHAR(26) NOT NULL,
    name VARCHAR2(110) NOT NULL,
    description VARCHAR2(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by CHAR(26) NOT NULL,
    CONSTRAINT pk_area PRIMARY KEY (area_id)
);

CREATE TABLE DEPARTMENTS (
    department_id CHAR(26) NOT NULL,
    area_id CHAR(26) NOT NULL,
    name VARCHAR2(110) NOT NULL,
    description VARCHAR2(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by CHAR(26) NOT NULL,
    CONSTRAINT pk_department PRIMARY KEY (department_id)
);

CREATE TABLE SECTIONS (
    section_id CHAR(26) NOT NULL,
    area_id CHAR(26) NOT NULL,
    name VARCHAR2(110) NOT NULL,
    description VARCHAR2(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by CHAR(26) NOT NULL,
    CONSTRAINT pk_section PRIMARY KEY (section_id)
);

CREATE TABLE JOB_CLASSES (
    job_class_id CHAR(26) NOT NULL,
    name VARCHAR2(110) NOT NULL,
    description VARCHAR2(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by CHAR(26) NOT NULL,
    CONSTRAINT pk_job_class PRIMARY KEY (job_class_id)
);

CREATE TABLE USERS (
    user_id CHAR(26) NOT NULL,
    email VARCHAR2(255) NOT NULL,
    first_name VARCHAR2(55) NOT NULL,
    last_name VARCHAR2(55) NOT NULL,
    password_hash VARCHAR2(255) NOT NULL,
    is_active NUMBER(1) DEFAULT 1 NOT NULL,
    is_password_temp NUMBER(1) DEFAULT 0 NOT NULL,
    failed_logging_attempts NUMBER(5) DEFAULT 0 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by CHAR(26) NOT NULL,
    role VARCHAR2(20) DEFAULT 'employee' NOT NULL,
    CONSTRAINT pk_users PRIMARY KEY (user_id),
    CONSTRAINT uk_users_email UNIQUE (email),
    CONSTRAINT chk_users_role CHECK (role IN ('admin', 'employee'))
);

CREATE TABLE REFRESH_TOKENS (
    refresh_token_id CHAR(26) NOT NULL,
    user_id CHAR(26) NOT NULL,
    token_hash VARCHAR2(255) NOT NULL,
    updated_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pk_refresh_token PRIMARY KEY (refresh_token_id)
);

CREATE TABLE ACCESS_TOKENS (
    access_token_id CHAR(26) NOT NULL,
    user_id CHAR(26) NOT NULL,
    token_hash VARCHAR2(255) NOT NULL,
    updated_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pk_access_token PRIMARY KEY (access_token_id)
);

CREATE TABLE LOGS (
    log_id CHAR(26) NOT NULL,
    auto_id VARCHAR2(26) NOT NULL,
    table_name VARCHAR2(100) NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    created_by CHAR(26) NOT NULL,
    updated_by_name VARCHAR2(110) NOT NULL,
    CONSTRAINT pk_log PRIMARY KEY (log_id)
);

CREATE TABLE LOG_ENTRIES (
    log_entry_id CHAR(26) NOT NULL,
    log_id CHAR(26) NOT NULL,
    field_name VARCHAR2(100) NOT NULL,
    old_value VARCHAR2(4000),
    new_value VARCHAR2(4000),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pk_log_entry PRIMARY KEY (log_entry_id)
);

CREATE TABLE UNITS (
    unit_id CHAR(26) NOT NULL,
    section_id CHAR(26),
    department_id CHAR(26),
    name VARCHAR2(110) NOT NULL,
    description VARCHAR2(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by CHAR(26) NOT NULL,
    CONSTRAINT pk_unit PRIMARY KEY (unit_id),
    CONSTRAINT check_unit_parent CHECK (
        (section_id IS NOT NULL AND department_id IS NULL) OR
        (section_id IS NULL AND department_id IS NOT NULL)
    )
);

CREATE TABLE JOB_POSITION_TYPES (
    job_position_type_id CHAR(26) NOT NULL,
    name VARCHAR2(110) NOT NULL,
    description VARCHAR2(255),
    job_class_id CHAR(26) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by CHAR(26) NOT NULL,
    CONSTRAINT pk_position_type PRIMARY KEY (job_position_type_id)
);

CREATE TABLE FREQUENCY_TYPES (
    frequency_type_id CHAR(26) NOT NULL,
    name VARCHAR2(110) NOT NULL,
    description VARCHAR2(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by CHAR(26) NOT NULL,
    CONSTRAINT pk_frequency_type PRIMARY KEY (frequency_type_id)
);

CREATE TABLE LICENSE_TYPES (
    license_type_id CHAR(26) NOT NULL,
    name VARCHAR2(110) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by CHAR(26) NOT NULL,
    CONSTRAINT pk_license_type PRIMARY KEY (license_type_id)
);

CREATE TABLE DECLARATIONS_STATUS (
    declaration_status_id CHAR(26) NOT NULL,
    value VARCHAR2(110) NOT NULL,
    description VARCHAR2(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by CHAR(26) NOT NULL,
    CONSTRAINT pk_declaration_status PRIMARY KEY (declaration_status_id)
);

CREATE TABLE JOB_POSITIONS (
    job_position_id CHAR(26) NOT NULL,
    unit_id CHAR(26),
    area_id CHAR(26),
    department_id CHAR(26),
    section_id CHAR(26),
    job_position_type_id CHAR(26) NOT NULL,
    user_id CHAR(26),
    job_position_number VARCHAR2(110) NOT NULL,
    name VARCHAR2(110) NOT NULL,
    description VARCHAR2(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by CHAR(26) NOT NULL,
    CONSTRAINT pk_position PRIMARY KEY (job_position_id),
    CONSTRAINT check_job_position_parent CHECK (
        (unit_id IS NOT NULL AND area_id IS NULL AND department_id IS NULL AND section_id IS NULL) OR
        (unit_id IS NULL AND area_id IS NOT NULL AND department_id IS NULL AND section_id IS NULL) OR
        (unit_id IS NULL AND area_id IS NULL AND department_id IS NOT NULL AND section_id IS NULL) OR
        (unit_id IS NULL AND area_id IS NULL AND department_id IS NULL AND section_id IS NOT NULL)
    )
);

CREATE TABLE OFFICIAL_FUNCTIONS (
    official_function_id CHAR(26) NOT NULL,
    job_position_type_id CHAR(26) NOT NULL,
    name VARCHAR2(110) NOT NULL,
    description VARCHAR2(255),
    expected_time NUMBER(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by CHAR(26) NOT NULL,
    CONSTRAINT pk_official_function PRIMARY KEY (official_function_id)
);

CREATE TABLE CUSTOM_FUNCTIONS (
    custom_function_id CHAR(26) NOT NULL,
    user_id CHAR(26) NOT NULL,
    name VARCHAR2(110) NOT NULL,
    description VARCHAR2(255),
    time NUMBER(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pk_custom_function PRIMARY KEY (custom_function_id)
);

CREATE TABLE REST_TIMES (
    rest_time_id CHAR(26) NOT NULL,
    user_id CHAR(26) NOT NULL,
    coffee_hours NUMBER(5,2),
    lunch_hours NUMBER(5,2),
    needed_time NUMBER(3) CHECK (needed_time <= 120),
    rest_type VARCHAR2(20) CHECK (rest_type IN ('Coffee', 'Lunch', 'Breakfast', 'Dinner')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pk_rest_time PRIMARY KEY (rest_time_id)
);

CREATE TABLE LICENSE_TIMES (
    license_time_id CHAR(26) NOT NULL,
    user_id CHAR(26) NOT NULL,
    license_type_id CHAR(26) NOT NULL,
    starts_at TIMESTAMP NOT NULL,
    ends_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pk_license_time PRIMARY KEY (license_time_id),
    CONSTRAINT check_license_dates CHECK (ends_at > starts_at)
);

CREATE TABLE DECLARATIONS (
    declaration_id CHAR(26) NOT NULL,
    user_id CHAR(26) NOT NULL,
    declaration_status_id CHAR(26),
    job_function_id CHAR(26) NOT NULL,
    justification VARCHAR2(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pk_declaration PRIMARY KEY (declaration_id)
);

CREATE TABLE JOB_FUNCTIONS (
    job_function_id CHAR(26) NOT NULL,
    user_id CHAR(26) NOT NULL,
    job_position_id CHAR(26) NOT NULL,
    declaration_id CHAR(26) NOT NULL,
    official_function_id CHAR(26),
    custom_function_id CHAR(26),
    frequency_type_id CHAR(26) NOT NULL,
    regular_time NUMBER(10,2) NOT NULL,
    overtime NUMBER(10,2) NOT NULL,
    justification VARCHAR2(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pk_job_function PRIMARY KEY (job_function_id),
    CONSTRAINT check_job_function CHECK (
        (official_function_id IS NOT NULL AND custom_function_id IS NULL) OR
        (official_function_id IS NULL AND custom_function_id IS NOT NULL)
    )
);

-- Indexes

CREATE INDEX idx_users_created_by ON USERS(created_by);

CREATE INDEX idx_refresh_token_user ON REFRESH_TOKENS(user_id);
CREATE INDEX idx_refresh_token_expires ON REFRESH_TOKENS(expires_at);
CREATE INDEX idx_refresh_token_revoked ON REFRESH_TOKENS(revoked_at);

CREATE INDEX idx_access_token_user ON ACCESS_TOKENS(user_id);
CREATE INDEX idx_access_token_expires ON ACCESS_TOKENS(expires_at);
CREATE INDEX idx_access_token_revoked ON ACCESS_TOKENS(revoked_at);

CREATE INDEX idx_log_table ON LOGS (table_name);
CREATE INDEX idx_log_auto_id ON LOGS (auto_id);
CREATE INDEX idx_log_created_by ON LOGS (created_by);

CREATE INDEX idx_log_entry_log ON LOG_ENTRIES(log_id);
CREATE INDEX idx_log_entry_field ON LOG_ENTRIES(field_name);
CREATE INDEX idx_log_entry_created ON LOG_ENTRIES(created_at);

CREATE INDEX idx_unit_section ON UNITS(section_id);
CREATE INDEX idx_unit_department ON UNITS(department_id);
CREATE INDEX idx_unit_created_by ON UNITS(created_by);

CREATE INDEX idx_job_class_created_by ON JOB_CLASSES(created_by);

CREATE INDEX idx_position_type_created_by ON JOB_POSITION_TYPES(created_by);
CREATE INDEX idx_position_type_job_class ON JOB_POSITION_TYPES(job_class_id);

CREATE INDEX idx_frequency_type_created_by ON FREQUENCY_TYPES(created_by);

CREATE INDEX idx_license_type_created_by ON LICENSE_TYPES(created_by);

CREATE INDEX idx_decl_status_created_by ON DECLARATIONS_STATUS(created_by);

CREATE INDEX idx_area_created_by ON AREAS(created_by);

CREATE INDEX idx_department_created_by ON DEPARTMENTS(created_by);
CREATE INDEX idx_department_area ON DEPARTMENTS(area_id);

CREATE INDEX idx_section_area ON SECTIONS(area_id);
CREATE INDEX idx_section_created_by ON SECTIONS(created_by);

CREATE INDEX idx_position_unit ON JOB_POSITIONS(unit_id);
CREATE INDEX idx_position_area ON JOB_POSITIONS(area_id);
CREATE INDEX idx_position_department ON JOB_POSITIONS(department_id);
CREATE INDEX idx_position_section ON JOB_POSITIONS(section_id);
CREATE INDEX idx_position_type ON JOB_POSITIONS(job_position_type_id);
CREATE INDEX idx_position_created_by ON JOB_POSITIONS(created_by);
CREATE INDEX idx_position_user ON JOB_POSITIONS(user_id);

CREATE INDEX idx_off_func_position_type ON OFFICIAL_FUNCTIONS(job_position_type_id);
CREATE INDEX idx_off_func_created_by ON OFFICIAL_FUNCTIONS(created_by);

CREATE INDEX idx_custom_func_user ON CUSTOM_FUNCTIONS(user_id);

CREATE INDEX idx_rest_time_user ON REST_TIMES(user_id);

CREATE INDEX idx_license_time_user ON LICENSE_TIMES(user_id);
CREATE INDEX idx_license_time_type ON LICENSE_TIMES(license_type_id);

CREATE INDEX idx_declaration_user ON DECLARATIONS(user_id);
CREATE INDEX idx_declaration_status ON DECLARATIONS(declaration_status_id);

CREATE INDEX idx_job_function_user ON JOB_FUNCTIONS(user_id);
CREATE INDEX idx_job_function_position ON JOB_FUNCTIONS(job_position_id);
CREATE INDEX idx_job_function_declaration ON JOB_FUNCTIONS(declaration_id);
CREATE INDEX idx_job_function_official_func ON JOB_FUNCTIONS(official_function_id);
CREATE INDEX idx_job_function_custom_func ON JOB_FUNCTIONS(custom_function_id);
CREATE INDEX idx_job_function_freq_type ON JOB_FUNCTIONS(frequency_type_id);

-- Foreign Keys

ALTER TABLE USERS ADD CONSTRAINT fk_users_created_by
    FOREIGN KEY (created_by) REFERENCES USERS(user_id);

ALTER TABLE REFRESH_TOKENS ADD CONSTRAINT fk_refresh_token_user
    FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE;

ALTER TABLE ACCESS_TOKENS ADD CONSTRAINT fk_access_token_user
    FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE;

ALTER TABLE LOGS ADD CONSTRAINT fk_log_created_by
    FOREIGN KEY (created_by) REFERENCES USERS(user_id);

ALTER TABLE LOG_ENTRIES ADD CONSTRAINT fk_log_entry_log
    FOREIGN KEY (log_id) REFERENCES LOGS(log_id) ON DELETE CASCADE;

ALTER TABLE UNITS ADD CONSTRAINT fk_unit_section
    FOREIGN KEY (section_id) REFERENCES SECTIONS(section_id) ON DELETE SET NULL;
ALTER TABLE UNITS ADD CONSTRAINT fk_unit_department
    FOREIGN KEY (department_id) REFERENCES DEPARTMENTS(department_id) ON DELETE SET NULL;
ALTER TABLE UNITS ADD CONSTRAINT fk_unit_created_by
    FOREIGN KEY (created_by) REFERENCES USERS(user_id);

ALTER TABLE DEPARTMENTS ADD CONSTRAINT fk_department_area
    FOREIGN KEY (area_id) REFERENCES AREAS(area_id);
ALTER TABLE DEPARTMENTS ADD CONSTRAINT fk_department_created_by
    FOREIGN KEY (created_by) REFERENCES USERS(user_id);

ALTER TABLE SECTIONS ADD CONSTRAINT fk_section_area
    FOREIGN KEY (area_id) REFERENCES AREAS(area_id);
ALTER TABLE SECTIONS ADD CONSTRAINT fk_section_created_by
    FOREIGN KEY (created_by) REFERENCES USERS(user_id);

ALTER TABLE JOB_CLASSES ADD CONSTRAINT fk_job_class_created_by
    FOREIGN KEY (created_by) REFERENCES USERS(user_id);

ALTER TABLE JOB_POSITION_TYPES ADD CONSTRAINT fk_position_type_job_class
    FOREIGN KEY (job_class_id) REFERENCES JOB_CLASSES(job_class_id);
ALTER TABLE JOB_POSITION_TYPES ADD CONSTRAINT fk_position_type_created_by
    FOREIGN KEY (created_by) REFERENCES USERS(user_id);

ALTER TABLE FREQUENCY_TYPES ADD CONSTRAINT fk_frequency_type_created_by
    FOREIGN KEY (created_by) REFERENCES USERS(user_id);

ALTER TABLE LICENSE_TYPES ADD CONSTRAINT fk_license_type_created_by
    FOREIGN KEY (created_by) REFERENCES USERS(user_id);

ALTER TABLE DECLARATIONS_STATUS ADD CONSTRAINT fk_decl_status_created_by
    FOREIGN KEY (created_by) REFERENCES USERS(user_id);

ALTER TABLE AREAS ADD CONSTRAINT fk_area_created_by
    FOREIGN KEY (created_by) REFERENCES USERS(user_id);

ALTER TABLE JOB_POSITIONS ADD CONSTRAINT fk_position_unit
    FOREIGN KEY (unit_id) REFERENCES UNITS(unit_id) ON DELETE SET NULL;
ALTER TABLE JOB_POSITIONS ADD CONSTRAINT fk_position_area
    FOREIGN KEY (area_id) REFERENCES AREAS(area_id) ON DELETE SET NULL;
ALTER TABLE JOB_POSITIONS ADD CONSTRAINT fk_position_department
    FOREIGN KEY (department_id) REFERENCES DEPARTMENTS(department_id) ON DELETE SET NULL;
ALTER TABLE JOB_POSITIONS ADD CONSTRAINT fk_position_section
    FOREIGN KEY (section_id) REFERENCES SECTIONS(section_id) ON DELETE SET NULL;
ALTER TABLE JOB_POSITIONS ADD CONSTRAINT fk_position_type
    FOREIGN KEY (job_position_type_id) REFERENCES JOB_POSITION_TYPES(job_position_type_id);
ALTER TABLE JOB_POSITIONS ADD CONSTRAINT fk_position_user
    FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE SET NULL;
ALTER TABLE JOB_POSITIONS ADD CONSTRAINT fk_position_created_by
    FOREIGN KEY (created_by) REFERENCES USERS(user_id);

ALTER TABLE OFFICIAL_FUNCTIONS ADD CONSTRAINT fk_off_func_position_type
    FOREIGN KEY (job_position_type_id) REFERENCES JOB_POSITION_TYPES(job_position_type_id);

ALTER TABLE OFFICIAL_FUNCTIONS ADD CONSTRAINT fk_off_func_created_by
    FOREIGN KEY (created_by) REFERENCES USERS(user_id);

ALTER TABLE CUSTOM_FUNCTIONS ADD CONSTRAINT fk_custom_user
    FOREIGN KEY (user_id) REFERENCES USERS(user_id);

ALTER TABLE REST_TIMES ADD CONSTRAINT fk_rest_time_user
    FOREIGN KEY (user_id) REFERENCES USERS(user_id);

ALTER TABLE LICENSE_TIMES ADD CONSTRAINT fk_license_time_user
    FOREIGN KEY (user_id) REFERENCES USERS(user_id);
ALTER TABLE LICENSE_TIMES ADD CONSTRAINT fk_license_time_type
    FOREIGN KEY (license_type_id) REFERENCES LICENSE_TYPES(license_type_id);

ALTER TABLE DECLARATIONS ADD CONSTRAINT fk_declaration_user
    FOREIGN KEY (user_id) REFERENCES USERS(user_id);
ALTER TABLE DECLARATIONS ADD CONSTRAINT fk_declaration_status
    FOREIGN KEY (declaration_status_id) REFERENCES DECLARATIONS_STATUS(declaration_status_id);

ALTER TABLE JOB_FUNCTIONS ADD CONSTRAINT fk_job_function_user
    FOREIGN KEY (user_id) REFERENCES USERS(user_id);
ALTER TABLE JOB_FUNCTIONS ADD CONSTRAINT fk_job_function_position
    FOREIGN KEY (job_position_id) REFERENCES JOB_POSITIONS(job_position_id);
ALTER TABLE JOB_FUNCTIONS ADD CONSTRAINT fk_job_function_declaration
    FOREIGN KEY (declaration_id) REFERENCES DECLARATIONS(declaration_id) ON DELETE CASCADE;
ALTER TABLE JOB_FUNCTIONS ADD CONSTRAINT fk_job_function_official_func
    FOREIGN KEY (official_function_id) REFERENCES OFFICIAL_FUNCTIONS(official_function_id) ON DELETE SET NULL;
ALTER TABLE JOB_FUNCTIONS ADD CONSTRAINT fk_job_function_custom_func
    FOREIGN KEY (custom_function_id) REFERENCES CUSTOM_FUNCTIONS(custom_function_id) ON DELETE SET NULL;
ALTER TABLE JOB_FUNCTIONS ADD CONSTRAINT fk_job_function_freq_type
    FOREIGN KEY (frequency_type_id) REFERENCES FREQUENCY_TYPES(frequency_type_id);