import { describe, it, expect } from 'vitest';
import { toCsv } from '../src/utils/csv.js';

describe('toCsv', () => {
  it('writes a header row followed by one row per record, CRLF-terminated', () => {
    const csv = toCsv(['a', 'b'], [['1', '2']]);
    expect(csv).toBe('a,b\r\n1,2\r\n');
  });

  it('quotes and escapes a field containing a comma, quote, or newline', () => {
    const csv = toCsv(['field'], [['has,comma'], ['has"quote'], ['has\nnewline']]);
    const lines = csv.trim().split('\r\n');
    expect(lines[1]).toBe('"has,comma"');
    expect(lines[2]).toBe('"has""quote"');
    expect(lines[3]).toBe('"has\nnewline"');
  });

  it('defangs a field starting with =, +, -, or @ to prevent spreadsheet formula injection', () => {
    const csv = toCsv(['field'], [['=SUM(1+1)'], ['+1234'], ['-1234'], ['@mention']]);
    const lines = csv.trim().split('\r\n').slice(1);
    expect(lines).toEqual(["'=SUM(1+1)", "'+1234", "'-1234", "'@mention"]);
  });

  it('leaves an ordinary field untouched', () => {
    const csv = toCsv(['field'], [['plain_value']]);
    expect(csv).toBe('field\r\nplain_value\r\n');
  });
});
