import apiClient from './apiClient';
import { extractApiError, type ListParams, type PageMeta, type Paginated } from './common';

export interface JobPosition {
  id: string;
  job_position_number: string;
  description: string | null;
  job_position_type_id: string;
  area_id: string | null;
  department_id: string | null;
  section_id: string | null;
  unit_id: string | null;
  user_id: string | null;
  created_at: string;
  is_deleted: number;
  deleted_at: string | null;
}

export interface JobPositionType {
  job_position_type_id: string;
  name: string;
}

/** The four parent entity kinds a job position can hang from (mutually exclusive). */
export type JobPositionParentType = 'area' | 'department' | 'section' | 'unit';

export interface CreateJobPositionPayload {
  job_position_number: string;
  description?: string;
  job_position_type_id: string;
  area_id?: string;
  department_id?: string;
  section_id?: string;
  unit_id?: string;
}

export interface UpdateJobPositionPayload {
  job_position_number?: string;
  description?: string;
  job_position_type_id?: string;
  area_id?: string;
  department_id?: string;
  section_id?: string;
  unit_id?: string;
}

export const jobPositionService = {
  async getJobPositions(params: ListParams = {}): Promise<Paginated<JobPosition>> {
    try {
      const res = await apiClient.get<{ data: JobPosition[]; meta: PageMeta }>('/job-positions', { params });
      return { data: res.data.data ?? [], meta: res.data.meta };
    } catch (e) {
      throw extractApiError(e);
    }
  },

  async getJobPositionTypes(): Promise<JobPositionType[]> {
    try {
      const res = await apiClient.get<{ data: JobPositionType[] }>('/job-position-types');
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

  /** Admin edit of a plaza's own fields (number, description, type, parent). */
  async editJobPosition(id: string, payload: UpdateJobPositionPayload): Promise<void> {
    try {
      await apiClient.patch(`/job-positions/${id}`, payload);
    } catch (e) {
      throw extractApiError(e);
    }
  },

  /** Links the authenticated user to the job position matching the given number. */
  async updateJobPosition(jobPositionNumber: string): Promise<void> {
    try {
      await apiClient.patch('/users/me/job-position', { job_position_number: jobPositionNumber });
    } catch (e) {
      throw extractApiError(e);
    }
  },
};