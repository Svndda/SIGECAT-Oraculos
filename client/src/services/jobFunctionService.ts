import apiClient from './apiClient';
import { extractApiError } from './common';

/**
 * Declaration functions (JOB_FUNCTIONS): the functions an employee attaches to
 * their declaration, each over a [starts_at, ends_at] range with a frequency.
 * Exactly one of official_function_id / custom_function_id is set (XOR).
 *
 * Reads of a declaration's functions come enriched (with names) from
 * declarationService.getDeclarationById; this service only writes.
 */
export interface CreateJobFunctionPayload {
  declaration_id: string;
  official_function_id?: string;
  custom_function_id?: string;
  frequency: string;
  /** 'YYYY-MM-DD HH:MM:SS' */
  starts_at: string;
  ends_at: string;
  justification?: string;
}

export interface UpdateJobFunctionPayload {
  official_function_id?: string;
  custom_function_id?: string;
  frequency?: string;
  starts_at?: string;
  ends_at?: string;
  justification?: string;
}

export interface JobFunctionResponse {
  id: string;
  user_id: string;
  job_position_id: string;
  declaration_id: string;
  official_function_id: string | null;
  custom_function_id: string | null;
  overtime: number | null;
  justification: string | null;
  frequency: string;
  starts_at: string;
  ends_at: string;
}

export const jobFunctionService = {
  async createJobFunction(payload: CreateJobFunctionPayload): Promise<JobFunctionResponse> {
    try {
      const res = await apiClient.post<{ data: JobFunctionResponse }>('/job-functions', payload);
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
