export function requireFlagValue(flag: string, args: string[], index: number): string {
  const value = args[index];
  if (value === undefined) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

export function requireInteger(flag: string, value: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`${flag} must be a positive integer, got '${value}'`);
  }
  return n;
}

export function requirePositionalArg(
  args: string[],
  current: string,
  existing: string,
  helpCommand: string,
): string {
  if (current.startsWith('-')) {
    throw new Error(`Unknown flag '${current}'. Run '${helpCommand}' for usage.`);
  }
  if (existing) {
    throw new Error(`Unexpected argument '${current}'. Run '${helpCommand}' for usage.`);
  }
  return current;
}
