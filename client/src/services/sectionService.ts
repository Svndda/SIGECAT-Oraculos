import apiClient from './apiClient';
import { extractApiError, type ListParams, type OrgOption, type PageMeta, type Paginated } from './common';

export interface Section {
  section_id: string;
  area_id: string;
  name: string;
  description: string | null;
  created_at: string;
  created_by: string;
  is_deleted: number;
  deleted_at: string | null;
}

export interface CreateSectionPayload {
  area_id: string;
  name: string;
  description?: string;
}

export interface UpdateSectionPayload {
  area_id?: string;
  name?: string;
  description?: string;
}

export const sectionService = {
  /** Sections as selectable options (normalized to {id, name}). */
  async getSections(params: ListParams = {}): Promise<OrgOption[]> {
    try {
      const res = await apiClient.get<{ data: OrgOption[] }>('/sections', { params });
      return res.data.data ?? [];
    } catch (e) { throw extractApiError(e); }
  },

  /** Full section rows with pagination meta (for the management page). */
  async getSectionsPage(params: ListParams = {}): Promise<Paginated<Section>> {
    try {
      const res = await apiClient.get<{ data: Section[]; meta: PageMeta }>('/sections', { params });
      return { data: res.data.data ?? [], meta: res.data.meta };
    } catch (e) { throw extractApiError(e); }
  },

  async createSection(payload: CreateSectionPayload): Promise<void> {
    try {
      await apiClient.post('/sections', payload);
    } catch (e) { throw extractApiError(e); }
  },

  async updateSection(id: string, payload: UpdateSectionPayload): Promise<void> {
    try {
      await apiClient.patch(`/sections/${id}`, payload);
    } catch (e) { throw extractApiError(e); }
  },

  async deleteSection(id: string): Promise<void> {
    try {
      await apiClient.delete(`/sections/${id}`);
    } catch (e) { throw extractApiError(e); }
  },
};