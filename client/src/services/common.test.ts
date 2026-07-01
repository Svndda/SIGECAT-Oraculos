import { describe, it, expect } from 'vitest';
import {
  extractApiError,
  parseOracleToTimeInput,
  formatDateForBackend,
} from './common';

describe('extractApiError', () => {
  it('returns the first API error when present', () => {
    const axiosLike = {
      response: { data: { errors: [{ code: 'WEAK_PASSWORD', message: 'débil' }] } },
    };
    expect(extractApiError(axiosLike)).toEqual({ code: 'WEAK_PASSWORD', message: 'débil' });
  });

  it('falls back to a generic error for unknown shapes', () => {
    expect(extractApiError(new Error('boom'))).toEqual({
      code: 'INTERNAL_ERROR',
      message: 'Error del servidor. Intente de nuevo más tarde.',
    });
  });

  it('falls back to a generic error for a network failure (no response)', () => {
    // Axios sets `response` on the error instance but leaves it undefined when
    // the request never reached the server (network down, CORS, timeout).
    const networkError = { response: undefined, message: 'Network Error' };
    expect(extractApiError(networkError)).toEqual({
      code: 'INTERNAL_ERROR',
      message: 'Error del servidor. Intente de nuevo más tarde.',
    });
  });

  it('never surfaces raw backend internals (stack traces, SQL, etc.)', () => {
    // Regression guard: a malformed or unexpected error shape must never leak
    // through as the displayed message.
    const leaky = {
      response: {
        data: {
          errors: [],
          // Some unexpected internal detail the backend should never send,
          // but which must not be picked up even if it did.
          trace: 'ORA-00001: unique constraint violated at UserRepository.php:42',
        },
      },
    };
    const result = extractApiError(leaky);
    expect(result.message).not.toMatch(/ORA-|\.php|stack/i);
    expect(result).toEqual({
      code: 'INTERNAL_ERROR',
      message: 'Error del servidor. Intente de nuevo más tarde.',
    });
  });
});

describe('parseOracleToTimeInput', () => {
  it('returns an empty string for null/undefined', () => {
    expect(parseOracleToTimeInput(null)).toBe('');
    expect(parseOracleToTimeInput(undefined)).toBe('');
  });

  it('converts a PM Oracle timestamp to 24h HH:MM', () => {
    expect(parseOracleToTimeInput('28-MAY-26 02.30.00.000000 PM')).toBe('14:30');
  });

  it('maps 12 AM to midnight', () => {
    expect(parseOracleToTimeInput('28-MAY-26 12.05.00.000000 AM')).toBe('00:05');
  });

  it('keeps a morning AM time as-is', () => {
    expect(parseOracleToTimeInput('28-MAY-26 08.00.00.000000 AM')).toBe('08:00');
  });
});

describe('formatDateForBackend', () => {
  it('formats a Date as "YYYY-MM-DD HH:MM:SS"', () => {
    const d = new Date(2026, 4, 28, 9, 5, 3); // local time
    expect(formatDateForBackend(d)).toBe('2026-05-28 09:05:03');
  });

  it('throws on an invalid date', () => {
    expect(() => formatDateForBackend('not-a-date')).toThrow('Fecha inválida');
  });
});
