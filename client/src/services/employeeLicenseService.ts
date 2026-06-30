import apiClient from './apiClient';
import { extractApiError, type ListParams, type PageMeta } from './common';

/**
 * Employee-side permits/licenses for the workday declaration (LICENSE_TIMES +
 * LICENSE_TYPES).
 *
 * The license types catalogue is now served by the real backend
 * (GET /license-type); employees read the active catalogue while filling a
 * declaration. Persisting the declared licenses themselves (POST /license)
 * uses a [starts_at, ends_at] range model — see jobFunctionService for the
 * equivalent pattern.
 */

/** A kind of authorized permit/license (maps to LICENSE_TYPES). */
export interface LicenseType {
  id: string;
  name: string;
}

export const employeeLicenseService = {
  /**
   * Lists the authorized permit/license types (active catalogue).
   * GET /license-type.
   */
  async getLicenseTypes(params: ListParams = {}): Promise<LicenseType[]> {
    try {
      const res = await apiClient.get<{ data: LicenseType[]; meta: PageMeta }>(
        '/license-type',
        { params: { limit: 100, ...params } }
      );
      return res.data.data ?? [];
    } catch (e) {
      throw extractApiError(e);
    }
  },
};
