import apiClient from './apiClient';
import { extractApiError, type ListParams, type Paginated} from './common';

export interface JobClass {
  job_class_id: string;
  job_class_code: number;
  name: string;
  description: string | null;
  created_at: string;
  created_by: string;
  is_deleted: number;
  deleted_at: string | null;
}

export interface CreateJobClassPayload {
  name: string;
  job_class_code: number;
  description?: string;
}

export interface UpdateJobClassPayload {
  name?: string;
  job_class_code?: number;
  description?: string;
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

  async getJobClassById(id: string): Promise<JobClass> {
    try {
      const res = await apiClient.get<{ data: JobClass }>(`/job-class/${id}`);
      return res.data.data;
    } catch (e) {
      throw extractApiError(e);
    }
  },

  async createJobClass(payload: CreateJobClassPayload): Promise<JobClass> {
    try {
      const res = await apiClient.post<{ data: JobClass }>('/job-class', payload);
      return res.data.data;
    } catch (e) {
      throw extractApiError(e);
    }
  },

  async updateJobClass(id: string, payload: UpdateJobClassPayload): Promise<void> {
    try {
      await apiClient.patch(`/job-class/${id}`, payload);
    } catch (e) {
      throw extractApiError(e);
    }
  },

  async deleteJobClass(id: string): Promise<void> {
    try {
      await apiClient.delete(`/job-class/${id}`);
    } catch (e) {
      throw extractApiError(e);
    }
  }
};