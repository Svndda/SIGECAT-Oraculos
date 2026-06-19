import apiClient from './apiClient';
import { extractApiError, type ListParams, type OrgOption, type PageMeta, type Paginated } from './common';

export interface Job {
  job_id: string;
  job_class_id: string;
  name: string;
  job_code: number;
  description: string | null;
  created_at: string;
  created_by: string;
  is_deleted: number;
  deleted_at: string | null;
}

export interface CreateJobPayload {
  job_class_id: string;
  name: string;
  job_code: number;
  description?: string;
}

export interface UpdateJobPayload {
  job_class_id?: string;
  name?: string;
  job_code?: number;
  description?: string;
}

export const jobService = {
  /** Puestos como opciones seleccionables (normalizados a {id, name}). */
  async getJobs(params: ListParams = {}): Promise<OrgOption[]> {
    try {
      const res = await apiClient.get<{ data: Array<{ id?: string; job_id?: string; name: string }> }>('/jobs', { params });
      return (res.data.data ?? []).map((d) => ({ id: d.id ?? d.job_id ?? '', name: d.name }));
    } catch (e) {
      throw extractApiError(e);
    }
  },

  async getJobsPage(params: ListParams = {}): Promise<Paginated<Job>> {
    try {
      const res = await apiClient.get<{ data: Job[]; meta: PageMeta }>('/jobs', { params });
      return { data: res.data.data ?? [], meta: res.data.meta };
    } catch (e) {
      throw extractApiError(e);
    }
  },

  async getJobById(id: string): Promise<Job> {
    try {
      const res = await apiClient.get<{ data: Job }>(`/jobs/${id}`);
      return res.data.data;
    } catch (e) {
      throw extractApiError(e);
    }
  },

  async createJob(payload: CreateJobPayload): Promise<Job> {
    try {
      const res = await apiClient.post<{ data: Job }>('/jobs', payload);
      return res.data.data;
    } catch (e) {
      throw extractApiError(e);
    }
  },

  async updateJob(id: string, payload: UpdateJobPayload): Promise<void> {
    try {
      await apiClient.patch(`/jobs/${id}`, payload);
    } catch (e) {
      throw extractApiError(e);
    }
  },

  async deleteJob(id: string): Promise<void> {
    try {
      await apiClient.delete(`/jobs/${id}`);
    } catch (e) {
      throw extractApiError(e);
    }
  }
};