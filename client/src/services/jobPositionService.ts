import apiClient from './apiClient';
import {
  extractApiError,
  type ListParams,
  type PageMeta,
  type Paginated,
} from './common';

export interface JobClass {
  job_class_id: string;
  job_class_code: string;
  name: string;
  description: string | null;
  created_at?: string;
  created_by?: string;
}

export interface Job {
  job_id: string;
  job_class_id?: string;
  name: string;
  job_code?: string;
  description?: string | null;
  created_at?: string;
  created_by?: string;
}

export interface JobPosition {
  job_position_id: string;
  job_position_number: string;
  description: string | null;
  job_id: string;
  area_id: string | null;
  department_id: string | null;
  section_id: string | null;
  unit_id: string | null;
  user_id: string | null;
  job_shift: string | null;
  created_at: string;
  is_deleted: number;
  deleted_at: string | null;
  job?: Job | null;
  job_class?: JobClass | null;
}

export type JobPositionParentType = 'area' | 'department' | 'section' | 'unit';

export interface CreateJobPositionPayload {
  job_position_number: string;
  description?: string;
  job_id: string;
  user_id: string;
  job_shift: string;
  area_id?: string;
  department_id?: string;
  section_id?: string;
  unit_id?: string;
}

export interface UpdateJobPositionPayload {
  job_position_number?: string;
  description?: string;
  job_id?: string;
  user_id?: string;
  job_shift?: string;
  area_id?: string;
  department_id?: string;
  section_id?: string;
  unit_id?: string;
}

export const jobPositionService = {
  async getJobPositions(
    params: ListParams = {}
  ): Promise<Paginated<JobPosition>> {
    try {
      const res = await apiClient.get<{
        data: JobPosition[]; meta: PageMeta
      }>('/job-positions', { params });

      return { data: res.data.data ?? [], meta: res.data.meta };
    } catch (e) {
      throw extractApiError(e);
    }
  },

  async getMyJobPositions(): Promise<JobPosition[]> {
    try {
      const res = await apiClient.get<{ data: JobPosition[] }>('/users/me/job-positions');
      return res.data.data ?? [];
    } catch (e) {
      throw extractApiError(e);
    }
  },

  async getJobs(): Promise<Job[]> {
    try {
      const res = await apiClient.get<{ data: Job[] }>('/jobs');
      return res.data.data ?? [];
    } catch (e) {
      throw extractApiError(e);
    }
  },

  async createJobPosition(payload: CreateJobPositionPayload): Promise<void> {
    try {
      await apiClient.post('/job-positions', payload);
    } catch (e) {
      throw extractApiError(e);
    }
  },

  async deleteJobPosition(id: string): Promise<void> {
    try {
      await apiClient.delete(`/job-positions/${id}`);
    } catch (e) {
      throw extractApiError(e);
    }
  },

  async editJobPosition(
    id: string, payload: UpdateJobPositionPayload
  ): Promise<void> {
    try {
      await apiClient.patch(`/job-positions/${id}`, payload);
    } catch (e) {
      throw extractApiError(e);
    }
  },
};