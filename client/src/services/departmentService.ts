import apiClient from './apiClient';
import { extractApiError, type ListParams, type OrgOption, type PageMeta, type Paginated } from './common';

export interface Department {
  department_id: string;
  area_id: string;
  name: string;
  description: string | null;
  created_at: string;
  created_by: string;
  is_deleted: number;
  deleted_at: string | null;
}

export interface CreateDepartmentPayload {
  area_id: string;
  name: string;
  description?: string;
}

export interface UpdateDepartmentPayload {
  area_id?: string;
  name?: string;
  description?: string;
}

export const departmentService = {
  /** Departments as selectable options (normalized to {id, name}). */
  async getDepartments(params: ListParams = {}): Promise<OrgOption[]> {
    try {
      const res = await apiClient.get<{ data: Array<{ id?: string; department_id?: string; name: string }> }>('/departments', { params });
      return (res.data.data ?? []).map((d) => ({ id: d.id ?? d.department_id ?? '', name: d.name }));
    } catch (e) { throw extractApiError(e); }
  },

  async getDepartmentsPage(params: ListParams = {}): Promise<Paginated<Department>> {
    try {
      const res = await apiClient.get<{ data: Department[]; meta: PageMeta }>('/departments', { params });
      return { data: res.data.data ?? [], meta: res.data.meta };
    } catch (e) { throw extractApiError(e); }
  },

  async getDepartmentById(id: string): Promise<Department> {
    try {
      const res = await apiClient.get<{ data: Department }>(`/departments/${id}`);
      return res.data.data;
    } catch (e) { throw extractApiError(e); }
  },

  async createDepartment(payload: CreateDepartmentPayload): Promise<Department> {
    try {
      const res = await apiClient.post<{ data: Department }>('/departments', payload);
      return res.data.data;
    } catch (e) { throw extractApiError(e); }
  },

  async updateDepartment(id: string, payload: UpdateDepartmentPayload): Promise<void> {
    try {
      await apiClient.patch(`/departments/${id}`, payload);
    } catch (e) { throw extractApiError(e); }
  },

  async deleteDepartment(id: string): Promise<void> {
    try {
      await apiClient.delete(`/departments/${id}`);
    } catch (e) { throw extractApiError(e); }
  },
};
