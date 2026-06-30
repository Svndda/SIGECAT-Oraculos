import apiClient from './apiClient';
import { extractApiError, type ListParams, type PageMeta, type Paginated } from './common';

/**
 * A license type (LICENSE_TYPES): the catalogue of authorized permits/licenses
 * an employee can declare. A license type is just a unique name; reads are open
 * to any authenticated user, writes are admin-only.
 */
export interface LicenseType {
  id: string;
  name: string;
  created_at: string;
  is_deleted: number;
  deleted_at: string | null;
}

export const licenseTypeService = {
  async getLicenseTypes(params: ListParams = {}): Promise<Paginated<LicenseType>> {
    try {
      const res = await apiClient.get<{ data: LicenseType[]; meta: PageMeta }>(
        '/license-type',
        { params }
      );
      return { data: res.data.data ?? [], meta: res.data.meta };
    } catch (e) { throw extractApiError(e); }
  },

  async createLicenseType(payload: { name: string }): Promise<void> {
    try {
      await apiClient.post('/license-type', payload);
    } catch (e) { throw extractApiError(e); }
  },

  async updateLicenseType(id: string, payload: { name?: string }): Promise<void> {
    try {
      await apiClient.patch(`/license-type/${id}`, payload);
    } catch (e) { throw extractApiError(e); }
  },

  async deleteLicenseType(id: string): Promise<void> {
    try {
      await apiClient.delete(`/license-type/${id}`);
    } catch (e) { throw extractApiError(e); }
  },
};
