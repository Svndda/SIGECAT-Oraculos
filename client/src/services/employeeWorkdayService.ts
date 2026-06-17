import { extractApiError } from './common';

/**
 * Employee-side workday magnitude/assignment for the declaration.
 *
 * NOTE: the employee declaration backend is not implemented yet — that work
 * belongs to the API team. The calls below are STUBBED but keep the shape they
 * will have against the real endpoints (see each TODO(backend)).
 */

/** A workday magnitude and the weekly limits it implies. */
export interface WorkdayMagnitude {
  id: string;
  name: string;
  /** Maximum ordinary weekly hours for this magnitude. */
  weeklyHours: number;
  /** Maximum extraordinary (overtime) weekly hours for this magnitude. */
  overtimeHours: number;
}

// STUB list of magnitudes and their limits.
const MAGNITUDES: WorkdayMagnitude[] = [
  { id: 'full', name: 'Tiempo completo', weeklyHours: 48, overtimeHours: 12 },
  { id: 'half', name: 'Medio tiempo', weeklyHours: 24, overtimeHours: 6 },
  { id: 'quarter', name: 'Cuarto de tiempo', weeklyHours: 12, overtimeHours: 3 },
];

export const employeeWorkdayService = {
  /**
   * Lists the available workday magnitudes and their limits.
   * TODO(backend): GET /workday-magnitudes (or a static enum agreed with the API).
   */
  async getMagnitudes(): Promise<WorkdayMagnitude[]> {
    try {
      return [...MAGNITUDES];
    } catch (e) {
      throw extractApiError(e);
    }
  },

  /**
   * Assigns the employee's workday magnitude to the declaration.
   * TODO(backend): PATCH the declaration with the chosen workday magnitude.
   */
  async assignWorkday(payload: { magnitudeId: string }): Promise<void> {
    try {
      void payload;
    } catch (e) {
      throw extractApiError(e);
    }
  },
};
