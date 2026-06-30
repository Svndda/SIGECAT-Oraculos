import apiClient from './apiClient';
import { extractApiError, type PageMeta } from './common';

/**
 * Declared licenses (LICENSE_TIMES): the permits/licenses an employee attaches
 * to their declaration, each over a [starts_at, ends_at] range and bound to a
 * license type. Writes are self-scoped and only allowed while the declaration
 * is still Incomplete (enforced by the backend).
 */
export interface CreateLicensePayload {
  declaration_id: string;
  license_type_id: string;
  /** 'YYYY-MM-DD HH:MM:SS' */
  starts_at: string;
  ends_at: string;
}

export interface UpdateLicensePayload {
  license_type_id?: string;
  starts_at?: string;
  ends_at?: string;
}

export interface LicenseResponse {
  license_time_id: string;
  user_id: string;
  declaration_id: string;
  license_type_id: string;
  license_type_name: string | null;
  starts_at: string;
  ends_at: string;
}

export const licenseService = {
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
