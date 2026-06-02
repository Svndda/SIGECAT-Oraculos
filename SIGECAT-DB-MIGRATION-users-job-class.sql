-- =====================================================================
-- Migration: occupational class (JOB_CLASS) on USERS
--
-- Adds the user's occupational class as a nullable FK to JOB_CLASSES so an
-- admin can assign it. The frontend (AdminUser.job_class_id) and
-- UpdateUserDTO already referenced this field; the column was missing.
--
-- Additive and idempotent.
-- =====================================================================

DECLARE
  v_cnt NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_cnt
    FROM user_tab_columns
   WHERE table_name = 'USERS' AND column_name = 'JOB_CLASS_ID';

  IF v_cnt = 0 THEN
    EXECUTE IMMEDIATE 'ALTER TABLE USERS ADD (job_class_id CHAR(26))';
    EXECUTE IMMEDIATE
      'ALTER TABLE USERS ADD CONSTRAINT fk_users_job_class
         FOREIGN KEY (job_class_id) REFERENCES JOB_CLASSES (job_class_id)';
  END IF;
END;
/
