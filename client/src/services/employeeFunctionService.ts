import { extractApiError } from './common';
import { officialFunctionService } from './officialFunctionService';
import { customFunctionService } from './customFunctionService';

/**
 * Employee-side functions for the workday declaration (the screens after
 * "Comenzar"): searching the official function catalogue and registering a new
 * ("inexistente") custom function.
 *
 * Wired to the real API:
 *  - searchCatalog  → GET  /official-functions  (read open to any authenticated user)
 *  - createCustomFunction → POST /custom-functions
 *
 * Scope note: persisting the *declared* functions of a declaration (JOB_FUNCTIONS,
 * with their time ranges) is NOT done here yet — that belongs to the declaration
 * submission flow, which still needs to be wired off the mock RecordsContext.
 */

/** A function offered by the catalogue (maps to OFFICIAL_FUNCTIONS). */
export interface CatalogFunction {
  id: string;
  name: string;
  description: string | null;
  /** Suggested time, in minutes (derived from the catalogue's expected_time in hours). */
  expected_time: number | null;
  /** Whether the employee created it ad-hoc (CUSTOM_FUNCTIONS) vs the official catalogue. */
  is_custom: boolean;
}

export interface CreateCustomFunctionPayload {
  name: string;
  description: string;
  /** Execution time, in minutes. NOTE: not persisted — CUSTOM_FUNCTIONS has no such column. */
  execution_time: number;
}

/** OFFICIAL_FUNCTIONS.expected_time is stored in hours; the UI works in minutes. */
function hoursToMinutes(hours: number | null): number | null {
  return hours == null ? null : Math.round(hours * 60);
}

export const employeeFunctionService = {
  /** Searches the official function catalogue by name. */
  async searchCatalog(query: string): Promise<CatalogFunction[]> {
    try {
      const res = await officialFunctionService.getOfficialFunctions({
        filter: query.trim(),
        limit: 50,
        status: 'active',
      });
      return res.data.map((f) => ({
        id: f.id,
        name: f.name,
        description: f.description,
        expected_time: hoursToMinutes(f.expected_time),
        is_custom: false,
      }));
    } catch (e) {
      throw extractApiError(e);
    }
  },

  /** Registers a new custom function that is not present in the catalogue. */
  async createCustomFunction(payload: CreateCustomFunctionPayload): Promise<CatalogFunction> {
    try {
      const created = await customFunctionService.createCustomFunction({
        name: payload.name.trim(),
        description: payload.description.trim(),
      });
      return {
        id: created.id,
        name: created.name,
        description: created.description,
        // Kept client-side for the declaration prefill; the backend does not store it.
        expected_time: payload.execution_time,
        is_custom: true,
      };
    } catch (e) {
      throw extractApiError(e);
    }
  },
};
