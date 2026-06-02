import apiClient from './apiClient';
import { extractApiError, type ListParams, type OrgOption } from './common';

export const departmentService = {
  /** Departments as selectable options (normalized to {id, name}). */
  async getDepartments(params: ListParams = {}): Promise<OrgOption[]> {
    try {
      const res = await apiClient.get<{ data: Array<{ id?: string; department_id?: string; name: string }> }>('/departments', { params });
      return (res.data.data ?? []).map((d) => ({ id: d.id ?? d.department_id ?? '', name: d.name }));
    } catch (e) { throw extractApiError(e); }
  },
};
