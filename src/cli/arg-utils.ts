import { parseArgs, type ParseArgsOptionsConfig } from 'node:util';

export function parsePositiveInteger(flag: string, value: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`${flag} must be a positive integer, got '${value}'`);
  }
  return n;
}

export interface ParsedCommandArgs<T extends ParseArgsOptionsConfig> {
  values: ReturnType<typeof parseArgs<{ options: T; allowPositionals: true }>>['values'];
  positionals: string[];
}

export function parseCommandArgs<T extends ParseArgsOptionsConfig>(
  args: string[],
  options: T,
  helpCommand: string,
): ParsedCommandArgs<T> {
  const mergedOptions = {
    help: { type: 'boolean' as const, short: 'h' },
    ...options,
  };

  try {
    const parsed = parseArgs({
      args,
      options: mergedOptions,
      allowPositionals: true,
      strict: true,
    });
    return {
      values: parsed.values as ParsedCommandArgs<T>['values'],
      positionals: parsed.positionals,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`${message}. Run '${helpCommand}' for usage.`);
  }
}

export function expectPositionalCount(
  positionals: string[],
  max: number,
  helpCommand: string,
): void {
  if (positionals.length > max) {
    throw new Error(`Unexpected argument '${positionals[max]}'. Run '${helpCommand}' for usage.`);
  }
}
