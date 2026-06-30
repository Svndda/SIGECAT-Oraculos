import apiClient from './apiClient';
import {extractApiError, type PageMeta} from './common';

/**
 * Declared rest times (REST_TIMES): the breaks (coffee, breakfast, lunch,
 * dinner) an employee attaches to their declaration, each over a
 * [starts_at, ends_at] range bound to a rest type.
 */

export const REST_TYPES = ['Breakfast', 'Coffee', 'Dinner', 'Lunch'] as const;
export type RestType = (typeof REST_TYPES)[number];

/** Spanish display labels for the REST_TYPE enum values. */
export const REST_TIME_MAX_MINUTES: Record<RestType, number> = {
  Coffee: 30,
  Breakfast: 60,
  Dinner: 60,
  Lunch: 60,
};

export const REST_TYPE_LABELS: Record<RestType, string> = {
  Breakfast: 'Desayuno',
  Coffee: 'Café',
  Dinner: 'Cena',
  Lunch: 'Almuerzo',
};

export interface CreateRestTimePayload {
  declaration_id: string;
  rest_type: RestType;
  /** 'YYYY-MM-DD HH:MM:SS' */
  starts_at: string;
  ends_at: string;
}

export interface UpdateRestTimePayload {
  rest_type?: RestType;
  starts_at?: string;
  ends_at?: string;
}

export interface RestTimeResponse {
  rest_time_id: string;
  user_id: string;
  declaration_id: string;
  rest_type: RestType;
  starts_at: string;
  ends_at: string;
}

export interface GetRestTimesParams {
  /** 1-based page number. Defaults to 1. */
  page?: number;
  /** Page size, capped at 100 by the backend. Defaults to 10. */
  limit?: number;
  /** Free-text filter, matched against rest_type (case-insensitive, partial). */
  filter?: string;
  declaration_id?: string;
}

export interface PaginatedRestTimes {
  data: RestTimeResponse[];
  meta: PageMeta;
}

/**
 * Client-side mirror of the CHK_REST_TIMES_DURATION rule
 *
 * @returns null when the range is valid, or a human-readable error otherwise.
 */
export function validateRestTimeRange(
  restType: RestType,
  startsAt: string,
  endsAt: string
): string | null {
  const start = new Date(startsAt);
  const end = new Date(endsAt);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 'El formato de fecha y hora no es válido';
  }
  if (end <= start) {
    return 'La hora de fin debe ser posterior a la de inicio';
  }

  const minutes = (end.getTime() - start.getTime()) / 60000;
  const maxMinutes = REST_TIME_MAX_MINUTES[restType];
  if (minutes > maxMinutes) {
    return `La duración del descanso '${restType}' no puede exceder los ${maxMinutes} minutos`;
  }

  return null;
}

export const restTimeService = {
  /**
   * GET /rest-time
   * Lists rest time entries. Ownership-aware.
   */
  async getRestTimes(params: GetRestTimesParams = {}): Promise<PaginatedRestTimes> {
    try {
      const res = await apiClient.get<{
        data: RestTimeResponse[];
        meta: PageMeta
      }>(
        '/rest-time',
        {
          params: {
            page: params.page ?? 1,
            limit: params.limit ?? 10,
            filter: params.filter ?? '',
            declaration_id: params.declaration_id,
          },
        }
      );
      return {data: res.data.data ?? [], meta: res.data.meta};
    } catch (e) {
      throw extractApiError(e);
    }
  },

  /**
   * Convenience wrapper: every rest time entry for a single declaration
   * (the caller's own declaration, or any declaration if the caller is
   * admin).
   */
  async getRestTimesByDeclaration(declarationId: string): Promise<RestTimeResponse[]> {
    try {
      const res = await apiClient.get<{
        data: RestTimeResponse[];
        meta: PageMeta
      }>(
        '/rest-time',
        {params: {declaration_id: declarationId, limit: 100}}
      );
      return res.data.data ?? [];
    } catch (e) {
      throw extractApiError(e);
    }
  },

  /**
   * GET /rest-time/{id}
   * Admin only — the backend returns 403 for non-admin callers. Don't use
   * this to fetch one of the current user's own entries.
   */
  async getRestTimeById(id: string): Promise<RestTimeResponse> {
    try {
      const res = await apiClient.get<{
        data: RestTimeResponse
      }>(`/rest-time/${id}`);
      return res.data.data;
    } catch (e) {
      throw extractApiError(e);
    }
  },

  /**
   * POST /rest-time
   * Creates an entry in one of the caller's own declarations. The backend
   * rejects this (409) unless that declaration is still 'Incomplete', and
   * (403) if the declaration doesn't belong to the caller.
   */
  async createRestTime(payload: CreateRestTimePayload): Promise<RestTimeResponse> {
    try {
      const res = await apiClient.post<{
        data: RestTimeResponse
      }>('/rest-time', payload);
      return res.data.data;
    } catch (e) {
      throw extractApiError(e);
    }
  },

  /**
   * PATCH /rest-time/{id}
   * Partial update of one of the caller's own entries (rest_type and/or
   * starts_at/ends_at). At least one field must be provided — the backend
   * rejects an empty payload. Only allowed while the parent declaration is
   * still 'Incomplete'.
   */
  async updateRestTime(id: string, payload: UpdateRestTimePayload): Promise<void> {
    try {
      await apiClient.patch(`/rest-time/${id}`, payload);
    } catch (e) {
      throw extractApiError(e);
    }
  },

  /**
   * DELETE /rest-time/{id}
   * Deletes one of the caller's own entries. Only allowed while the parent
   * declaration is still 'Incomplete'.
   */
  async deleteRestTime(id: string): Promise<void> {
    try {
      await apiClient.delete(`/rest-time/${id}`);
    } catch (e) {
      throw extractApiError(e);
    }
  },
};