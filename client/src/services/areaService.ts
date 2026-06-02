import apiClient from './apiClient';
import { extractApiError, type ListParams, type PageMeta, type Paginated } from './common';

export interface Area {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  created_by: string;
  is_deleted: number;
  deleted_at: string | null;
}

export const areaService = {
  async getAreas(params: ListParams = {}): Promise<Paginated<Area>> {
    try {
      const res = await apiClient.get<{ data: Area[]; meta: PageMeta }>('/areas', { params });
      return { data: res.data.data ?? [], meta: res.data.meta };
    } catch (e) { throw extractApiError(e); }
  },

  async createArea(payload: { name: string; description?: string }): Promise<void> {
    try {
      await apiClient.post('/areas', payload);
    } catch (e) { throw extractApiError(e); }
  },

  async updateArea(id: string, payload: { name?: string; description?: string }): Promise<void> {
    try {
      await apiClient.patch(`/areas/${id}`, payload);
    } catch (e) { throw extractApiError(e); }
  },

  async deleteArea(id: string): Promise<void> {
    try {
      await apiClient.delete(`/areas/${id}`);
    } catch (e) { throw extractApiError(e); }
  },
};
