const DEFAULT_HOUR = 17;

type DateBoundary = 'default' | 'start' | 'end';

function resolveBoundaryDate(
  year: number,
  monthIndex: number,
  day: number,
  boundary: DateBoundary,
): Date {
  if (boundary === 'start') {
    return new Date(year, monthIndex, day, 0, 0, 0, 0);
  }
  if (boundary === 'end') {
    return new Date(year, monthIndex, day, 23, 59, 59, 999);
  }
  return new Date(year, monthIndex, day, DEFAULT_HOUR, 0, 0, 0);
}

function parseDateWithBoundary(
  input: string,
  now: Date = new Date(),
  boundary: DateBoundary = 'default',
): Date {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('Invalid date: value cannot be empty');
  }

  const lower = trimmed.toLowerCase();

  if (lower === 'today') {
    return resolveBoundaryDate(now.getFullYear(), now.getMonth(), now.getDate(), boundary);
  }
  if (lower === 'tomorrow') {
    return resolveBoundaryDate(now.getFullYear(), now.getMonth(), now.getDate() + 1, boundary);
  }
  if (lower === 'yesterday') {
    return resolveBoundaryDate(now.getFullYear(), now.getMonth(), now.getDate() - 1, boundary);
  }
  if (lower === 'next week') {
    return resolveBoundaryDate(now.getFullYear(), now.getMonth(), now.getDate() + 7, boundary);
  }

  const daysMatch = lower.match(/^([+-])(\d+)d$/);
  if (daysMatch) {
    const sign = daysMatch[1] === '-' ? -1 : 1;
    const offset = sign * Number(daysMatch[2]);
    return resolveBoundaryDate(now.getFullYear(), now.getMonth(), now.getDate() + offset, boundary);
  }

  const weeksMatch = lower.match(/^([+-])(\d+)w$/);
  if (weeksMatch) {
    const sign = weeksMatch[1] === '-' ? -1 : 1;
    const offset = sign * Number(weeksMatch[2]) * 7;
    return resolveBoundaryDate(now.getFullYear(), now.getMonth(), now.getDate() + offset, boundary);
  }

  const agoMatch = lower.match(/^(\d+)([dw])\s+ago$/);
  if (agoMatch) {
    const mult = agoMatch[2] === 'w' ? 7 : 1;
    const offset = -Number(agoMatch[1]) * mult;
    return resolveBoundaryDate(now.getFullYear(), now.getMonth(), now.getDate() + offset, boundary);
  }

  const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]);
    const day = Number(dateOnlyMatch[3]);
    const parsed = resolveBoundaryDate(year, month - 1, day, boundary);
    if (
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
    ) {
      throw new Error(`Invalid date '${input}'`);
    }
    return parsed;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date '${input}'`);
  }
  return parsed;
}

export function parseDateInput(input: string, now: Date = new Date()): Date {
  return parseDateWithBoundary(input, now, 'default');
}

export function parseDateToIso(input: string, now: Date = new Date()): string {
  return parseDateInput(input, now).toISOString();
}

export function parseDateBoundaryToIso(
  input: string,
  boundary: 'start' | 'end',
  now: Date = new Date(),
): string {
  return parseDateWithBoundary(input, now, boundary).toISOString();
}
