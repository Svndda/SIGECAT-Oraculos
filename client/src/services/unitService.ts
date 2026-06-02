import apiClient from './apiClient';
import { extractApiError, type ListParams, type PageMeta, type Paginated } from './common';

export interface Unit {
  id: string;
  section_id: string | null;
  department_id: string | null;
  name: string;
  description: string | null;
  created_at: string;
  created_by: string;
  is_deleted: number;
  deleted_at: string | null;
}

export interface CreateUnitPayload {
  name: string;
  description?: string;
  section_id?: string;
  department_id?: string;
}

export interface UpdateUnitPayload {
  name?: string;
  description?: string;
  section_id?: string;
  department_id?: string;
}

export const unitService = {
  async getUnits(params: ListParams = {}): Promise<Paginated<Unit>> {
    try {
      const res = await apiClient.get<{ data: Unit[]; meta: PageMeta }>('/units', { params });
      return { data: res.data.data ?? [], meta: res.data.meta };
    } catch (e) { throw extractApiError(e); }
  },

  async createUnit(payload: CreateUnitPayload): Promise<void> {
    try {
      await apiClient.post('/units', payload);
    } catch (e) { throw extractApiError(e); }
  },

  async updateUnit(id: string, payload: UpdateUnitPayload): Promise<void> {
    try {
      await apiClient.patch(`/units/${id}`, payload);
    } catch (e) { throw extractApiError(e); }
  },

  async deleteUnit(id: string): Promise<void> {
    try {
      await apiClient.delete(`/units/${id}`);
    } catch (e) { throw extractApiError(e); }
  },
};
