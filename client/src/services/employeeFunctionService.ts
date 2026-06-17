import { extractApiError } from './common';

/**
 * Employee-side functions for the workday declaration (the screens after
 * "Comenzar"): searching the unit's function catalogue and registering a new
 * ("inexistente") custom function.
 *
 * NOTE: the backend for the employee declaration (OFFICIAL_FUNCTIONS read for
 * employees, CUSTOM_FUNCTIONS, JOB_FUNCTIONS) is not implemented yet — that work
 * belongs to the API team. The calls below are STUBBED with local data but keep
 * the shape they will have against the real endpoints, so wiring them up later
 * is a one-function swap (see each TODO(backend)).
 */

/** A function offered by the unit's catalogue (maps to OFFICIAL_FUNCTIONS). */
export interface CatalogFunction {
  id: string;
  name: string;
  description: string | null;
  /** Expected execution time, in minutes. */
  expected_time: number | null;
  /** Whether the employee created it ad-hoc (CUSTOM_FUNCTIONS) vs the official catalogue. */
  is_custom: boolean;
}

export interface CreateCustomFunctionPayload {
  name: string;
  description: string;
  /** Execution time, in minutes. */
  execution_time: number;
}

// STUB catalogue. Replace with the real GET when the backend exposes it to employees.
const MOCK_CATALOG: CatalogFunction[] = [
  { id: 'off-1', name: 'Atención al público', description: 'Atender consultas presenciales y telefónicas.', expected_time: 120, is_custom: false },
  { id: 'off-2', name: 'Elaboración de informes', description: 'Redacción de informes técnicos mensuales.', expected_time: 180, is_custom: false },
  { id: 'off-3', name: 'Mantenimiento de equipos', description: 'Revisión y calibración de equipo de laboratorio.', expected_time: 90, is_custom: false },
  { id: 'off-4', name: 'Gestión de inventario', description: 'Control y registro de insumos de la unidad.', expected_time: 60, is_custom: false },
  { id: 'off-5', name: 'Supervisión de prácticas', description: 'Acompañamiento a estudiantes en laboratorio.', expected_time: 150, is_custom: false },
];

export const employeeFunctionService = {
  /**
   * Searches the unit's function catalogue by name.
   * TODO(backend): GET /official-functions?filter=<query> (currently admin-only).
   */
  async searchCatalog(query: string): Promise<CatalogFunction[]> {
    try {
      const q = query.trim().toLowerCase();
      if (q === '') return [...MOCK_CATALOG];
      return MOCK_CATALOG.filter((f) => f.name.toLowerCase().includes(q));
    } catch (e) {
      throw extractApiError(e);
    }
  },

  /**
   * Registers a new custom function that is not present in the catalogue.
   * TODO(backend): POST /custom-functions { name, description, expected_time }.
   */
  async createCustomFunction(payload: CreateCustomFunctionPayload): Promise<CatalogFunction> {
    try {
      return {
        id: `custom-${Date.now()}`,
        name: payload.name.trim(),
        description: payload.description.trim(),
        expected_time: payload.execution_time,
        is_custom: true,
      };
    } catch (e) {
      throw extractApiError(e);
    }
  },
};
