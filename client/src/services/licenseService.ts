import apiClient from './apiClient';
import { extractApiError, type ListParams, type PageMeta } from './common';

/**
 * Licenses
 *
 *  - the read-only catalogue of authorized license types (LICENSE_TYPES),
 *    served by GET /license-type and used while filling a declaration.
 *  - the declared license entries themselves (LICENSE_TIMES): the
 *    permits/licenses an employee attaches to their declaration, each with a
 *    duration in minutes and bound to a license type. Writes are self-scoped
 *    and only allowed while the declaration is still Incomplete (enforced by
 *    the backend).
 */

/** A kind of authorized permit/license (maps to LICENSE_TYPES). */
export interface LicenseType {
  id: string;
  name: string;
}

export interface CreateLicensePayload {
  declaration_id: string;
  license_type_id: string;
  duration_minutes: number;
}

export interface UpdateLicensePayload {
  license_type_id?: string;
  duration_minutes?: number;
}

export interface LicenseResponse {
  license_time_id: string;
  user_id: string;
  declaration_id: string;
  license_type_id: string;
  license_type_name: string | null;
  duration_minutes: number;
}

export const licenseService = {

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

  /** Lists the caller's declared licenses for a given declaration. */
  async getLicensesByDeclaration(declarationId: string): Promise<LicenseResponse[]> {
    try {
      const res = await apiClient.get<{ data: LicenseResponse[]; meta: PageMeta }>(
        '/license',
        { params: { declaration_id: declarationId, limit: 100 } }
      );
      return res.data.data ?? [];
    } catch (e) {
      throw extractApiError(e);
    }
  },

  async createLicense(payload: CreateLicensePayload): Promise<LicenseResponse> {
    try {
      const res = await apiClient.post<{ data: LicenseResponse }>('/license', payload);
      return res.data.data;
    } catch (e) {
      throw extractApiError(e);
    }
  },

  async updateLicense(id: string, payload: UpdateLicensePayload): Promise<void> {
    try {
      await apiClient.patch(`/license/${id}`, payload);
    } catch (e) {
      throw extractApiError(e);
    }
  },

  async deleteLicense(id: string): Promise<void> {
    try {
      await apiClient.delete(`/license/${id}`);
    } catch (e) {
      throw extractApiError(e);
    }
  },
};