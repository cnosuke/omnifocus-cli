import { describe, expect, it } from 'vitest';
import { parseDateBoundaryToIso, parseDateInput, parseDateToIso } from '../../../src/cli/date.js';

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

  it('parses tomorrow and yesterday at 17:00 local time', () => {
    const tom = parseDateInput('Tomorrow', fixedNow);
    expect(tom.getDate()).toBe(11);
    expect(tom.getHours()).toBe(17);

    const yest = parseDateInput('yesterday', fixedNow);
    expect(yest.getDate()).toBe(9);
    expect(yest.getHours()).toBe(17);
  });

  it('parses next week as +7 days at 17:00 local time', () => {
    const d = parseDateInput('  next week  ', fixedNow);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(2);
    expect(d.getDate()).toBe(17);
    expect(d.getHours()).toBe(17);
  });

  it('parses +Nd, -Nd, +Nw, -Nw, and Nd/Nw ago relative offsets', () => {
    expect(parseDateInput('+3d', fixedNow).getDate()).toBe(13);
    expect(parseDateInput('-3d', fixedNow).getDate()).toBe(7);
    expect(parseDateInput('3d ago', fixedNow).getDate()).toBe(7);
    expect(parseDateInput('+2w', fixedNow).getDate()).toBe(24);
    const minus2w = parseDateInput('-2w', fixedNow);
    expect(minus2w.getMonth()).toBe(1); // Feb
    expect(minus2w.getDate()).toBe(24);
    const twoWeeksAgo = parseDateInput('2w ago', fixedNow);
    expect(twoWeeksAgo.getMonth()).toBe(1);
    expect(twoWeeksAgo.getDate()).toBe(24);
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

  it('supports start and end day boundaries for date-only inputs', () => {
    const start = new Date(parseDateBoundaryToIso('-7d', 'start', fixedNow));
    expect(start.getDate()).toBe(3);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);

    const end = new Date(parseDateBoundaryToIso('2026-03-15', 'end', fixedNow));
    expect(end.getDate()).toBe(15);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
    expect(end.getSeconds()).toBe(59);

    const exact = parseDateBoundaryToIso('2026-04-05T08:15:00.000Z', 'end', fixedNow);
    expect(exact).toBe('2026-04-05T08:15:00.000Z');
  });

  it('rejects empty, invalid, and non-existent calendar dates', () => {
    expect(() => parseDateInput('', fixedNow)).toThrow('Invalid date');
    expect(() => parseDateInput('   ', fixedNow)).toThrow('Invalid date');
    expect(() => parseDateInput('not-a-date', fixedNow)).toThrow("Invalid date 'not-a-date'");
    expect(() => parseDateInput('2026-02-30', fixedNow)).toThrow("Invalid date '2026-02-30'");
  });
});
