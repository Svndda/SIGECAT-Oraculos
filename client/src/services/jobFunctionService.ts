import apiClient from './apiClient';
import { extractApiError } from './common';

interface JobFunctionFields {
  user_id: string;
  job_position_id: string;
  declaration_id: string;
  official_function_id: string | null;
  custom_function_id: string | null;
  overtime_minutes: number | null;
  justification: string | null;
  frequency: string;
  duration_minutes: number;
}

/** Shape returned by the /job-functions write endpoints (POST, PATCH). */
export interface JobFunction extends JobFunctionFields {
  id: string;
}

/** Shape embedded in Declaration.job_functions (GET /declarations/{id}). */
export interface DeclarationJobFunction extends JobFunctionFields {
  job_function_id: string;
  function_name?: string;
  function_description?: string;
  function_type?: 'official' | 'custom';
  expected_time?: number | null;
}

export interface CreateJobFunctionPayload {
  declaration_id: string;
  official_function_id?: string;
  custom_function_id?: string;
  frequency: string;
  duration_minutes: number;
  /** Manual overtime duration in minutes; when set, justification is required. */
  overtime_minutes?: number;
  justification?: string;
}

export interface UpdateJobFunctionPayload {
  official_function_id?: string;
  custom_function_id?: string;
  frequency?: string;
  duration_minutes?: number;
  overtime_minutes?: number;
  justification?: string;
}

export const jobFunctionService = {
  async createJobFunction(payload: CreateJobFunctionPayload): Promise<JobFunction> {
    try {
      const res = await apiClient.post<{ data: JobFunction }>('/job-functions', payload);
      return res.data.data;
    } catch (e) {
      throw extractApiError(e);
    }
  },

  async updateJobFunction(id: string, payload: UpdateJobFunctionPayload): Promise<void> {
    try {
      await apiClient.patch(`/job-functions/${id}`, payload);
    } catch (e) {
      throw extractApiError(e);
    }
  },

  async deleteJobFunction(id: string): Promise<void> {
    try {
      await apiClient.delete(`/job-functions/${id}`);
    } catch (e) {
      throw extractApiError(e);
    }
  },
};