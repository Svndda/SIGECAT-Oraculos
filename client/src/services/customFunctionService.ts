import apiClient from './apiClient';
import {
  extractApiError,
  type ListParams,
  type PageMeta,
  type Paginated,
} from './common';

/**
 * A custom function (CUSTOM_FUNCTIONS): a function an employee defined inside a
 * declaration. Admins consult them read-only; there is no create/update/delete
 * here on purpose (employees create them through the declaration flow).
 */
export interface CustomFunction {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
}

export interface CreateCustomFunctionPayload {
  name: string;
  description?: string;
}

export const customFunctionService = {
  async getCustomFunctions(params: ListParams = {}): Promise<Paginated<CustomFunction>> {
    try {
      const res = await apiClient.get<{ data: CustomFunction[]; meta: PageMeta }>(
        '/custom-functions',
        { params }
      );
      return { data: res.data.data ?? [], meta: res.data.meta };
    } catch (e) {
      throw extractApiError(e);
    }
  },

  async getCustomFunctionById(id: string): Promise<CustomFunction> {
    try {
      const res = await apiClient.get<{ data: CustomFunction }>(`/custom-functions/${id}`);
      return res.data.data;
    } catch (e) {
      throw extractApiError(e);
    }
  },

  /**
   * Creates a custom function owned by the authenticated employee. The backend
   * only stores name + description (CUSTOM_FUNCTIONS has no execution-time
   * column), so any duration captured in the UI is not persisted here.
   */
  async createCustomFunction(payload: CreateCustomFunctionPayload): Promise<CustomFunction> {
    try {
      const res = await apiClient.post<{ data: CustomFunction }>('/custom-functions', payload);
      return res.data.data;
    } catch (e) {
      throw extractApiError(e);
    }
  },
};
