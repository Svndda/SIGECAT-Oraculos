import apiClient from './apiClient';
import type { Paginated, ListParams, ServiceError } from './adminService';

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

function extractApiError(error: unknown): ServiceError {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as { response?: {
      data?: {
        errors?: ServiceError[]
      }
    }};
    const errors = axiosError.response?.data?.errors;
    if (errors?.length) return errors[0];
  }
  return {
     code: 'INTERNAL_ERROR',
    message: 'Error del servidor. Intente de nuevo más tarde.'
  };
}

export const DepartmentService = {
  async getDepartments(params: ListParams = {})
  : Promise<Paginated<Department>> {
    try {
      const res = await apiClient.get<{
        data: Department[];
        meta: Paginated<Department>['meta'] }
      >('/departments', { params });
      return { data: res.data.data ?? [], meta: res.data.meta };
    } catch (e) {
      throw extractApiError(e);
    }
  },

  async getDepartmentById(id: string): Promise<Department> {
    try {
      const res = await apiClient.get<{
        data: Department
      }>(`/departments/${id}`);
      return res.data.data;
    } catch (e) {
      throw extractApiError(e);
    }
  },

  async createDepartment(payload: CreateDepartmentPayload): Promise<Department> {
    try {
      const res = await apiClient.post<{
        data: Department
      }>('/departments', payload);
      return res.data.data;
    } catch (e) {
      throw extractApiError(e);
    }
  },

  async updateDepartment(id: string, payload: UpdateDepartmentPayload)
  : Promise<void> {
    try {
      await apiClient.patch(`/departments/${id}`, payload);
    } catch (e) {
      throw extractApiError(e);
    }
  },

  async deleteDepartment(id: string): Promise<void> {
    try {
      await apiClient.delete(`/departments/${id}`);
    } catch (e) {
      throw extractApiError(e);
    }
  }
};