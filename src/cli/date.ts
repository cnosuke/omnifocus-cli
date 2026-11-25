const DEFAULT_HOUR = 17;

export function parseDateInput(input: string, now: Date = new Date()): Date {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('Invalid date: value cannot be empty');
  }

  const lower = trimmed.toLowerCase();

  if (lower === 'today') {
    return localDateWithDefaultTime(now, 0);
  }
  if (lower === 'tomorrow') {
    return localDateWithDefaultTime(now, 1);
  }
  if (lower === 'next week') {
    return localDateWithDefaultTime(now, 7);
  }

  const daysMatch = lower.match(/^\+(\d+)d$/);
  if (daysMatch) {
    return localDateWithDefaultTime(now, Number(daysMatch[1]));
  }

  const weeksMatch = lower.match(/^\+(\d+)w$/);
  if (weeksMatch) {
    return localDateWithDefaultTime(now, Number(weeksMatch[1]) * 7);
  }

  const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]);
    const day = Number(dateOnlyMatch[3]);
    const parsed = new Date(year, month - 1, day, DEFAULT_HOUR, 0, 0, 0);
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

export function parseDateToIso(input: string, now: Date = new Date()): string {
  return parseDateInput(input, now).toISOString();
}

function localDateWithDefaultTime(base: Date, offsetDays: number): Date {
  const d = new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate() + offsetDays,
    DEFAULT_HOUR,
    0,
    0,
    0,
  );
  return d;
}
