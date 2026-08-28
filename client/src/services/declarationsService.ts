import apiClient from './apiClient';
import {
  extractApiError,
  type ListParams,
  type PageMeta,
  type Paginated,
} from './common';
import type { JobPosition } from './jobPositionService';
import type { Job } from './jobService';
import type {UserProfile} from "./userService.ts";
import type { DeclarationJobFunction } from './jobFunctionService';

export type { DeclarationJobFunction };

export type JobFunction = DeclarationJobFunction;

export type DeclarationStatus =
  | 'Incomplete'
  | 'Revision'
  | 'Approved'
  | 'Rejected'
  | 'Abandoned'
  | 'Completed';

export interface DeclarationStatusHistory {
  declaration_status_id: string;
  status_value: DeclarationStatus;
  created_at: string;
  created_by: string;
}

export interface Declaration {
  declaration_id: string;
  user_id: string;
  job_position_id: string;
  shift_starts_at: string;
  shift_ends_at: string;
  justification: string | null;
  current_status: DeclarationStatus;
  created_at: string;
  job_position?: JobPosition;
  job?: Job;
  status_history?: DeclarationStatusHistory[];
  job_functions?: DeclarationJobFunction[];
  user? : UserProfile;
}

export interface CreateDeclarationPayload {
  job_position_id: string;
  shift_starts_at: string;
  shift_ends_at: string;
  justification?: string;
}

export interface UpdateJustificationPayload {
  justification: string;
}

export interface ChangeStatusPayload {
  status: DeclarationStatus;
}

export interface ChangeStatusResponse {
  declaration_id: string;
  new_status: DeclarationStatus;
  previous_status: DeclarationStatus;
}

export const declarationService = {
  async getMyDeclarations(params: ListParams = {}): Promise<Paginated<Declaration>> {
    try {
      const res = await apiClient.get<{ data: Declaration[]; meta: PageMeta }>(
        '/declarations/me',
        { params }
      );
      return {
        data: res.data.data ?? [],
        meta: res.data.meta,
      };
    } catch (e) {
      throw extractApiError(e);
    }
  },

  async getDeclarations(params: ListParams = {}): Promise<Paginated<Declaration>> {
    try {
      const res = await apiClient.get<{ data: Declaration[]; meta: PageMeta }>(
        '/declarations',
        { params }
      );
      return {
        data: res.data.data ?? [],
        meta: res.data.meta,
      };
    } catch (e) {
      throw extractApiError(e);
    }
  },

  async getDeclarationById(id: string, includeHistory: boolean = false): Promise<Declaration> {
    try {
      const res = await apiClient.get<{ data: Declaration }>(
        `/declarations/${id}?include_history=${includeHistory}`
      );
      return res.data.data;
    } catch (e) {
      throw extractApiError(e);
    }
  },

  async createDeclaration(payload: CreateDeclarationPayload): Promise<Declaration> {
    try {
      const res = await apiClient.post<{ data: Declaration }>('/declarations', payload);
      return res.data.data;
    } catch (e) {
      throw extractApiError(e);
    }
  },

  async updateJustification(
    id: string,
    payload: UpdateJustificationPayload
  ): Promise<{ declaration_id: string; justification: string }> {
    try {
      const res = await apiClient.put<{
        data: { declaration_id: string; justification: string };
      }>(`/declarations/${id}/justification`, payload);
      return res.data.data;
    } catch (e) {
      throw extractApiError(e);
    }
  },

  async changeStatus(
    id: string,
    payload: ChangeStatusPayload
  ): Promise<ChangeStatusResponse> {
    try {
      const res = await apiClient.post<{ data: ChangeStatusResponse }>(
        `/declarations/${id}/status`,
        payload
      );
      return res.data.data;
    } catch (e) {
      throw extractApiError(e);
    }
  },

  async checkIncomplete(): Promise<{
    has_incomplete: boolean;
    declaration_id?: string;
  }> {
    try {
      const res = await apiClient.get<{
        data: { has_incomplete: boolean; declaration_id?: string };
      }>('/declarations/status/incomplete');
      return res.data.data;
    } catch (e) {
      throw extractApiError(e);
    }
  },

  async getHistory(id: string): Promise<DeclarationStatusHistory[]> {
    try {
      const res = await apiClient.get<{
        data: DeclarationStatusHistory[];
      }>(`/declarations/${id}/history`);
      return res.data.data ?? [];
    } catch (e) {
      throw extractApiError(e);
    }
  },
};