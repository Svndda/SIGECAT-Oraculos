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

export function formatDateForBackend(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) {
    throw new Error('Fecha inválida');
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function formatOracleDate(dateStr: string | null | undefined, incluirHora = false): string {
  if (!dateStr) return '—';

  const cleanStr = dateStr.trim().toUpperCase();

  try {
    const parts = cleanStr.split(/\s+/);
    if (parts.length < 2) {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-CR');
    }

    const datePart = parts[0];
    const timePart = parts[1];
    const ampm = parts[2];

    const dateSegments = datePart.split('-');
    if (dateSegments.length !== 3) return '—';

    const day = parseInt(dateSegments[0], 10);
    const monthStr = dateSegments[1];
    let year = parseInt(dateSegments[2], 10);
    if (year < 100) year += 2000;

    const months: Record<string, number> = {
      JAN: 0, ENE: 0, FEB: 1, MAR: 2, APR: 3, ABR: 3, MAY: 4, JUN: 5,
      JUL: 6, AUG: 7, AGO: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11, DIC: 11
    };
    const month = months[monthStr] !== undefined ? months[monthStr] : 0;

    const timeSegments = timePart.split(/[.:]/);
    let hour = parseInt(timeSegments[0] || '0', 10);
    const minute = parseInt(timeSegments[1] || '0', 10);
    const second = parseInt(timeSegments[2] || '0', 10);

    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;

    const dateObj = new Date(year, month, day, hour, minute, second);
    if (isNaN(dateObj.getTime())) return '—';

    if (incluirHora) {
      return dateObj.toLocaleString('es-CR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }

    return dateObj.toLocaleDateString('es-CR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (e) {
    return '—';
  }
}

export function formatOracleTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';

  const cleanStr = dateStr.trim().toUpperCase();

  try {
    const parts = cleanStr.split(/\s+/);
    if (parts.length < 3) {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    const timePart = parts[1]; // "02.00.00.000000"
    const ampm = parts[2];     // "AM" o "PM"

    const timeSegments = timePart.split(/[.:]/);
    let hour = parseInt(timeSegments[0] || '0', 10);
    const minute = parseInt(timeSegments[1] || '0', 10);

    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;

    const dateObj = new Date();
    dateObj.setHours(hour, minute, 0, 0);
    if (isNaN(dateObj.getTime())) return '—';

    return dateObj.toLocaleTimeString('es-CR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (e) {
    return '—';
  }
}