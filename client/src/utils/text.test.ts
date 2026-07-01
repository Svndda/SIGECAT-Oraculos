import { describe, it, expect } from 'vitest';
import { truncateText } from './text';

describe('truncateText', () => {
  it('leaves short text unchanged', () => {
    expect(truncateText('Recursos Humanos')).toBe('Recursos Humanos');
  });

  it('keeps text exactly at the limit unchanged', () => {
    const text = 'a'.repeat(20);
    expect(truncateText(text)).toBe(text);
  });

  it('truncates and appends an ellipsis past the limit', () => {
    const text = 'a'.repeat(21);
    const result = truncateText(text);
    expect(result).toBe(`${'a'.repeat(20)}…`);
    expect(result).toHaveLength(21);
  });

  it('honours a custom max length', () => {
    expect(truncateText('Recursos Humanos', 8)).toBe('Recursos…');
  });
});
