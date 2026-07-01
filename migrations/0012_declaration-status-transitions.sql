-- SIGECAT - Enforce declaration status transitions in FN_CHANGE_DECLARATION_STATUS
--
-- Until now the function accepted any value from the status enum without
-- checking whether the move from the current status was allowed. The valid
-- transitions were only enforced in the application layer
-- (DeclarationsService::STATUS_TRANSITIONS). This adds the same state machine
-- to the database function as defense in depth, mirroring that map exactly:
--
--   Incomplete -> Completed, Abandoned
--   Revision   -> Approved, Rejected, Abandoned
--   Approved   -> Rejected
--   Rejected   -> (terminal)
--   Abandoned  -> (terminal)
--   Completed  -> Revision
--
-- A move from a terminal status, an unknown current status, or any pair not in
-- the map is rejected with ORA-20063.
--
-- It also normalizes the out-of-shift check (used when moving to 'Completed')
-- to time-of-day offsets so overnight shifts and functions reported on the
-- next calendar day are evaluated correctly, matching the client.

CREATE OR REPLACE FUNCTION FN_CHANGE_DECLARATION_STATUS (
    p_status_id      IN CLIENT.DECLARATIONS_STATUS.DECLARATION_STATUS_ID%TYPE,
    p_declaration_id IN CLIENT.DECLARATIONS.DECLARATION_ID%TYPE,
    p_new_status     IN CLIENT.DECLARATIONS_STATUS.STATUS_VALUE%TYPE,
    p_created_by     IN CLIENT.DECLARATIONS_STATUS.CREATED_BY%TYPE
) RETURN CLIENT.DECLARATIONS_STATUS.DECLARATION_STATUS_ID%TYPE
IS
    v_shift_start        CLIENT.DECLARATIONS.SHIFT_STARTS_AT%TYPE;
    v_shift_end          CLIENT.DECLARATIONS.SHIFT_ENDS_AT%TYPE;
    v_justification      CLIENT.DECLARATIONS.JUSTIFICATION%TYPE;
    v_out_of_range_count NUMBER;
    v_shift_start_min    NUMBER;
    v_shift_dur_min      NUMBER;
    v_current_status     VARCHAR2(20);
    v_valid_statuses     VARCHAR2(200) := 'Incomplete,Revision,Approved,Rejected,Abandoned,Completed';
    v_transition_ok      BOOLEAN;
BEGIN
    -- Checks if declaration exists and fetch shift and justification
    BEGIN
        SELECT SHIFT_STARTS_AT, SHIFT_ENDS_AT, JUSTIFICATION
        INTO v_shift_start, v_shift_end, v_justification
        FROM CLIENT.DECLARATIONS
        WHERE DECLARATION_ID = p_declaration_id
        FOR UPDATE;   -- Lock of row
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RAISE_APPLICATION_ERROR(-20060, 'Declaration ID no encontrado.');
    END;

    -- Checks if the new_status is in the allowed values
    IF NOT (p_new_status IN ('Incomplete', 'Revision', 'Approved', 'Rejected', 'Abandoned', 'Completed')) THEN
        RAISE_APPLICATION_ERROR(-20061, 'Estado de declaración inválido: ' || v_valid_statuses);
    END IF;

    -- Validate the transition from the current status (state machine; mirrors
    -- DeclarationsService::STATUS_TRANSITIONS).
    v_current_status := FN_GET_CURRENT_STATUS(p_declaration_id);

    v_transition_ok :=
        (v_current_status = 'Incomplete' AND p_new_status IN ('Completed', 'Abandoned'))
     OR (v_current_status = 'Revision'   AND p_new_status IN ('Approved', 'Rejected', 'Abandoned'))
     OR (v_current_status = 'Approved'   AND p_new_status = 'Rejected')
     OR (v_current_status = 'Completed'  AND p_new_status = 'Revision');

    IF v_current_status IS NULL OR NOT v_transition_ok THEN
        RAISE_APPLICATION_ERROR(-20063,
            'Transición de estado no permitida: ' || NVL(v_current_status, '(sin estado)') || ' -> ' || p_new_status);
    END IF;

    -- Checks for 'Completed' status
    IF p_new_status = 'Completed' THEN
        -- Out-of-shift is measured by time-of-day offset from the shift start,
        -- wrapping past midnight, so overnight shifts (e.g. 22:00-06:00) and
        -- functions reported on the following calendar day are handled without
        -- relying on the stored timestamps' dates. Mirrors the client's
        -- isOutsideShift: a function is out of range when its start offset plus
        -- its duration exceeds the shift duration.
        v_shift_start_min :=
            TO_NUMBER(TO_CHAR(v_shift_start, 'HH24')) * 60 + TO_NUMBER(TO_CHAR(v_shift_start, 'MI'));
        v_shift_dur_min := MOD(
            TO_NUMBER(TO_CHAR(v_shift_end, 'HH24')) * 60 + TO_NUMBER(TO_CHAR(v_shift_end, 'MI'))
            - v_shift_start_min + 1440, 1440);

        SELECT COUNT(*)
        INTO v_out_of_range_count
        FROM CLIENT.JOB_FUNCTIONS jf
        WHERE jf.DECLARATION_ID = p_declaration_id
          AND MOD(
                TO_NUMBER(TO_CHAR(jf.STARTS_AT, 'HH24')) * 60 + TO_NUMBER(TO_CHAR(jf.STARTS_AT, 'MI'))
                - v_shift_start_min + 1440, 1440)
            + MOD(
                TO_NUMBER(TO_CHAR(jf.ENDS_AT, 'HH24')) * 60 + TO_NUMBER(TO_CHAR(jf.ENDS_AT, 'MI'))
                - (TO_NUMBER(TO_CHAR(jf.STARTS_AT, 'HH24')) * 60 + TO_NUMBER(TO_CHAR(jf.STARTS_AT, 'MI')))
                + 1440, 1440)
              > v_shift_dur_min;

        IF v_out_of_range_count > 0 AND v_justification IS NULL THEN
            RAISE_APPLICATION_ERROR(-20062, 'Es necesario justificar la declaración, ya que algunas funciones del puesto quedan fuera del horario de turno declarado.');
        END IF;
    END IF;

    -- Insert new status instance
    INSERT INTO CLIENT.DECLARATIONS_STATUS (
        DECLARATION_STATUS_ID,
        STATUS_VALUE,
        CREATED_AT,
        CREATED_BY,
        DECLARATION_ID
    ) VALUES (
        p_status_id,
        p_new_status,
        CURRENT_TIMESTAMP,
        p_created_by,
        p_declaration_id
    );

    RETURN p_status_id;

EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END FN_CHANGE_DECLARATION_STATUS;
/
