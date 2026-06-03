import apiClient from './apiClient';
import { extractApiError } from './common';

/** An occupational class (JOB_CLASS) selectable for a user. */
export interface JobClass {
  id: string;
  name: string;
}

export const jobClassService = {
  async getJobClasses(): Promise<JobClass[]> {
    try {
      const res = await apiClient.get<{ data: JobClass[] }>('/job-classes', { params: { limit: 100 } });
      return res.data.data ?? [];
    } catch (e) { throw extractApiError(e); }
  },
};
