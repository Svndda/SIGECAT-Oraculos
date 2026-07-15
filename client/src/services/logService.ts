import apiClient from './apiClient';
import { extractApiError, type Paginated } from './common';

/** Severity levels emitted by the API's Logger, ascending in importance. */
export type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

/** A single SYSTEM_LOGS entry as shaped by LogResponseDTO. */
export interface SystemLog {
  id: string;
  level: LogLevel;
  category: string;
  action: string | null;
  message: string;
  context: Record<string, unknown> | null;
  user_id: string | null;
  ip_address: string | null;
  http_method: string | null;
  http_path: string | null;
  status_code: number | null;
  created_at: string;
}

/** Filters accepted by GET /logs. All optional. */
export interface LogFilters {
  level?: LogLevel | '';
  category?: string;
  user_id?: string;
  action?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
  /** Narrow to business events only, excluding technical/server noise. */
  scope?: 'business';
  page?: number;
  limit?: number;
}

/** Distinct facet values for building the filter controls. */
export interface LogFacets {
  levels: LogLevel[];
  categories: string[];
}

export const logService = {
  /** Fetches a paginated, filtered page of the system log (admin only). */
  async list(filters: LogFilters = {}): Promise<Paginated<SystemLog>> {
    try {
      const params: Record<string, string | number> = {};
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params[key] = value as string | number;
        }
      });

      const res = await apiClient.get<Paginated<SystemLog>>('/logs', { params });
      return res.data;
    } catch (e) {
      throw extractApiError(e);
    }
  },

  /** Distinct levels and categories present in the log, for filter dropdowns. */
  async facets(): Promise<LogFacets> {
    try {
      const res = await apiClient.get<{ data: LogFacets }>('/logs/facets');
      return res.data.data;
    } catch (e) {
      throw extractApiError(e);
    }
  },

  /**
   * Fetches the most recent log entries (newest first) up to `max`, paging
   * through the server in `pageSize` chunks. The business "Bitácora" classifies
   * and filters these on the client, so it needs a bounded recent window rather
   * than a single server page — mirroring how the admin dashboard samples data.
   */
  async listRecent(max = 500, pageSize = 100): Promise<SystemLog[]> {
    try {
      const params = { limit: pageSize, scope: 'business' as const };
      const first = await apiClient.get<Paginated<SystemLog>>('/logs', {
        params: { ...params, page: 1 },
      });
      const rows = [...first.data.data];
      const totalPages = first.data.meta.total_pages ?? 1;
      const lastPage = Math.min(totalPages, Math.ceil(max / pageSize));
      for (let page = 2; page <= lastPage; page++) {
        const res = await apiClient.get<Paginated<SystemLog>>('/logs', {
          params: { ...params, page },
        });
        rows.push(...res.data.data);
      }
      return rows.slice(0, max);
    } catch (e) {
      throw extractApiError(e);
    }
  },
};
