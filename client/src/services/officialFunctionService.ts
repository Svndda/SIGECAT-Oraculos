import apiClient from './apiClient';
import {
  extractApiError,
  type ListParams,
  type PageMeta,
  type Paginated,
} from './common';

/** An official function (OFFICIAL_FUNCTIONS), bound to a job ("tipo de puesto"). */
export interface OfficialFunction {
  id: string;
  name: string;
  description: string | null;
  job_id: string;
  expected_time: number | null;
  created_at: string;
  is_deleted: number;
  deleted_at: string | null;
}

export interface CreateOfficialFunctionPayload {
  name: string;
  description?: string;
  job_id: string;
  expected_time?: number;
}

export interface UpdateOfficialFunctionPayload {
  name?: string;
  description?: string;
  job_id?: string;
  expected_time?: number;
  /** Acknowledges the "function is used by declarations" warning so the update applies. */
  confirm?: boolean;
}

export interface OfficialFunctionListParams extends ListParams {
  job_id?: string;
}

/** Error code the backend returns when an update touches a function already used in declarations. */
export const OFFICIAL_FUNCTION_IN_USE = 'OFFICIAL_FUNCTION_IN_USE';

export const officialFunctionService = {
  async getOfficialFunctions(params: OfficialFunctionListParams = {}): Promise<Paginated<OfficialFunction>> {
    try {
      const res = await apiClient.get<{ data: OfficialFunction[]; meta: PageMeta }>(
        '/official-functions',
        { params }
      );
      return { data: res.data.data ?? [], meta: res.data.meta };
    } catch (e) {
      throw extractApiError(e);
    }
  },

  async getOfficialFunctionById(id: string): Promise<OfficialFunction> {
    try {
      const res = await apiClient.get<{ data: OfficialFunction }>(`/official-functions/${id}`);
      return res.data.data;
    } catch (e) {
      throw extractApiError(e);
    }
  },

  async createOfficialFunction(payload: CreateOfficialFunctionPayload): Promise<void> {
    try {
      await apiClient.post('/official-functions', payload);
    } catch (e) {
      throw extractApiError(e);
    }
  },

  async updateOfficialFunction(id: string, payload: UpdateOfficialFunctionPayload): Promise<void> {
    try {
      await apiClient.patch(`/official-functions/${id}`, payload);
    } catch (e) {
      throw extractApiError(e);
    }
  },

  async deleteOfficialFunction(id: string): Promise<void> {
    try {
      await apiClient.delete(`/official-functions/${id}`);
    } catch (e) {
      throw extractApiError(e);
    }
  },
};
