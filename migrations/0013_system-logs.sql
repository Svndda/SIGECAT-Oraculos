-- SIGECAT - System-wide logging
--
-- Introduces SYSTEM_LOGS, a single append-only table that captures structured
-- events from every layer of the API: authentication, HTTP requests, database
-- failures and any explicit application event emitted through the Logger
-- service.
--
-- Design notes:
--   * log_id is a 26-char ULID (same identifier scheme used everywhere else).
--   * The table is write-mostly and never updated; reads are admin-only and
--     filtered/paginated, so the secondary indexes target the columns the
--     admin log viewer filters by (time, level, category and actor).
--   * context holds an optional JSON blob (CLOB) with event-specific detail.
--     It is stored as text so the application stays portable across Oracle
--     versions that may not expose native JSON columns.
--   * No foreign key to USERS: logs must survive a user being hard-deleted and
--     must be insertable even for unauthenticated/anonymous requests.

CREATE TABLE SYSTEM_LOGS (
  LOG_ID        VARCHAR2(26)    NOT NULL,
  LOG_LEVEL     VARCHAR2(10)    NOT NULL,
  CATEGORY      VARCHAR2(50)    NOT NULL,
  ACTION        VARCHAR2(100),
  MESSAGE       VARCHAR2(1000)  NOT NULL,
  CONTEXT       CLOB,
  USER_ID       VARCHAR2(26),
  IP_ADDRESS    VARCHAR2(45),
  HTTP_METHOD   VARCHAR2(10),
  HTTP_PATH     VARCHAR2(500),
  STATUS_CODE   NUMBER(3),
  CREATED_AT    TIMESTAMP       DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT PK_SYSTEM_LOGS PRIMARY KEY (LOG_ID),
  CONSTRAINT CK_SYSTEM_LOGS_LEVEL
    CHECK (LOG_LEVEL IN ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'))
);

-- Most queries are "newest first", optionally narrowed by a single facet.
CREATE INDEX IX_SYSTEM_LOGS_CREATED  ON SYSTEM_LOGS (CREATED_AT DESC);
CREATE INDEX IX_SYSTEM_LOGS_LEVEL    ON SYSTEM_LOGS (LOG_LEVEL, CREATED_AT DESC);
CREATE INDEX IX_SYSTEM_LOGS_CATEGORY ON SYSTEM_LOGS (CATEGORY, CREATED_AT DESC);
CREATE INDEX IX_SYSTEM_LOGS_USER     ON SYSTEM_LOGS (USER_ID, CREATED_AT DESC);
