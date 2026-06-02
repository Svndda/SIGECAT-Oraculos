import apiClient from './apiClient';
import { extractApiError, type ListParams, type OrgOption } from './common';

export const sectionService = {
  /** Sections as selectable options (normalized to {id, name}). */
  async getSections(params: ListParams = {}): Promise<OrgOption[]> {
    try {
      const res = await apiClient.get<{ data: Array<{ section_id?: string; id?: string; name: string }> }>('/sections', { params });
      return (res.data.data ?? []).map((s) => ({ id: s.section_id ?? s.id ?? '', name: s.name }));
    } catch (e) { throw extractApiError(e); }
  },
};
