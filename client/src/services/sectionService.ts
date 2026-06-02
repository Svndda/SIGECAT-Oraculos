import apiClient from './apiClient';
import { extractApiError, type ListParams, type OrgOption } from './common';

export const sectionService = {
  /** Sections as selectable options (normalized to {id, name}). */
  async getSections(params: ListParams = {}): Promise<OrgOption[]> {
    try {
      const res = await apiClient.get<{ data: OrgOption[] }>('/sections', { params });
      return res.data.data ?? [];
    } catch (e) { throw extractApiError(e); }
  },
};
