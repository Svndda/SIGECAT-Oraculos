import apiClient from './apiClient';
import { extractApiError, type ListParams, type Paginated } from './common';

export interface JobClass {
  job_class_id: string;
  job_class_code: number;
  name: string;
  description: string | null;
  created_at: string;
  created_by: string;
}

export const jobClassService = {
  async getJobClasses(params: ListParams = {}): Promise<JobClass[]> {
    try {
      const res = await apiClient.get<{ data: JobClass[] }>('/job-classes', {
        params: { limit: 100, ...params },
      });
      return res.data.data ?? [];
    } catch (e) {
      throw extractApiError(e);
    }
  },

  async getJobClassesPage(params: ListParams = {}): Promise<Paginated<JobClass>> {
    try {
      const res = await apiClient.get<{ data: JobClass[]; meta: any }>('/job-classes', { params });
      return {
        data: res.data.data ?? [],
        meta: res.data.meta,
      };
    } catch (e) {
      throw extractApiError(e);
    }
  },
};