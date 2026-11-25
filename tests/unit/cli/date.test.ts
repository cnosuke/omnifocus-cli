import { describe, expect, it } from 'vitest';
import { parseDateInput, parseDateToIso } from '../../../src/cli/date.js';

describe('parseDateInput', () => {
  const fixedNow = new Date(2026, 2, 10, 9, 30, 0, 0); // 2026-03-10 09:30 local

  it('parses today at 17:00 local time', () => {
    const d = parseDateInput('today', fixedNow);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(2);
    expect(d.getDate()).toBe(10);
    expect(d.getHours()).toBe(17);
    expect(d.getMinutes()).toBe(0);
  });

  it('parses tomorrow at 17:00 local time', () => {
    const d = parseDateInput('Tomorrow', fixedNow);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(2);
    expect(d.getDate()).toBe(11);
    expect(d.getHours()).toBe(17);
  });

  it('parses next week as +7 days at 17:00 local time', () => {
    const d = parseDateInput('  next week  ', fixedNow);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(2);
    expect(d.getDate()).toBe(17);
    expect(d.getHours()).toBe(17);
  });

  it('parses +Nd and +Nw relative offsets', () => {
    const plus3d = parseDateInput('+3d', fixedNow);
    expect(plus3d.getDate()).toBe(13);
    expect(plus3d.getHours()).toBe(17);

    const plus2w = parseDateInput('+2w', fixedNow);
    expect(plus2w.getDate()).toBe(24);
    expect(plus2w.getHours()).toBe(17);
  });

  it('parses YYYY-MM-DD as local date at 17:00', () => {
    const d = parseDateInput('2026-04-05', fixedNow);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(3);
    expect(d.getDate()).toBe(5);
    expect(d.getHours()).toBe(17);
  });

  it('parses full ISO 8601 timestamp', () => {
    const iso = parseDateToIso('2026-04-05T08:15:00.000Z', fixedNow);
    expect(iso).toBe('2026-04-05T08:15:00.000Z');
  });

  it('rejects empty, invalid, and non-existent calendar dates', () => {
    expect(() => parseDateInput('', fixedNow)).toThrow('Invalid date');
    expect(() => parseDateInput('   ', fixedNow)).toThrow('Invalid date');
    expect(() => parseDateInput('not-a-date', fixedNow)).toThrow("Invalid date 'not-a-date'");
    expect(() => parseDateInput('2026-02-30', fixedNow)).toThrow("Invalid date '2026-02-30'");
  });
});
