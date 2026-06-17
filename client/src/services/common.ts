/**
 * Shared types and helpers for the admin domain services.
 *
 * Each entity has its own service module (areaService, unitService,
 * sectionService, jobPositionService, userService, …),
 * mirroring the backend's per-entity service layer. This module holds the
 * pieces they all share so none of them grows into a monolith.
 */

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export interface ListParams {
  page?: number;
  limit?: number;
  filter?: string;
  status?: 'active' | 'deleted' | 'all';
}

/** A selectable org entity (area/department/section/unit), normalized to {id, name}. */
export interface OrgOption {
  id: string;
  name: string;
}

export interface ServiceError {
  code: string;
  message: string;
}

/** Normalizes an Axios/unknown error into the API's {code, message} shape. */
export function extractApiError(error: unknown): ServiceError {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as { response?: { data?: { errors?: ServiceError[] } } };
    const errors = axiosError.response?.data?.errors;
    if (errors?.length) return errors[0];
  }
  return { code: 'INTERNAL_ERROR', message: 'Error del servidor. Intente de nuevo más tarde.' };
}
