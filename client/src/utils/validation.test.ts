import { describe, it, expect } from 'vitest';
import { validateInstitutionalEmail, validatePassword } from './validation';

describe('validateInstitutionalEmail', () => {
  it('requires a value', () => {
    expect(validateInstitutionalEmail('   ')).toMatch(/requerido/i);
  });

  it('rejects non-institutional domains', () => {
    expect(validateInstitutionalEmail('user@gmail.com')).toMatch(/institucional/i);
  });

  it('accepts a @ucr.ac.cr address', () => {
    expect(validateInstitutionalEmail('juan.perez@ucr.ac.cr')).toBeNull();
  });
});

describe('validatePassword', () => {
  it('requires a value', () => {
    expect(validatePassword('')).toMatch(/requerida/i);
  });

  it.each([
    ['Ab1!', /8 caracteres/i],
    ['abcdef1!', /mayúscula/i],
    ['Abcdefg!', /número/i],
    ['Abcdefg1', /caracter especial/i],
  ])('rejects %s', (password, expected) => {
    expect(validatePassword(password)).toMatch(expected);
  });

  it('accepts a strong password', () => {
    expect(validatePassword('Demo12345!')).toBeNull();
  });
});
