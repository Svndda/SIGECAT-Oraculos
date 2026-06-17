import { extractApiError } from './common';

/**
 * Employee-side permits/licenses for the workday declaration (LICENSE_TIMES +
 * LICENSE_TYPES).
 *
 * NOTE: the employee declaration backend is not implemented yet — that work
 * belongs to the API team. The call below is STUBBED with local data but keeps
 * the shape it will have against the real endpoint (see TODO(backend)).
 */

/** A kind of authorized permit/license (maps to LICENSE_TYPES). */
export interface LicenseType {
  id: string;
  name: string;
}

// STUB list. Replace with GET /license-types when the backend exposes it.
const MOCK_LICENSE_TYPES: LicenseType[] = [
  { id: 'lic-1', name: 'Permiso con goce de salario' },
  { id: 'lic-2', name: 'Permiso sin goce de salario' },
  { id: 'lic-3', name: 'Licencia por enfermedad' },
  { id: 'lic-4', name: 'Licencia por maternidad/paternidad' },
  { id: 'lic-5', name: 'Permiso por estudio' },
];

export const employeeLicenseService = {
  /**
   * Lists the authorized permit/license types.
   * TODO(backend): GET /license-types.
   */
  async getLicenseTypes(): Promise<LicenseType[]> {
    try {
      return [...MOCK_LICENSE_TYPES];
    } catch (e) {
      throw extractApiError(e);
    }
  },
};
